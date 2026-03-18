// =====================================================
// FLUXO: Registrar Retrabalho
// =====================================================
// Responsabilidade: Colega (Chatbot)
//
// Este módulo implementa o fluxo conversacional para
// coletar dados de retrabalho dos engenheiros
// =====================================================

import { validateRework } from '../../logic/validation/validateInput.js';
import { classifyReworkReason } from '../../logic/retrabalho/calculateRework.js';
import axios from 'axios';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface ReworkFlowState {
  step: 'inicio' | 'projeto' | 'tem_retrabalho' | 'motivo' | 'descricao' | 'impacto' | 'confirmacao' | 'fim';
  projeto_id?: string;
  codigo_projeto?: string;
  tem_retrabalho?: boolean;
  motivo?: string;
  descricao?: string;
  impacto_percentual?: number;
  tempo_perdido_horas?: number;
  data?: string;
}

export interface FlowResponse {
  mensagem: string;
  proximoStep: ReworkFlowState['step'];
  dados?: any;
  finalizado: boolean;
  erro?: string;
}

// =====================================================
// CLASSE: Fluxo de Registro de Retrabalho
// =====================================================

export class RegisterReworkFlow {
  private estado: ReworkFlowState;
  private engenheiro_whatsapp: string;
  private api_base_url: string;

  constructor(engenheiro_whatsapp: string, api_base_url?: string) {
    this.engenheiro_whatsapp = engenheiro_whatsapp;
    this.api_base_url = api_base_url || process.env.SUPABASE_FUNCTIONS_URL || '';
    this.estado = {
      step: 'inicio',
      data: new Date().toISOString().split('T')[0],
    };
  }

  // =====================================================
  // FUNÇÃO: Processar Mensagem do Usuário
  // =====================================================

  async processarMensagem(mensagem: string): Promise<FlowResponse> {
    const mensagemLower = mensagem.toLowerCase().trim();

    // Comandos especiais
    if (mensagemLower === 'cancelar' || mensagemLower === 'sair') {
      return {
        mensagem: '❌ Registro cancelado.',
        proximoStep: 'fim',
        finalizado: true,
      };
    }

    // Processar baseado no step atual
    switch (this.estado.step) {
      case 'inicio':
        return this.stepInicio();
      
      case 'projeto':
        return this.stepProjeto(mensagem);
      
      case 'tem_retrabalho':
        return this.stepTemRetrabalho(mensagem);
      
      case 'motivo':
        return this.stepMotivo(mensagem);
      
      case 'descricao':
        return this.stepDescricao(mensagem);
      
      case 'impacto':
        return this.stepImpacto(mensagem);
      
      case 'confirmacao':
        return await this.stepConfirmacao(mensagem);
      
      default:
        return {
          mensagem: 'Erro no fluxo. Digite "cancelar" para reiniciar.',
          proximoStep: 'fim',
          finalizado: true,
          erro: 'Step desconhecido',
        };
    }
  }

  // =====================================================
  // STEP: Início do Fluxo
  // =====================================================

  private stepInicio(): FlowResponse {
    this.estado.step = 'projeto';
    return {
      mensagem: `🔧 *Registro de Retrabalho*

Vamos registrar se houve algum retrabalho hoje (${this.formatarData(this.estado.data!)}).

*Qual projeto você quer registrar?*
Digite o código do projeto (ex: PRJ-001)

_Digite "cancelar" para sair_`,
      proximoStep: 'projeto',
      finalizado: false,
    };
  }

  // =====================================================
  // STEP: Informar Projeto
  // =====================================================

  private stepProjeto(codigo: string): FlowResponse {
    const codigoLimpo = codigo.trim().toUpperCase();
    
    if (codigoLimpo.length < 3) {
      return {
        mensagem: '⚠️ Código do projeto muito curto. Digite novamente:',
        proximoStep: 'projeto',
        finalizado: false,
      };
    }

    this.estado.codigo_projeto = codigoLimpo;
    this.estado.step = 'tem_retrabalho';

    return {
      mensagem: `✅ Projeto: *${codigoLimpo}*

*Houve retrabalho hoje?*
Digite "sim" ou "não"`,
      proximoStep: 'tem_retrabalho',
      finalizado: false,
    };
  }

  // =====================================================
  // STEP: Tem Retrabalho?
  // =====================================================

