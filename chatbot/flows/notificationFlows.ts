// =====================================================
// FLOWS: Notificações Automáticas (Matinal e Noturna)
// =====================================================
// Fluxos conversacionais para atualizar projetos
// via notificações automáticas diárias
// =====================================================

import type { MorningUpdateData, NightUpdateData } from '../../integrations/sheets/engineerSheetService.ts';
import {
  getEngineerSheetService,
  STATUS_PROJETO,
  MOTIVOS_REVISAO,
  ETAPAS_PROJETO
} from '../../integrations/sheets/engineerSheetService.ts';

// =====================================================
// INTERFACES
// =====================================================

interface FlowResult {
  mensagem: string;
  finalizado: boolean;
  erro?: string;
}

// =====================================================
// CLASSE: NotificacaoMatinalFlow
// =====================================================
// Fluxo simples: Status → Previsão (menu dinâmico)
// =====================================================

export class NotificacaoMatinalFlow {
  private whatsapp: string;
  private projectCode: string;
  private state: {
    step: 'inicio' | 'status' | 'previsao' | 'confirmacao';
    statusAtual?: string;
    previsao?: string;
    data: Partial<MorningUpdateData>;
  };
  private sheetService;

  constructor(whatsapp: string, projectCode: string) {
    this.whatsapp = whatsapp;
    this.projectCode = projectCode;
    this.state = {
      step: 'inicio',
      data: {}
    };
    this.sheetService = getEngineerSheetService();
  }

  async processarMensagem(mensagem: string): Promise<FlowResult> {
    try {
      const msg = mensagem.trim();

      // Comando global
      if (msg.toLowerCase() === 'cancelar') {
        return this.cancelar();
      }

      switch (this.state.step) {
        case 'inicio':
          return await this.stepInicio();

        case 'status':
          return await this.stepStatus(msg);

        case 'previsao':
          return await this.stepPrevisao(msg);

        case 'confirmacao':
          return await this.stepConfirmacao(msg);

        default:
          return {
            mensagem: '❌ Estado inválido do fluxo.',
            finalizado: true,
            erro: 'Estado inválido'
          };
      }
    } catch (error: any) {
      console.error('Erro no fluxo matinal:', error);
      return {
        mensagem: '❌ Erro ao processar. Tente novamente ou digite "cancelar".',
        finalizado: false,
        erro: error.message
      };
    }
  }

  private async stepInicio(): Promise<FlowResult> {
    this.state.step = 'status';

    let mensagem = `🌅 *Notificação Matinal*\n\n`;
    mensagem += `📊 Projeto: *${this.projectCode}*\n\n`;
    mensagem += `📌 *Qual o STATUS atual do projeto?*\n\n`;
    mensagem += this.formatOptions(STATUS_PROJETO);
    mensagem += `\n_Digite o número da opção_\n`;
    mensagem += `_Digite "cancelar" para sair_`;

    return { mensagem, finalizado: false };
  }

  private async stepStatus(msg: string): Promise<FlowResult> {
    const numero = parseInt(msg.trim(), 10);

    if (isNaN(numero) || numero < 1 || numero > STATUS_PROJETO.length) {
      return {
        mensagem: `❌ Número inválido. Digite um número entre 1 e ${STATUS_PROJETO.length}.`,
        finalizado: false
      };
    }

    const status = STATUS_PROJETO[numero - 1];
    this.state.statusAtual = status;
    this.state.data['Status do projeto'] = status;
    this.state.step = 'previsao';

    // Buscar opções de previsão conforme status
    const opcoes = this.sheetService.getPrevisoesPorStatus(status);

    let mensagem = `✅ Status: *${status}*\n\n`;
    mensagem += `📝 *PREVISÃO PARA O DIA*\n\n`;
    mensagem += `O que você planeja realizar hoje?\n\n`;
    mensagem += this.formatOptions(opcoes);
    mensagem += `\n_Digite o número da opção_`;

    return { mensagem, finalizado: false };
  }

