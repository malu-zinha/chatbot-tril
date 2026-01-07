// =====================================================
// FLUXO: Registrar Progresso/Execução Diária
// =====================================================
// Responsabilidade: Colega (Chatbot)
//
// Este módulo implementa o fluxo conversacional para
// coletar dados de execução diária do engenheiro
// =====================================================

import { validateExecution } from '../../logic/validation/validateInput.ts';
import { calculateDailyProgress } from '../../logic/execucao/calculateProgress.ts';
import axios from 'axios';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface ProgressFlowState {
  step: 'inicio' | 'projeto' | 'previsto' | 'realizado' | 'observacoes' | 'confirmacao' | 'fim';
  projeto_id?: string;
  codigo_projeto?: string;
  percentual_previsto?: number;
  percentual_realizado?: number;
  observacoes?: string;
  data?: string;
}

export interface FlowResponse {
  mensagem: string;
  proximoStep: ProgressFlowState['step'];
  dados?: any;
  finalizado: boolean;
  erro?: string;
}

// =====================================================
// CLASSE: Fluxo de Registro de Progresso
// =====================================================

export class RegisterProgressFlow {
  private estado: ProgressFlowState;
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

    if (mensagemLower === 'voltar' && this.estado.step !== 'inicio') {
      return this.voltarStep();
    }

