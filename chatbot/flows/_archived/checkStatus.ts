// =====================================================
// FLUXO: Consultar Status do Projeto
// =====================================================
// Responsabilidade: Colega (Chatbot)
//
// Este módulo implementa o fluxo conversacional para
// consultar o status e progresso de projetos
// =====================================================

import axios from 'axios';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface StatusFlowState {
  step: 'inicio' | 'projeto' | 'exibindo' | 'fim';
  codigo_projeto?: string;
}

export interface FlowResponse {
  mensagem: string;
  proximoStep: StatusFlowState['step'];
  dados?: any;
  finalizado: boolean;
  erro?: string;
}

// =====================================================
// CLASSE: Fluxo de Consulta de Status
// =====================================================

export class CheckStatusFlow {
  private estado: StatusFlowState;
  private engenheiro_whatsapp: string;
  private api_base_url: string;

  constructor(engenheiro_whatsapp: string, api_base_url?: string) {
    this.engenheiro_whatsapp = engenheiro_whatsapp;
    this.api_base_url = api_base_url || process.env.SUPABASE_FUNCTIONS_URL || '';
    this.estado = {
      step: 'inicio',
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
        mensagem: '❌ Consulta cancelada.',
        proximoStep: 'fim',
        finalizado: true,
      };
    }