  private async stepPrevisao(msg: string): Promise<FlowResult> {
    const numero = parseInt(msg.trim(), 10);

    // Buscar opções de previsão conforme status atual
    const opcoes = this.sheetService.getPrevisoesPorStatus(this.state.statusAtual!);

    if (isNaN(numero) || numero < 1 || numero > opcoes.length) {
      return {
        mensagem: `❌ Número inválido. Digite um número entre 1 e ${opcoes.length}.`,
        finalizado: false
      };
    }

    const previsao = opcoes[numero - 1];
    this.state.previsao = previsao;
    this.state.data['Previsão para o dia'] = previsao;
    this.state.step = 'confirmacao';

    let mensagem = `✅ Previsão registrada\n\n`;
    mensagem += `📋 *CONFIRMAÇÃO*\n\n`;
    mensagem += `🆔 Projeto: *${this.projectCode}*\n`;
    mensagem += `📊 Status: ${this.state.statusAtual}\n`;
    mensagem += `📝 Previsão: ${previsao}\n\n`;
    mensagem += `*Confirma os dados?*\n\n`;
    mensagem += `1️⃣ Sim, salvar\n`;
    mensagem += `2️⃣ Não, cancelar\n\n`;
    mensagem += `_Digite o número da opção_`;

    return { mensagem, finalizado: false };
  }

  private async stepConfirmacao(msg: string): Promise<FlowResult> {
    const opcao = msg.trim();

    if (opcao === '1') {
      // Salvar
      return await this.salvar();
    } else if (opcao === '2') {
      return this.cancelar();
    } else {
      return {
        mensagem: '❌ Opção inválida. Digite *1* para confirmar ou *2* para cancelar.',
        finalizado: false
      };
    }
  }

  private async salvar(): Promise<FlowResult> {
    try {
      console.log('🔍 [DEBUG] Iniciando salvamento...');
      console.log('🔍 [DEBUG] ProjectCode:', this.projectCode);
      console.log('🔍 [DEBUG] Data:', JSON.stringify(this.state.data, null, 2));
      
      const result = await this.sheetService.updateMorningData(
        this.projectCode,
        this.state.data as MorningUpdateData
      );

      console.log('🔍 [DEBUG] Resultado updateMorningData:', JSON.stringify(result, null, 2));

      if (result.success) {
        let mensagem = `✅ *Atualização matinal salva!*\n\n`;
        mensagem += `🆔 Projeto: *${this.projectCode}*\n`;
        mensagem += `📊 Status: ${this.state.statusAtual}\n`;
        mensagem += `📝 Previsão: ${this.state.previsao}\n\n`;
        mensagem += `_Tenha um ótimo dia! 🌟_`;

        console.log('🔍 [DEBUG] Retornando sucesso, finalizado: true');
        return { mensagem, finalizado: true };
      } else {
        console.log('🔍 [DEBUG] Erro ao salvar, finalizado: true (com erro)');
        return {
          mensagem: `❌ Erro ao salvar: ${result.error}`,
          finalizado: true,
          erro: result.error
        };
      }
    } catch (error: any) {
      console.error('🔍 [DEBUG] Exceção capturada no salvar():', error);
      return {
        mensagem: `❌ Erro ao salvar: ${error.message}`,
        finalizado: true,
        erro: error.message
      };
    }
  }

  private cancelar(): FlowResult {
    return {
      mensagem: '❌ *Atualização matinal cancelada*\n\nDigite "menu" para voltar ao início.',
      finalizado: true
    };
  }

  private formatOptions(options: string[]): string {
    return options.map((opt, index) => `${index + 1}️⃣ ${opt}`).join('\n');
  }
}

// =====================================================
// CLASSE: NotificacaoNoturnaFlow
// =====================================================
// Fluxo completo: Feito → Retrabalho → Motivo? → Etapa → Observações (OBRIGATÓRIO)
// =====================================================

export class NotificacaoNoturnaFlow {
  private whatsapp: string;
  private projectCode: string;
  private state: {
    step: 'inicio' | 'feito' | 'retrabalho' | 'motivo' | 'etapa' | 'observacoes' | 'confirmacao';
    statusAtual?: string;
    feito?: string;
    retrabalho?: string;
    motivo?: string;
    etapa?: string;
    observacoes?: string;
    data: Partial<NightUpdateData>;
  };
  private sheetService;