    // Processar baseado no step atual
    switch (this.estado.step) {
      case 'inicio':
        return this.stepInicio();
      
      case 'projeto':
        return this.stepProjeto(mensagem);
      
      case 'previsto':
        return this.stepPrevisto(mensagem);
      
      case 'realizado':
        return this.stepRealizado(mensagem);
      
      case 'observacoes':
        return this.stepObservacoes(mensagem);
      
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
      mensagem: `📊 *Registro de Execução Diária*

Vamos registrar o progresso do seu projeto hoje (${this.formatarData(this.estado.data!)}).

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
    // Validar código do projeto
    const codigoLimpo = codigo.trim().toUpperCase();
    
    if (codigoLimpo.length < 3) {
      return {
        mensagem: '⚠️ Código do projeto muito curto. Digite novamente:',
        proximoStep: 'projeto',
        finalizado: false,
      };
    }

    this.estado.codigo_projeto = codigoLimpo;
    this.estado.step = 'previsto';

    return {
      mensagem: `✅ Projeto: *${codigoLimpo}*

*Qual era o percentual PREVISTO para hoje?*
Digite um número de 0 a 100 (ex: 10)

_Ou digite "pular" se não tinha previsão_`,
      proximoStep: 'previsto',
      finalizado: false,
    };
  }

  // =====================================================
  // STEP: Percentual Previsto
  // =====================================================

  private stepPrevisto(resposta: string): FlowResponse {
    const respostaLower = resposta.toLowerCase().trim();

    // Permitir pular este step
    if (respostaLower === 'pular' || respostaLower === 'não' || respostaLower === 'nao') {
      this.estado.step = 'realizado';
      return {
        mensagem: `⏭️ Pulando previsão...

*Qual foi o percentual REALIZADO hoje?*
Digite um número de 0 a 100 (ex: 8)`,
        proximoStep: 'realizado',
        finalizado: false,
      };
    }

    // Extrair número da resposta
    const numero = this.extrairNumero(resposta);

    if (numero === null || numero < 0 || numero > 100) {
      return {
        mensagem: '⚠️ Digite um percentual válido entre 0 e 100:',
        proximoStep: 'previsto',
        finalizado: false,
      };
    }

    this.estado.percentual_previsto = numero;
    this.estado.step = 'realizado';

    return {
      mensagem: `✅ Previsto: *${numero}%*

*Qual foi o percentual REALIZADO hoje?*
Digite um número de 0 a 100 (ex: 8)`,
      proximoStep: 'realizado',
      finalizado: false,
    };
  }

  // =====================================================
  // STEP: Percentual Realizado
  // =====================================================

  private stepRealizado(resposta: string): FlowResponse {
    const numero = this.extrairNumero(resposta);

    if (numero === null || numero < 0 || numero > 100) {
      return {
        mensagem: '⚠️ Digite um percentual válido entre 0 e 100:',
        proximoStep: 'realizado',
        finalizado: false,
      };
    }

    this.estado.percentual_realizado = numero;
    this.estado.step = 'observacoes';

    // Calcular comparação com previsto (se houver)
    let comparacao = '';
    if (this.estado.percentual_previsto !== undefined) {
      const analise = calculateDailyProgress(this.estado.percentual_previsto, numero);
      
      if (analise.status === 'no_prazo') {
        comparacao = `\n✅ No prazo! (variação: ${analise.variacao > 0 ? '+' : ''}${analise.variacao}%)`;
      } else if (analise.status === 'adiantado') {
        comparacao = `\n🚀 Adiantado! (+${analise.variacao}%)`;
      } else {
        comparacao = `\n⚠️ Atrasado (${analise.variacao}%)`;
      }
    }

    return {
      mensagem: `✅ Realizado: *${numero}%*${comparacao}

*Alguma observação sobre o dia?*
(Ex: Problemas, atrasos, observações importantes)

_Digite "não" se não tiver observações_`,
      proximoStep: 'observacoes',
      finalizado: false,
    };
  }

  // =====================================================
  // STEP: Observações
  // =====================================================

  private stepObservacoes(resposta: string): FlowResponse {
    const respostaLower = resposta.toLowerCase().trim();

    if (respostaLower === 'não' || respostaLower === 'nao' || respostaLower === 'nenhuma') {
      this.estado.observacoes = undefined;
    } else {
      this.estado.observacoes = resposta.trim();
    }

    this.estado.step = 'confirmacao';

    // Montar resumo
    const resumo = this.montarResumo();

    return {
      mensagem: `📋 *Resumo da Execução:*

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
    const dadosExecucao = {
      codigo_projeto: this.estado.codigo_projeto,
      data: this.estado.data,
      percentual_previsto: this.estado.percentual_previsto,
      percentual_realizado: this.estado.percentual_realizado!,
      observacoes: this.estado.observacoes,
    };

    const validacao = validateExecution(dadosExecucao);
    
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
        mensagem: `✅ *Execução registrada com sucesso!*

${resultado.mensagem || 'Dados salvos no sistema.'}

Percentual acumulado do projeto: *${resultado.percentual_acumulado || 0}%*`,
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
    // Aceitar formatos: "10", "10%", "10.5", "10,5"
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

  private montarResumo(): string {
    let resumo = `📅 Data: ${this.formatarData(this.estado.data!)}\n`;
    resumo += `🏗️ Projeto: ${this.estado.codigo_projeto}\n`;
    
    if (this.estado.percentual_previsto !== undefined) {
      resumo += `🎯 Previsto: ${this.estado.percentual_previsto}%\n`;
    }
    
    resumo += `✅ Realizado: ${this.estado.percentual_realizado}%\n`;
    
    if (this.estado.observacoes) {
      resumo += `📝 Observações: ${this.estado.observacoes}`;
    }

    return resumo;
  }

  private voltarStep(): FlowResponse {
    // Implementação simplificada - voltar um step
    return {
      mensagem: '⬅️ Voltando...',
      proximoStep: this.estado.step,
      finalizado: false,
    };
  }

  private async enviarParaAPI(dados: any): Promise<any> {
    // TODO: Implementar chamada real à API
    // Por enquanto, simular resposta
    
    const url = `${this.api_base_url}/registrarExecucao`;
    
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

  getEstado(): ProgressFlowState {
    return { ...this.estado };
  }
}

// =====================================================
// EXEMPLO DE USO
// =====================================================

/*
import { RegisterProgressFlow } from './registerProgress';

const flow = new RegisterProgressFlow('+5511999999999');

// Iniciar fluxo
let response = await flow.processarMensagem('iniciar');
console.log(response.mensagem);

// Informar projeto
response = await flow.processarMensagem('PRJ-001');
console.log(response.mensagem);

// Informar previsto
response = await flow.processarMensagem('10');
console.log(response.mensagem);

// Informar realizado
response = await flow.processarMensagem('8');
console.log(response.mensagem);

// Observações
response = await flow.processarMensagem('Chuva atrasou o trabalho');
console.log(response.mensagem);

// Confirmar
response = await flow.processarMensagem('sim');
console.log(response.mensagem);
*/