  private stepTemRetrabalho(resposta: string): FlowResponse {
    const respostaLower = resposta.toLowerCase().trim();

    if (respostaLower === 'não' || respostaLower === 'nao' || respostaLower === 'n') {
      this.estado.tem_retrabalho = false;
      return {
        mensagem: `✅ Ótimo! Nenhum retrabalho registrado para hoje.

Continue assim! 🎯`,
        proximoStep: 'fim',
        finalizado: true,
      };
    }

    if (respostaLower === 'sim' || respostaLower === 's') {
      this.estado.tem_retrabalho = true;
      this.estado.step = 'motivo';

      return {
        mensagem: `*Qual foi o motivo do retrabalho?*

Escolha uma opção ou descreva:
1️⃣ Erro de Projeto
2️⃣ Mudança de Escopo
3️⃣ Problema de Material
4️⃣ Erro de Execução
5️⃣ Outro (descreva)`,
        proximoStep: 'motivo',
        finalizado: false,
      };
    }

    return {
      mensagem: '⚠️ Responda com "sim" ou "não":',
      proximoStep: 'tem_retrabalho',
      finalizado: false,
    };
  }

  // =====================================================
  // STEP: Motivo do Retrabalho
  // =====================================================

  private stepMotivo(resposta: string): FlowResponse {
    const respostaLower = resposta.toLowerCase().trim();

    // Mapear opções numéricas
    const motivosMap: { [key: string]: string } = {
      '1': 'Erro de Projeto',
      '2': 'Mudança de Escopo',
      '3': 'Problema de Material',
      '4': 'Erro de Execução',
      '5': 'Outro',
    };

    let motivo = motivosMap[resposta.trim()] || resposta;

    // Se escolheu "Outro" e só digitou isso, pedir mais detalhes
    if (motivo === 'Outro' && resposta.trim() === '5') {
      return {
        mensagem: '📝 Por favor, descreva o motivo do retrabalho:',
        proximoStep: 'motivo',
        finalizado: false,
      };
    }

    if (motivo.length < 5) {
      return {
        mensagem: '⚠️ Motivo muito curto. Descreva melhor o motivo:',
        proximoStep: 'motivo',
        finalizado: false,
      };
    }

    this.estado.motivo = motivo;
    this.estado.step = 'descricao';

    return {
      mensagem: `✅ Motivo: *${motivo}*

*Descreva com mais detalhes o que aconteceu:*
(Ex: Dimensionamento incorreto dos cabos, material veio errado, etc)`,
      proximoStep: 'descricao',
      finalizado: false,
    };
  }

  // =====================================================
  // STEP: Descrição Detalhada
  // =====================================================

  private stepDescricao(resposta: string): FlowResponse {
    const descricao = resposta.trim();

    if (descricao.length < 10) {
      return {
        mensagem: '⚠️ Descrição muito curta. Forneça mais detalhes sobre o retrabalho:',
        proximoStep: 'descricao',
        finalizado: false,
      };
    }

    this.estado.descricao = descricao;
    this.estado.step = 'impacto';

    return {
      mensagem: `✅ Descrição registrada.

*Qual foi o impacto aproximado?*
Digite o percentual de execução perdido (0-100)

_Ex: Se perdeu meio dia de um trabalho que levaria 1 dia, digite 5_

_Digite "não sei" se não souber estimar_`,
      proximoStep: 'impacto',
      finalizado: false,
    };
  }

  // =====================================================
  // STEP: Impacto do Retrabalho
  // =====================================================

  private stepImpacto(resposta: string): FlowResponse {
    const respostaLower = resposta.toLowerCase().trim();

    // Permitir pular este step
    if (respostaLower.includes('não') || respostaLower.includes('nao') || respostaLower === 'pular') {
      this.estado.impacto_percentual = undefined;
    } else {
      const numero = this.extrairNumero(resposta);

      if (numero === null || numero < 0 || numero > 100) {
        return {
          mensagem: '⚠️ Digite um percentual válido entre 0 e 100:',
          proximoStep: 'impacto',
          finalizado: false,
        };
      }

      this.estado.impacto_percentual = numero;
    }

    this.estado.step = 'confirmacao';

    // Classificar motivo automaticamente
    const classificacao = classifyReworkReason(this.estado.descricao!, this.estado.motivo);

    // Montar resumo
    const resumo = this.montarResumo(classificacao);

    return {
      mensagem: `📋 *Resumo do Retrabalho:*

${resumo}

*Confirmar registro?*
Digite "sim" para confirmar ou "não" para cancelar`,
      proximoStep: 'confirmacao',
      finalizado: false,
    };
  }