    // Processar baseado no step atual
    switch (this.estado.step) {
      case 'inicio':
        return this.stepInicio();
      
      case 'projeto':
        return await this.stepProjeto(mensagem);
      
      case 'exibindo':
        // Permitir consultar outro projeto
        if (mensagemLower === 'outro' || mensagemLower === 'consultar outro') {
          this.estado.step = 'projeto';
          return {
            mensagem: '🔍 Digite o código do projeto que deseja consultar:',
            proximoStep: 'projeto',
            finalizado: false,
          };
        }
        return {
          mensagem: '✅ Consulta finalizada.',
          proximoStep: 'fim',
          finalizado: true,
        };
      
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
      mensagem: `📊 *Consultar Status do Projeto*

*Qual projeto você deseja consultar?*
Digite o código do projeto (ex: PRJ-001)

_Digite "cancelar" para sair_`,
      proximoStep: 'projeto',
      finalizado: false,
    };
  }

  // =====================================================
  // STEP: Buscar Status do Projeto
  // =====================================================

  private async stepProjeto(codigo: string): Promise<FlowResponse> {
    const codigoLimpo = codigo.trim().toUpperCase();
    
    if (codigoLimpo.length < 3) {
      return {
        mensagem: '⚠️ Código do projeto muito curto. Digite novamente:',
        proximoStep: 'projeto',
        finalizado: false,
      };
    }

    this.estado.codigo_projeto = codigoLimpo;

    // Buscar status do projeto na API
    try {
      const status = await this.buscarStatusAPI(codigoLimpo);
      
      const mensagemFormatada = this.formatarStatus(status);
      
      this.estado.step = 'exibindo';

      return {
        mensagem: mensagemFormatada,
        proximoStep: 'exibindo',
        finalizado: false,
        dados: status,
      };
    } catch (error: any) {
      return {
        mensagem: `❌ Erro ao consultar projeto: ${error.message}

Verifique se o código está correto e tente novamente.`,
        proximoStep: 'fim',
        finalizado: true,
        erro: error.message,
      };
    }
  }

  // =====================================================
  // FUNÇÃO: Buscar Status na API
  // =====================================================

  private async buscarStatusAPI(codigo: string): Promise<any> {
    const url = `${this.api_base_url}/statusProjeto?codigo=${encodeURIComponent(codigo)}`;
    
    try {
      const response = await axios.get(url, {
        headers: {
          'apikey': process.env.SUPABASE_ANON_KEY || '',
        },
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro ao buscar status');
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Projeto não encontrado');
      }
      throw new Error(error.response?.data?.error || 'Erro ao comunicar com o servidor');
    }
  }

  // =====================================================
  // FUNÇÃO: Formatar Status para Exibição
  // =====================================================

  private formatarStatus(status: any): string {
    const projeto = status.projeto;
    const progresso = status.progresso;
    const estatisticas = status.estatisticas;
    const execucoesRecentes = status.execucoes_recentes || [];
    const retrabalhos = status.retrabalhos || [];

    let mensagem = `📊 *Status do Projeto*\n\n`;

    // Informações Básicas
    mensagem += `🏗️ *${projeto.nome}*\n`;
    mensagem += `📋 Código: ${projeto.codigo}\n`;
    mensagem += `👤 Cliente: ${projeto.cliente}\n`;
    mensagem += `👷 Engenheiro: ${projeto.engenheiro?.nome || 'N/A'}\n`;
    mensagem += `📍 Área: ${projeto.area || 'N/A'}\n\n`;

    // Progresso
    mensagem += `📈 *Progresso*\n`;
    mensagem += `✅ Concluído: *${progresso.percentual_total}%*\n`;
    mensagem += `📊 Fase: ${estatisticas.fase}\n`;
    mensagem += `📉 Tendência: ${this.formatarTendencia(progresso.tendencia)}\n`;
    mensagem += `🎯 Status: ${projeto.status}\n\n`;

    // Estatísticas
    mensagem += `📊 *Estatísticas*\n`;
    mensagem += `📅 Dias trabalhados: ${estatisticas.total_dias_registrados}\n`;
    mensagem += `⚡ Média diária: ${estatisticas.media_execucao_diaria}%\n`;
    
    if (estatisticas.ultima_atualizacao) {
      mensagem += `🕒 Última atualização: ${this.formatarData(estatisticas.ultima_atualizacao)}\n`;
    }
    
    if (estatisticas.dias_restantes !== null) {
      mensagem += `⏰ Dias restantes: ${estatisticas.dias_restantes}\n`;
    }

    // Retrabalhos
    if (estatisticas.total_retrabalhos > 0) {
      mensagem += `\n🔧 *Retrabalhos*\n`;
      mensagem += `⚠️ Total: ${estatisticas.total_retrabalhos}\n`;
      mensagem += `📉 Impacto: ${estatisticas.impacto_total_retrabalho}%\n`;
      
      if (estatisticas.tempo_total_perdido_horas > 0) {
        mensagem += `⏱️ Tempo perdido: ${estatisticas.tempo_total_perdido_horas}h\n`;
      }
    } else {
      mensagem += `\n✅ Sem retrabalhos registrados\n`;
    }

    // Execuções Recentes (últimas 3)
    if (execucoesRecentes.length > 0) {
      mensagem += `\n📅 *Últimas Execuções*\n`;
      const ultimas3 = execucoesRecentes.slice(0, 3);
      
      ultimas3.forEach((exec: any) => {
        const dataFormatada = this.formatarData(exec.data);
        const status = this.getStatusEmoji(exec.percentual_previsto, exec.percentual_realizado);
        mensagem += `${status} ${dataFormatada}: ${exec.percentual_realizado}%`;
        
        if (exec.percentual_previsto) {
          const diff = exec.percentual_realizado - exec.percentual_previsto;
          mensagem += ` (prev: ${exec.percentual_previsto}%, ${diff > 0 ? '+' : ''}${diff}%)`;
        }
        
        mensagem += `\n`;
      });
    }

    mensagem += `\n_Digite "outro" para consultar outro projeto_`;

    return mensagem;
  }

  // =====================================================
  // UTILITÁRIOS DE FORMATAÇÃO
  // =====================================================

  private formatarTendencia(tendencia: string): string {
    const icons: { [key: string]: string } = {
      'acelerando': '🚀 Acelerando',
      'estavel': '➡️ Estável',
      'desacelerando': '🐌 Desacelerando',
    };
    return icons[tendencia] || tendencia;
  }

  private formatarData(data: string): string {
    try {
      const [ano, mes, dia] = data.split('T')[0].split('-');
      return `${dia}/${mes}/${ano}`;
    } catch {
      return data;
    }
  }

  private getStatusEmoji(previsto?: number, realizado?: number): string {
    if (!previsto) return '📅';
    
    const diff = realizado! - previsto;
    if (Math.abs(diff) <= 2) return '✅'; // No prazo
    if (diff > 0) return '🚀'; // Adiantado
    return '⚠️'; // Atrasado
  }

  // =====================================================
  // GETTER: Estado Atual
  // =====================================================

  getEstado(): StatusFlowState {
    return { ...this.estado };
  }
}

// =====================================================
// EXEMPLO DE USO
// =====================================================

/*
import { CheckStatusFlow } from './checkStatus';

const flow = new CheckStatusFlow('+5511999999999');

// Iniciar fluxo
let response = await flow.processarMensagem('iniciar');
console.log(response.mensagem);

// Informar projeto
response = await flow.processarMensagem('PRJ-001');
console.log(response.mensagem);

// Consultar outro projeto (opcional)
response = await flow.processarMensagem('outro');
response = await flow.processarMensagem('PRJ-002');
console.log(response.mensagem);
*/