  constructor(whatsapp: string, projectCode: string, statusAtual?: string) {
    this.whatsapp = whatsapp;
    this.projectCode = projectCode;
    this.state = {
      step: 'inicio',
      statusAtual: statusAtual || '',
      data: {}
    };
    this.sheetService = getEngineerSheetService();
  }

  async processarMensagem(mensagem: string): Promise<FlowResult> {
    try {
      const msg = mensagem.trim();

      // Comando global
      if (msg.toLowerCase() === 'cancelar') {
        return this.cancelar();
      }

      switch (this.state.step) {
        case 'inicio':
          return await this.stepInicio();

        case 'feito':
          return await this.stepFeito(msg);

        case 'retrabalho':
          return await this.stepRetrabalho(msg);

        case 'motivo':
          return await this.stepMotivo(msg);

        case 'etapa':
          return await this.stepEtapa(msg);

        case 'observacoes':
          return await this.stepObservacoes(msg);

        case 'confirmacao':
          return await this.stepConfirmacao(msg);

        default:
          return {
            mensagem: '❌ Estado inválido do fluxo.',
            finalizado: true,
            erro: 'Estado inválido'
          };
      }
    } catch (error: any) {
      console.error('Erro no fluxo noturno:', error);
      return {
        mensagem: '❌ Erro ao processar. Tente novamente ou digite "cancelar".',
        finalizado: false,
        erro: error.message
      };
    }
  }

  private async stepInicio(): Promise<FlowResult> {
    // Buscar status atual do projeto para menu dinâmico
    const project = await this.sheetService.getProject(this.projectCode);
    
    // Se o projeto existe e tem status, usar o status do projeto
    // Caso contrário, manter o status passado no construtor
    if (project && project['Status do projeto']) {
      this.state.statusAtual = project['Status do projeto'];
    } else if (!this.state.statusAtual || this.state.statusAtual === '') {
      // Se não encontrou no projeto e não foi passado no construtor, usar padrão
      this.state.statusAtual = 'em execução';
    }

    console.log('🔍 [DEBUG] Status atual:', this.state.statusAtual);
    console.log('🔍 [DEBUG] Project encontrado:', !!project);
    console.log('🔍 [DEBUG] Project status:', project?.['Status do projeto']);

    this.state.step = 'feito';

    let mensagem = `🌙 *Notificação Noturna*\n\n`;
    mensagem += `📊 Projeto: *${this.projectCode}*\n\n`;
    mensagem += `✔️ *O que foi FEITO ao final do dia?*\n\n`;

    // Menu dinâmico conforme status
    const opcoes = this.sheetService.getFeitosPorStatus(this.state.statusAtual);
    console.log('🔍 [DEBUG] Opções encontradas:', opcoes.length, opcoes);
    
    if (opcoes.length === 0) {
      // Se não encontrou opções, mostrar mensagem de erro
      mensagem += `⚠️ *Status não encontrado ou inválido*\n\n`;
      mensagem += `Status atual: ${this.state.statusAtual || 'não definido'}\n\n`;
      mensagem += `Por favor, defina o status do projeto primeiro ou use um dos status válidos:\n`;
      mensagem += `• aguardando início\n`;
      mensagem += `• em execução\n`;
      mensagem += `• em aprovação\n`;
      mensagem += `• parado cliente\n`;
      mensagem += `• parado tecpred\n`;
      mensagem += `• concluído\n\n`;
      mensagem += `_Digite "cancelar" para sair_`;
      
      return { mensagem, finalizado: false };
    }
    
    mensagem += this.formatOptions(opcoes);
    mensagem += `\n_Digite o número da opção_\n`;
    mensagem += `_Digite "cancelar" para sair_`;

    return { mensagem, finalizado: false };
  }