  // =====================================================
  // STEP: Confirmação e Envio
  // =====================================================

  private async stepConfirmacao(resposta: string): Promise<FlowResponse> {
    const respostaLower = resposta.toLowerCase().trim();

    if (respostaLower !== 'sim' && respostaLower !== 's' && respostaLower !== 'confirmar') {
      return {
        mensagem: '❌ Registro cancelado.',
        proximoStep: 'fim',
        finalizado: true,
      };
    }

    // Validar dados antes de enviar
    const dadosRetrabalho = {
      codigo_projeto: this.estado.codigo_projeto,
      data: this.estado.data,
      motivo: this.estado.motivo!,
      descricao: this.estado.descricao!,
      impacto_percentual: this.estado.impacto_percentual,
    };

    const validacao = validateRework(dadosRetrabalho);
    
    if (!validacao.valido) {
      return {
        mensagem: `❌ Erro na validação:\n${validacao.erros.join('\n')}`,
        proximoStep: 'fim',
        finalizado: true,
        erro: 'Validação falhou',
      };
    }

    // Enviar para API
    try {
      const resultado = await this.enviarParaAPI(validacao.dados_normalizados);
      
      return {
        mensagem: `✅ *Retrabalho registrado com sucesso!*

${resultado.mensagem || 'Dados salvos no sistema.'}

Total de retrabalhos neste projeto: *${resultado.total_retrabalhos_projeto || 1}*

_Vamos trabalhar para evitar retrabalhos futuros! 💪_`,
        proximoStep: 'fim',
        finalizado: true,
        dados: resultado,
      };
    } catch (error: any) {
      return {
        mensagem: `❌ Erro ao salvar: ${error.message}

Tente novamente mais tarde.`,
        proximoStep: 'fim',
        finalizado: true,
        erro: error.message,
      };
    }
  }

  // =====================================================
  // UTILITÁRIOS
  // =====================================================

  private extrairNumero(texto: string): number | null {
    const match = texto.match(/(\d+(?:[.,]\d+)?)/);
    if (match) {
      return parseFloat(match[1].replace(',', '.'));
    }
    return null;
  }

  private formatarData(data: string): string {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  private montarResumo(classificacao?: any): string {
    let resumo = `📅 Data: ${this.formatarData(this.estado.data!)}\n`;
    resumo += `🏗️ Projeto: ${this.estado.codigo_projeto}\n`;
    resumo += `🔧 Motivo: ${this.estado.motivo}\n`;
    
    if (classificacao) {
      resumo += `📂 Categoria: ${classificacao.categoria}\n`;
      if (classificacao.severidade) {
        resumo += `⚠️ Severidade: ${classificacao.severidade}\n`;
      }
    }
    
    resumo += `📝 Descrição: ${this.estado.descricao}\n`;
    
    if (this.estado.impacto_percentual !== undefined) {
      resumo += `📊 Impacto: ${this.estado.impacto_percentual}%`;
    }

    return resumo;
  }

  private async enviarParaAPI(dados: any): Promise<any> {
    const url = `${this.api_base_url}/registrarRetrabalho`;
    
    try {
      const response = await axios.post(url, dados, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_ANON_KEY || '',
        },
      });

      return response.data.data || response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Erro ao comunicar com o servidor');
    }
  }

  // =====================================================
  // GETTER: Estado Atual
  // =====================================================

  getEstado(): ReworkFlowState {
    return { ...this.estado };
  }
}

// =====================================================
// EXEMPLO DE USO
// =====================================================

/*
import { RegisterReworkFlow } from './registerRework';

const flow = new RegisterReworkFlow('+5511999999999');

// Iniciar fluxo
let response = await flow.processarMensagem('iniciar');
console.log(response.mensagem);

// Informar projeto
response = await flow.processarMensagem('PRJ-001');
console.log(response.mensagem);

// Tem retrabalho?
response = await flow.processarMensagem('sim');
console.log(response.mensagem);

// Motivo
response = await flow.processarMensagem('1'); // Erro de Projeto
console.log(response.mensagem);

// Descrição
response = await flow.processarMensagem('Erro no dimensionamento dos cabos');
console.log(response.mensagem);

// Impacto
response = await flow.processarMensagem('5');
console.log(response.mensagem);

// Confirmar
response = await flow.processarMensagem('sim');
console.log(response.mensagem);
*/