  private async stepFeito(msg: string): Promise<FlowResult> {
    const numero = parseInt(msg.trim(), 10);

    // Buscar opções de feito conforme status atual
    const opcoes = this.sheetService.getFeitosPorStatus(this.state.statusAtual);

    if (isNaN(numero) || numero < 1 || numero > opcoes.length) {
      return {
        mensagem: `❌ Número inválido. Digite um número entre 1 e ${opcoes.length}.`,
        finalizado: false
      };
    }

    const feito = opcoes[numero - 1];
    this.state.feito = feito;
    this.state.data['Feito ao final do dia'] = feito;
    this.state.step = 'retrabalho';

    let mensagem = `✅ Feito registrado\n\n`;
    mensagem += `🔄 *Necessitou de RETRABALHO?*\n\n`;
    mensagem += `1️⃣ Sim\n`;
    mensagem += `2️⃣ Não\n\n`;
    mensagem += `_Digite o número da opção_`;

    return { mensagem, finalizado: false };
  }

  private async stepRetrabalho(msg: string): Promise<FlowResult> {
    const opcao = msg.trim();

    if (opcao === '1') {
      // Sim, teve retrabalho
      this.state.retrabalho = 'sim';
      this.state.data['Necessitou de retrabalho?'] = 'sim';
      this.state.step = 'motivo';

      let mensagem = `⚠️ *Motivo do retrabalho*\n\n`;
      mensagem += `Qual foi o motivo?\n\n`;
      mensagem += this.formatOptions(MOTIVOS_REVISAO);
      mensagem += `\n_Digite o número da opção_`;

      return { mensagem, finalizado: false };
    } else if (opcao === '2') {
      // Não teve retrabalho
      this.state.retrabalho = 'não';
      this.state.data['Necessitou de retrabalho?'] = 'não';
      this.state.step = 'etapa';

      let mensagem = `✅ Sem retrabalho\n\n`;
      mensagem += `📍 *Qual a ETAPA atual do projeto?*\n\n`;
      mensagem += this.formatOptions(ETAPAS_PROJETO);
      mensagem += `\n_Digite o número da opção_`;

      return { mensagem, finalizado: false };
    } else {
      return {
        mensagem: '❌ Opção inválida. Digite *1* para Sim ou *2* para Não.',
        finalizado: false
      };
    }
  }

  private async stepMotivo(msg: string): Promise<FlowResult> {
    const numero = parseInt(msg.trim(), 10);

    if (isNaN(numero) || numero < 1 || numero > MOTIVOS_REVISAO.length) {
      return {
        mensagem: `❌ Número inválido. Digite um número entre 1 e ${MOTIVOS_REVISAO.length}.`,
        finalizado: false
      };
    }

    const motivo = MOTIVOS_REVISAO[numero - 1];
    this.state.motivo = motivo;
    this.state.data['motivo da revisão'] = motivo;

    // Data automática do retrabalho
    const hoje = new Date();
    const dataFormatada = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
    this.state.data['Data do registro do retrabalho'] = dataFormatada;

    this.state.step = 'etapa';

    let mensagem = `✅ Motivo: *${motivo}*\n`;
    mensagem += `📅 Data do retrabalho: *${dataFormatada}*\n\n`;
    mensagem += `📍 *Qual a ETAPA atual do projeto?*\n\n`;
    mensagem += this.formatOptions(ETAPAS_PROJETO);
    mensagem += `\n_Digite o número da opção_`;

    return { mensagem, finalizado: false };
  }

  private async stepEtapa(msg: string): Promise<FlowResult> {
    const numero = parseInt(msg.trim(), 10);

    if (isNaN(numero) || numero < 1 || numero > ETAPAS_PROJETO.length) {
      return {
        mensagem: `❌ Número inválido. Digite um número entre 1 e ${ETAPAS_PROJETO.length}.`,
        finalizado: false
      };
    }

    const etapa = ETAPAS_PROJETO[numero - 1];
    this.state.etapa = etapa;
    this.state.data['Etapa'] = etapa;
    this.state.step = 'observacoes';

    let mensagem = `✅ Etapa: *${etapa}*\n\n`;
    mensagem += `📝 *OBSERVAÇÕES sobre o dia (OBRIGATÓRIO)*\n\n`;
    mensagem += `Digite suas observações sobre o dia de trabalho:\n\n`;
    mensagem += `_Mínimo 5 caracteres_`;

    return { mensagem, finalizado: false };
  }

  private async stepObservacoes(msg: string): Promise<FlowResult> {
    const texto = msg.trim();

    // VALIDAÇÃO OBRIGATÓRIA
    if (texto.length < 5) {
      return {
        mensagem: '❌ *Observações são OBRIGATÓRIAS!*\n\nDigite pelo menos 5 caracteres descrevendo o dia de trabalho.',
        finalizado: false
      };
    }

    this.state.observacoes = texto;
    this.state.data['Observações'] = texto;
    this.state.step = 'confirmacao';

    let mensagem = `✅ Observações registradas\n\n`;
    mensagem += `📋 *CONFIRMAÇÃO*\n\n`;
    mensagem += `🆔 Projeto: *${this.projectCode}*\n`;
    mensagem += `✔️ Feito: ${this.state.feito}\n`;
    mensagem += `🔄 Retrabalho: ${this.state.retrabalho}\n`;
    if (this.state.retrabalho === 'sim') {
      mensagem += `⚠️ Motivo: ${this.state.motivo}\n`;
    }
    mensagem += `📍 Etapa: ${this.state.etapa}\n`;
    mensagem += `📝 Observações: ${texto.substring(0, 50)}${texto.length > 50 ? '...' : ''}\n\n`;
    mensagem += `*Confirma os dados?*\n\n`;
    mensagem += `1️⃣ Sim, salvar\n`;
    mensagem += `2️⃣ Não, cancelar\n\n`;
    mensagem += `_Digite o número da opção_`;

    return { mensagem, finalizado: false };
  }

  private async stepConfirmacao(msg: string): Promise<FlowResult> {
    const opcao = msg.trim();

    if (opcao === '1') {
      // Validar campos obrigatórios antes de salvar
      const validacao = this.validarCamposObrigatorios();
      if (!validacao.valid) {
        return {
          mensagem: `❌ *Campos obrigatórios faltando:*\n\n` +
                    validacao.missing.map(f => `• ${f}`).join('\n') +
                    `\n\n_Complete todos os campos antes de finalizar_`,
          finalizado: false
        };
      }

      // Salvar
      return await this.salvar();
    } else if (opcao === '2') {
      return this.cancelar();
    } else {
      return {
        mensagem: '❌ Opção inválida. Digite *1* para confirmar ou *2* para cancelar.',
        finalizado: false
      };
    }
  }

  private validarCamposObrigatorios(): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    if (!this.state.feito) missing.push('FEITO AO FINAL DO DIA');
    if (!this.state.retrabalho) missing.push('NECESSITOU DE RETRABALHO');
    if (!this.state.etapa) missing.push('ETAPA');
    if (!this.state.observacoes || this.state.observacoes.length < 5) {
      missing.push('OBSERVAÇÕES (mínimo 5 caracteres)');
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }

  private async salvar(): Promise<FlowResult> {
    try {
      const result = await this.sheetService.updateNightData(
        this.projectCode,
        this.state.data as NightUpdateData
      );

      if (result.success) {
        let mensagem = `✅ *Atualização noturna salva!*\n\n`;
        mensagem += `🆔 Projeto: *${this.projectCode}*\n`;
        mensagem += `✔️ Feito: ${this.state.feito}\n`;
        mensagem += `🔄 Retrabalho: ${this.state.retrabalho}\n`;
        mensagem += `📍 Etapa: ${this.state.etapa}\n\n`;
        mensagem += `_Até amanhã! 🌙_`;

        return { mensagem, finalizado: true };
      } else {
        return {
          mensagem: `❌ Erro ao salvar: ${result.error}`,
          finalizado: true,
          erro: result.error
        };
      }
    } catch (error: any) {
      return {
        mensagem: `❌ Erro ao salvar: ${error.message}`,
        finalizado: true,
        erro: error.message
      };
    }
  }

  private cancelar(): FlowResult {
    return {
      mensagem: '❌ *Atualização noturna cancelada*\n\nDigite "menu" para voltar ao início.',
      finalizado: true
    };
  }

  private formatOptions(options: string[]): string {
    return options.map((opt, index) => `${index + 1}️⃣ ${opt}`).join('\n');
  }
}

