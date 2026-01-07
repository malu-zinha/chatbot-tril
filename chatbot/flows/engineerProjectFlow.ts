// =====================================================
// FLOW: Gestão de Projetos de Engenharia
// =====================================================
// Fluxo conversacional para cadastrar novos projetos
// e atualizar projetos existentes diariamente
// =====================================================

import type { ProjectData, DailyExecutionData, MorningUpdateData, NightUpdateData, Project } from '../../integrations/sheets/engineerSheetService.ts';
import {
  getEngineerSheetService,
  TIPOS_PROJETO,
  TIPOS_OBRA,
  AREAS_PROJETO,
  STATUS_PROJETO,
  MOTIVOS_REVISAO,
  ETAPAS_PROJETO
} from '../../integrations/sheets/engineerSheetService.ts';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

type FlowStep =
  | 'inicio'
  | 'escolher_acao'
  | 'escolher_periodo'
  | 'escolher_projeto'
  | 'cliente'                  // NOVO - texto livre
  | 'contato'                  // NOVO - texto livre
  | 'obra'                     // NOVO - menu 4 opções
  | 'area_projeto'             // ATUALIZADO - menu 21 opções
  | 'tipo_projeto'             // ATUALIZADO - menu 24 opções
  | 'data_previsao_interna'    // NOVO - data DD/MM/AAAA
  | 'data_final_cliente'       // NOVO - data DD/MM/AAAA
  | 'status_projeto'
  | 'previsao_dia'
  | 'feito_dia'
  | 'retrabalho_pergunta'
  | 'retrabalho_motivo'
  | 'etapa_projeto'
  | 'observacoes_pergunta'
  | 'observacoes_texto'
  | 'confirmacao'
  | 'salvar'
  | 'fim';

interface FlowState {
  step: FlowStep;
  mode: 'create' | 'update_morning' | 'update_night' | null;
  periodo?: 'manha' | 'noite';
  projectCode?: string;
  projectData: Partial<ProjectData>;
  availableProjects?: Project[];
  engineerName?: string;
}

interface FlowResult {
  mensagem: string;
  finalizado: boolean;
  erro?: string;
}

// =====================================================
// CLASSE: EngineerProjectFlow
// =====================================================

export class EngineerProjectFlow {
  private whatsapp: string;
  private state: FlowState;
  private sheetService;

  constructor(whatsapp: string, engineerName?: string) {
    this.whatsapp = whatsapp;
    this.state = {
      step: 'inicio',
      mode: null,
      projectData: {},
      engineerName: engineerName || 'Engenheiro' // Nome padrão (não usado mais, mantido por compatibilidade)
    };
    this.sheetService = getEngineerSheetService();
  }

  // =====================================================
  // PROCESSAR MENSAGEM
  // =====================================================

  async processarMensagem(mensagem: string): Promise<FlowResult> {
    try {
      const msg = mensagem.trim();

      // Comandos globais
      if (msg.toLowerCase() === 'cancelar') {
        return this.cancelar();
      }

      // Processar baseado no step atual
      switch (this.state.step) {
        case 'inicio':
          return await this.stepInicio();

        case 'escolher_acao':
          return await this.stepEscolherAcao(msg);

        case 'escolher_periodo':
          return await this.stepEscolherPeriodo(msg);

        case 'escolher_projeto':
          return await this.stepEscolherProjeto(msg);

        case 'cliente':
          return await this.stepCliente(msg);

        case 'contato':
          return await this.stepContato(msg);

        case 'obra':
          return await this.stepObra(msg);

        case 'tipo_projeto':
          return await this.stepTipoProjeto(msg);

        case 'area_projeto':
          return await this.stepAreaProjeto(msg);

        case 'data_previsao_interna':
          return await this.stepDataPrevisaoInterna(msg);

        case 'data_final_cliente':
          return await this.stepDataFinalCliente(msg);

        case 'status_projeto':
          return await this.stepStatusProjeto(msg);

        case 'previsao_dia':
          return await this.stepPrevisaoDia(msg);

        case 'feito_dia':
          return await this.stepFeitoDia(msg);

        case 'retrabalho_pergunta':
          return await this.stepRetrabalhoPergunta(msg);

        case 'retrabalho_motivo':
          return await this.stepRetrabalhoMotivo(msg);

        case 'etapa_projeto':
          return await this.stepEtapaProjeto(msg);

        case 'observacoes_pergunta':
          return await this.stepObservacoesPergunta(msg);

        case 'observacoes_texto':
          return await this.stepObservacoesTexto(msg);

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
      console.error('Erro no fluxo:', error);
      return {
        mensagem: '❌ Erro ao processar. Tente novamente ou digite "cancelar".',
        finalizado: false,
        erro: error.message
      };
    }
  }

  // =====================================================
  // STEPS DO FLUXO
  // =====================================================

  private async stepInicio(): Promise<FlowResult> {
    this.state.step = 'escolher_acao';
    
    let mensagem = `👋 *Olá!*\n\n`;
    mensagem += `📊 *Gestão de Projetos de Engenharia*\n\n`;
    mensagem += `O que você quer fazer?\n\n`;
    mensagem += `1️⃣ Cadastrar novo projeto\n`;
    mensagem += `2️⃣ Atualizar projeto existente\n\n`;
    mensagem += `_Digite o número da opção_\n`;
    mensagem += `_Digite "cancelar" para sair_`;

    return { mensagem, finalizado: false };
  }

  private async stepEscolherAcao(msg: string): Promise<FlowResult> {
    const opcao = msg.trim();

    if (opcao === '1') {
      // Cadastrar novo projeto
      this.state.mode = 'create';
      this.state.step = 'cliente';
      
      // Gerar próximo código
      const nextCode = await this.sheetService.generateNextProjectCode();
      this.state.projectCode = nextCode;
      this.state.projectData['Código do Projeto'] = nextCode;

      let mensagem = `✅ *Novo Projeto*\n\n`;
      mensagem += `📝 Código: *${nextCode}*\n\n`;
      mensagem += `Vamos preencher os dados do projeto.\n\n`;
      mensagem += `👤 *Digite o nome do CLIENTE*\n\n`;
      mensagem += `_Digite o nome completo do cliente_`;

      return { mensagem, finalizado: false };
    } else if (opcao === '2') {
      // Atualizar projeto existente - primeiro escolher período
      this.state.step = 'escolher_periodo';

      let mensagem = `📅 *Qual período você quer atualizar?*\n\n`;
      mensagem += `🌅 *1️⃣ Notificações da Manhã*\n`;
      mensagem += `   Status do projeto e previsão para o dia\n\n`;
      mensagem += `🌙 *2️⃣ Notificações da Noite*\n`;
      mensagem += `   Feito hoje, retrabalho, etapa e observações\n\n`;
      mensagem += `_Digite o número da opção_`;

      return { mensagem, finalizado: false };
    } else {
      return {
        mensagem: '❌ Opção inválida. Digite *1* para cadastrar ou *2* para atualizar.',
        finalizado: false
      };
    }
  }

  private async stepEscolherPeriodo(msg: string): Promise<FlowResult> {
    const opcao = msg.trim();

    if (opcao === '1') {
      // Atualização da manhã
      this.state.mode = 'update_morning';
      this.state.periodo = 'manha';
      this.state.step = 'escolher_projeto';

      // Buscar TODOS os projetos da planilha
      const projects = await this.sheetService.listAllProjects();
      this.state.availableProjects = projects;

      if (projects.length === 0) {
        return {
          mensagem: '❌ Nenhum projeto encontrado na planilha.\n\nCadastre um novo projeto primeiro.',
          finalizado: true
        };
      }

      let mensagem = `🌅 *Atualização Matinal*\n\n`;
      mensagem += `📋 Escolha o projeto:\n\n`;
      
      projects.forEach((proj, index) => {
        mensagem += `${index + 1}️⃣ *${proj.codigo}* - ${proj.cliente}\n`;
        mensagem += `   ${proj.obra || 'Sem descrição'}\n`;
        mensagem += `   Status: ${proj.status || 'N/A'}\n\n`;
      });

      mensagem += `_Digite o número do projeto_`;
      return { mensagem, finalizado: false };

    } else if (opcao === '2') {
      // Atualização da noite
      this.state.mode = 'update_night';
      this.state.periodo = 'noite';
      this.state.step = 'escolher_projeto';

      // Buscar TODOS os projetos da planilha
      const projects = await this.sheetService.listAllProjects();
      this.state.availableProjects = projects;

      if (projects.length === 0) {
        return {
          mensagem: '❌ Nenhum projeto encontrado na planilha.\n\nCadastre um novo projeto primeiro.',
          finalizado: true
        };
      }

      let mensagem = `🌙 *Atualização Noturna*\n\n`;
      mensagem += `📋 Escolha o projeto:\n\n`;
      
      projects.forEach((proj, index) => {
        mensagem += `${index + 1}️⃣ *${proj.codigo}* - ${proj.cliente}\n`;
        mensagem += `   ${proj.obra || 'Sem descrição'}\n`;
        mensagem += `   Status: ${proj.status || 'N/A'}\n\n`;
      });

      mensagem += `_Digite o número do projeto_`;
      return { mensagem, finalizado: false };
    }

    return {
      mensagem: '❌ Opção inválida. Digite *1* para manhã ou *2* para noite.',
      finalizado: false
    };
  }

  private async stepEscolherProjeto(msg: string): Promise<FlowResult> {
    const numero = parseInt(msg.trim(), 10);

    if (isNaN(numero) || numero < 1 || numero > (this.state.availableProjects?.length || 0)) {
      return {
        mensagem: `❌ Número inválido. Digite um número entre 1 e ${this.state.availableProjects?.length || 0}.`,
        finalizado: false
      };
    }

    const selectedProject = this.state.availableProjects![numero - 1];
    this.state.projectCode = selectedProject.codigo;

    // Buscar dados completos do projeto
    const projectData = await this.sheetService.getProject(selectedProject.codigo);
    if (projectData) {
      this.state.projectData = projectData;
    }

    let mensagem = `✅ Projeto *${selectedProject.codigo}* selecionado\n\n`;
    mensagem += `📊 Cliente: ${selectedProject.cliente}\n`;
    mensagem += `🏗️ Obra: ${selectedProject.obra}\n\n`;

    // Decidir próximo step baseado no modo
    if (this.state.mode === 'update_morning') {
      // Fluxo da manhã: status + previsão
      this.state.step = 'status_projeto';
      mensagem += `Vamos registrar a atualização matinal.\n\n`;
      mensagem += `📌 *Qual o STATUS atual do projeto?*\n\n`;
      mensagem += this.formatOptions(STATUS_PROJETO);
      mensagem += `\n_Digite o número da opção_`;
    } else if (this.state.mode === 'update_night') {
      // Fluxo da noite: feito + retrabalho + etapa + obs
      this.state.step = 'feito_dia';
      mensagem += `Vamos registrar a atualização noturna.\n\n`;
      mensagem += `✔️ *O que foi FEITO ao final do dia?*\n\n`;
      
      // Menu dinâmico conforme status
      const opcoes = this.sheetService.getFeitosPorStatus(projectData?.['Status do projeto'] || '');
      mensagem += this.formatOptions(opcoes);
      mensagem += `\n_Digite o número da opção_`;
    }

    return { mensagem, finalizado: false };
  }

  private async stepCliente(msg: string): Promise<FlowResult> {
    const cliente = msg.trim();

    if (cliente.length < 3) {
      return {
        mensagem: '❌ Nome do cliente muito curto. Digite pelo menos 3 caracteres.',
        finalizado: false
      };
    }

    this.state.projectData['Cliente'] = cliente;
    this.state.step = 'contato';

    let mensagem = `✅ Cliente: *${cliente}*\n\n`;
    mensagem += `📞 *Digite o CONTATO do cliente*\n\n`;
    mensagem += `_Digite o telefone ou e-mail do cliente_`;

    return { mensagem, finalizado: false };
  }

  private async stepContato(msg: string): Promise<FlowResult> {
    const contato = msg.trim();

    if (contato.length < 5) {
      return {
        mensagem: '❌ Contato muito curto. Digite pelo menos 5 caracteres.',
        finalizado: false
      };
    }

    this.state.projectData['Contato'] = contato;
    this.state.step = 'obra';

    let mensagem = `✅ Contato: *${contato}*\n\n`;
    mensagem += `🏗️ *Qual o tipo de OBRA?*\n\n`;
    mensagem += this.formatOptions(TIPOS_OBRA);
    mensagem += `\n_Digite o número da opção_`;

    return { mensagem, finalizado: false };
  }

  private async stepObra(msg: string): Promise<FlowResult> {
    const numero = parseInt(msg.trim(), 10);

    if (isNaN(numero) || numero < 1 || numero > TIPOS_OBRA.length) {
      return {
        mensagem: `❌ Número inválido. Digite um número entre 1 e ${TIPOS_OBRA.length}.`,
        finalizado: false
      };
    }

    const obra = TIPOS_OBRA[numero - 1];
    this.state.projectData['Obra'] = obra;
    this.state.step = 'area_projeto';

    let mensagem = `✅ Obra: *${obra}*\n\n`;
    mensagem += `🏢 *Qual a ÁREA do projeto?*\n\n`;
    mensagem += this.formatOptions(AREAS_PROJETO);
    mensagem += `\n_Digite o número da opção_`;

    return { mensagem, finalizado: false };
  }

  private async stepTipoProjeto(msg: string): Promise<FlowResult> {
    const numero = parseInt(msg.trim(), 10);

    if (isNaN(numero) || numero < 1 || numero > TIPOS_PROJETO.length) {
      return {
        mensagem: `❌ Número inválido. Digite um número entre 1 e ${TIPOS_PROJETO.length}.`,
        finalizado: false
      };
    }

    const tipo = TIPOS_PROJETO[numero - 1];
    this.state.projectData['Tipo de Projeto'] = tipo;
    
    // Gerar descrição automática conforme tipo
    const descricao = this.sheetService.getDescricaoPorTipo(tipo);
    this.state.projectData['Descrição do projeto'] = descricao;
    
    this.state.step = 'data_previsao_interna';

    let mensagem = `✅ Tipo *${tipo}* selecionado\n\n`;
    mensagem += `📝 Descrição: ${descricao}\n\n`;
    mensagem += `📅 *Digite a DATA DE PREVISÃO DE ENTREGA (INTERNA)*\n\n`;
    mensagem += `Formato: DD/MM/AAAA\n`;
    mensagem += `Exemplo: 15/12/2024\n\n`;
    mensagem += `_Digite a data_`;

    return { mensagem, finalizado: false };
  }

  private async stepAreaProjeto(msg: string): Promise<FlowResult> {
    const numero = parseInt(msg.trim(), 10);

    if (isNaN(numero) || numero < 1 || numero > AREAS_PROJETO.length) {
      return {
        mensagem: `❌ Número inválido. Digite um número entre 1 e ${AREAS_PROJETO.length}.`,
        finalizado: false
      };
    }

    const area = AREAS_PROJETO[numero - 1];
    this.state.projectData['Área'] = area;
    this.state.step = 'tipo_projeto';

    let mensagem = `✅ Área *${area}* selecionada\n\n`;
    mensagem += `🏗️ *Qual o TIPO de projeto?*\n\n`;
    mensagem += this.formatOptions(TIPOS_PROJETO);
    mensagem += `\n_Digite o número da opção_`;

    return { mensagem, finalizado: false };
  }

  private async stepDataPrevisaoInterna(msg: string): Promise<FlowResult> {
    const dateStr = msg.trim();

    if (!this.sheetService.validateDateFormat(dateStr)) {
      return {
        mensagem: '❌ Formato inválido. Use DD/MM/AAAA (exemplo: 15/12/2024).',
        finalizado: false
      };
    }

    const date = this.sheetService.parseDate(dateStr);
    if (!date) {
      return {
        mensagem: '❌ Data inválida. Verifique o dia, mês e ano.',
        finalizado: false
      };
    }

    this.state.projectData['Data de Previsão de entrega (interna)'] = dateStr;
    this.state.step = 'data_final_cliente';

    let mensagem = `✅ Data de previsão interna: *${dateStr}*\n\n`;
    mensagem += `📅 *Digite a DATA FINAL (ACORDADA COM O CLIENTE)*\n\n`;
    mensagem += `Formato: DD/MM/AAAA\n`;
    mensagem += `Exemplo: 20/12/2024\n\n`;
    mensagem += `_Digite a data_`;

    return { mensagem, finalizado: false };
  }

  private async stepDataFinalCliente(msg: string): Promise<FlowResult> {
    const dateStr = msg.trim();

    if (!this.sheetService.validateDateFormat(dateStr)) {
      return {
        mensagem: '❌ Formato inválido. Use DD/MM/AAAA (exemplo: 20/12/2024).',
        finalizado: false
      };
    }

    const date = this.sheetService.parseDate(dateStr);
    if (!date) {
      return {
        mensagem: '❌ Data inválida. Verifique o dia, mês e ano.',
        finalizado: false
      };
    }

    this.state.projectData['Data Final (acordado com o cliente)'] = dateStr;
    
    // Campos automáticos serão preenchidos no método salvar()
    // Data de início = hoje
    // Prazos serão calculados
    
    this.state.step = 'confirmacao';

    let mensagem = `✅ Data final cliente: *${dateStr}*\n\n`;
    mensagem += `📋 *CONFIRMAÇÃO DO CADASTRO*\n\n`;
    mensagem += this.generateSummary();
    mensagem += `\n\n*Confirma os dados?*\n\n`;
    mensagem += `1️⃣ Sim, salvar\n`;
    mensagem += `2️⃣ Não, cancelar\n\n`;
    mensagem += `_Digite o número da opção_`;

    return { mensagem, finalizado: false };
  }

  private async stepStatusProjeto(msg: string): Promise<FlowResult> {
    const numero = parseInt(msg.trim(), 10);

    if (isNaN(numero) || numero < 1 || numero > STATUS_PROJETO.length) {
      return {
        mensagem: `❌ Número inválido. Digite um número entre 1 e ${STATUS_PROJETO.length}.`,
        finalizado: false
      };
    }

    const status = STATUS_PROJETO[numero - 1];
    this.state.projectData['Status do projeto'] = status;
    this.state.step = 'previsao_dia';

    // Buscar opções de previsão conforme status (menu dinâmico)
    const opcoes = this.sheetService.getPrevisoesPorStatus(status);

    let mensagem = `✅ Status: *${status}*\n\n`;
    mensagem += `📝 *PREVISÃO PARA O DIA*\n\n`;
    mensagem += `O que você planeja realizar hoje?\n\n`;
    mensagem += this.formatOptions(opcoes);
    mensagem += `\n_Digite o número da opção_`;

    return { mensagem, finalizado: false };
  }

  private async stepPrevisaoDia(msg: string): Promise<FlowResult> {
    const numero = parseInt(msg.trim(), 10);

    // Buscar opções de previsão conforme status atual
    const statusProjeto = this.state.projectData['Status do projeto'] || '';
    const opcoesPrevisao = this.sheetService.getPrevisoesPorStatus(statusProjeto);

    if (isNaN(numero) || numero < 1 || numero > opcoesPrevisao.length) {
      return {
        mensagem: `❌ Número inválido. Digite um número entre 1 e ${opcoesPrevisao.length}.`,
        finalizado: false
      };
    }

    const previsao = opcoesPrevisao[numero - 1];
    this.state.projectData['Previsão para o dia'] = previsao;

    // Se for modo manhã, ir direto para confirmação
    if (this.state.mode === 'update_morning') {
      this.state.step = 'confirmacao';

      let mensagem = `✅ Previsão registrada\n\n`;
      mensagem += `📋 *CONFIRMAÇÃO - Atualização Matinal*\n\n`;
      mensagem += this.generateSummary();
      mensagem += `\n\n*Confirma os dados?*\n\n`;
      mensagem += `1️⃣ Sim, salvar\n`;
      mensagem += `2️⃣ Não, cancelar\n\n`;
      mensagem += `_Digite o número da opção_`;

      return { mensagem, finalizado: false };
    }

    // Senão, continuar para o próximo step (fluxo completo de cadastro - não usado mais)
    // No novo fluxo, cadastro vai direto para confirmação após data final cliente
    this.state.step = 'feito_dia';

    let mensagem = `✅ Previsão registrada\n\n`;
    mensagem += `✔️ *O que foi FEITO ao final do dia?*\n\n`;
    
    // Menu dinâmico conforme status
    const statusAtual = this.state.projectData['Status do projeto'] || '';
    const opcoesFeito = this.sheetService.getFeitosPorStatus(statusAtual);
    mensagem += this.formatOptions(opcoesFeito);
    mensagem += `\n_Digite o número da opção_`;

    return { mensagem, finalizado: false };
  }

  private async stepFeitoDia(msg: string): Promise<FlowResult> {
    const numero = parseInt(msg.trim(), 10);

    // Buscar opções de feito conforme status atual
    const statusDoProj = this.state.projectData['Status do projeto'] || '';
    const opcoesFeitoMenu = this.sheetService.getFeitosPorStatus(statusDoProj);

    if (isNaN(numero) || numero < 1 || numero > opcoesFeitoMenu.length) {
      return {
        mensagem: `❌ Número inválido. Digite um número entre 1 e ${opcoesFeitoMenu.length}.`,
        finalizado: false
      };
    }

    const feito = opcoesFeitoMenu[numero - 1];
    this.state.projectData['Feito ao final do dia'] = feito;
    this.state.step = 'retrabalho_pergunta';

    let mensagem = `✅ Feito registrado\n\n`;
    mensagem += `🔄 *Necessitou de RETRABALHO?*\n\n`;
    mensagem += `1️⃣ Sim\n`;
    mensagem += `2️⃣ Não\n\n`;
    mensagem += `_Digite o número da opção_`;

    return { mensagem, finalizado: false };
  }

  private async stepRetrabalhoPergunta(msg: string): Promise<FlowResult> {
    const opcao = msg.trim();

    if (opcao === '1') {
      // Sim, teve retrabalho
      this.state.projectData['Necessitou de retrabalho?'] = 'sim';
      this.state.step = 'retrabalho_motivo';

      let mensagem = `⚠️ *Motivo do retrabalho*\n\n`;
      mensagem += `Qual foi o motivo?\n\n`;
      mensagem += this.formatOptions(MOTIVOS_REVISAO);
      mensagem += `\n_Digite o número da opção_`;

      return { mensagem, finalizado: false };
    } else if (opcao === '2') {
      // Não teve retrabalho
      this.state.projectData['Necessitou de retrabalho?'] = 'não';
      this.state.step = 'etapa_projeto';

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

  private async stepRetrabalhoMotivo(msg: string): Promise<FlowResult> {
    const numero = parseInt(msg.trim(), 10);

    if (isNaN(numero) || numero < 1 || numero > MOTIVOS_REVISAO.length) {
      return {
        mensagem: `❌ Número inválido. Digite um número entre 1 e ${MOTIVOS_REVISAO.length}.`,
        finalizado: false
      };
    }

    const motivo = MOTIVOS_REVISAO[numero - 1];
    this.state.projectData['motivo da revisão'] = motivo;
    
    // Data automática do retrabalho
    const hoje = new Date();
    const dataFormatada = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
    this.state.projectData['Data do registro do retrabalho'] = dataFormatada;
    
    this.state.step = 'etapa_projeto';

    let mensagem = `✅ Motivo: *${motivo}*\n`;
    mensagem += `📅 Data do retrabalho: *${dataFormatada}*\n\n`;
    mensagem += `📍 *Qual a ETAPA atual do projeto?*\n\n`;
    mensagem += this.formatOptions(ETAPAS_PROJETO);
    mensagem += `\n_Digite o número da opção_`;

    return { mensagem, finalizado: false };
  }

  private async stepEtapaProjeto(msg: string): Promise<FlowResult> {
    const numero = parseInt(msg.trim(), 10);

    if (isNaN(numero) || numero < 1 || numero > ETAPAS_PROJETO.length) {
      return {
        mensagem: `❌ Número inválido. Digite um número entre 1 e ${ETAPAS_PROJETO.length}.`,
        finalizado: false
      };
    }

    const etapa = ETAPAS_PROJETO[numero - 1];
    this.state.projectData['Etapa'] = etapa;

    // Se for modo noite, observações são OBRIGATÓRIAS
    if (this.state.mode === 'update_night') {
      this.state.step = 'observacoes_texto';

      let mensagem = `✅ Etapa: *${etapa}*\n\n`;
      mensagem += `📝 *OBSERVAÇÕES sobre o dia (OBRIGATÓRIO)*\n\n`;
      mensagem += `Digite suas observações sobre o dia de trabalho:\n\n`;
      mensagem += `_Mínimo 5 caracteres_`;

      return { mensagem, finalizado: false };
    }

    // Senão, ir direto para confirmação
    this.state.step = 'confirmacao';

    // Gerar resumo
    let mensagem = `📋 *CONFIRMAÇÃO*\n\n`;
    mensagem += this.generateSummary();
    mensagem += `\n\n*Confirma os dados?*\n\n`;
    mensagem += `1️⃣ Sim, salvar\n`;
    mensagem += `2️⃣ Não, cancelar\n\n`;
    mensagem += `_Digite o número da opção_`;

    return { mensagem, finalizado: false };
  }

  private async stepObservacoesPergunta(msg: string): Promise<FlowResult> {
    const opcao = msg.trim();

    if (opcao === '1') {
      // Quer adicionar observações
      this.state.step = 'observacoes_texto';

      let mensagem = `📝 *Observações sobre o dia*\n\n`;
      mensagem += `Digite suas observações:\n\n`;
      mensagem += `_Mínimo 5 caracteres_`;

      return { mensagem, finalizado: false };
    } else if (opcao === '2') {
      // Pular observações
      this.state.step = 'confirmacao';

      let mensagem = `📋 *CONFIRMAÇÃO*\n\n`;
      mensagem += this.generateSummary();
      mensagem += `\n\n*Confirma os dados?*\n\n`;
      mensagem += `1️⃣ Sim, salvar\n`;
      mensagem += `2️⃣ Não, cancelar\n\n`;
      mensagem += `_Digite o número da opção_`;

      return { mensagem, finalizado: false };
    }

    return {
      mensagem: '❌ Opção inválida. Digite *1* para adicionar ou *2* para pular.',
      finalizado: false
    };
  }

  private async stepObservacoesTexto(msg: string): Promise<FlowResult> {
    const texto = msg.trim();

    // VALIDAÇÃO OBRIGATÓRIA RÍGIDA
    if (texto.length < 5) {
      let mensagem = '❌ *Observações são OBRIGATÓRIAS!*\n\n';
      mensagem += 'Digite pelo menos 5 caracteres descrevendo o dia de trabalho.\n\n';
      mensagem += '_Este campo não pode ser pulado na atualização noturna._';
      
      return {
        mensagem,
        finalizado: false
      };
    }

    this.state.projectData['Observações'] = texto;
    this.state.step = 'confirmacao';

    let mensagem = `✅ Observações salvas!\n\n`;
    mensagem += `📋 *CONFIRMAÇÃO*\n\n`;
    mensagem += this.generateSummary();
    mensagem += `\n\n*Confirma os dados?*\n\n`;
    mensagem += `1️⃣ Sim, salvar\n`;
    mensagem += `2️⃣ Não, cancelar\n\n`;
    mensagem += `_Digite o número da opção_`;

    return { mensagem, finalizado: false };
  }

  private async stepConfirmacao(msg: string): Promise<FlowResult> {
    const opcao = msg.trim();

    if (opcao === '1') {
      // Confirmar e salvar
      return await this.salvar();
    } else if (opcao === '2') {
      // Cancelar
      return this.cancelar();
    } else {
      return {
        mensagem: '❌ Opção inválida. Digite *1* para confirmar ou *2* para cancelar.',
        finalizado: false
      };
    }
  }

  // =====================================================
  // SALVAR NA PLANILHA
  // =====================================================

  private async salvar(): Promise<FlowResult> {
    try {
      if (this.state.mode === 'create') {
        // CAMPOS AUTOMÁTICOS
        const dataInicio = new Date();
        const dataPrevisaoInterna = this.sheetService.parseDate(this.state.projectData['Data de Previsão de entrega (interna)']!);
        const dataFinalCliente = this.sheetService.parseDate(this.state.projectData['Data Final (acordado com o cliente)']!);
        
        if (!dataPrevisaoInterna || !dataFinalCliente) {
          return {
            mensagem: '❌ Erro: datas inválidas',
            finalizado: true,
            erro: 'Datas inválidas'
          };
        }
        
        // Calcular prazos em dias úteis
        const prazoInterno = this.sheetService.calculateBusinessDays(dataInicio, dataPrevisaoInterna);
        const prazoCliente = this.sheetService.calculateBusinessDays(dataInicio, dataFinalCliente);
        
        // Preencher campos automáticos
        this.state.projectData['Data de Início'] = this.sheetService.formatDate(dataInicio);
        this.state.projectData['Prazo Interno (dias úteis)'] = prazoInterno.toString();
        this.state.projectData['Prazo Cliente (dias úteis)'] = prazoCliente.toString();
        this.state.projectData['Dias de atraso'] = '0'; // inicial
        
        // Descrição já foi preenchida no stepTipoProjeto
        
        // Criar novo projeto
        const result = await this.sheetService.createProject(this.state.projectData as ProjectData);
        
        if (result.success) {
          let mensagem = `✅ *Projeto criado com sucesso!*\n\n`;
          mensagem += `🆔 Código: *${this.state.projectCode}*\n`;
          mensagem += `👤 Cliente: ${this.state.projectData['Cliente']}\n`;
          mensagem += `🏗️ Obra: ${this.state.projectData['Obra']}\n`;
          mensagem += `📊 Tipo: ${this.state.projectData['Tipo de Projeto']}\n`;
          mensagem += `📅 Data previsão interna: ${this.state.projectData['Data de Previsão de entrega (interna)']}\n`;
          mensagem += `📅 Data final cliente: ${this.state.projectData['Data Final (acordado com o cliente)']}\n`;
          mensagem += `⏱️ Prazo interno: ${prazoInterno} dias úteis\n`;
          mensagem += `⏱️ Prazo cliente: ${prazoCliente} dias úteis\n\n`;
          mensagem += `_Dados salvos na planilha de engenheiros_`;

          return { mensagem, finalizado: true };
        } else {
          return {
            mensagem: `❌ Erro ao criar projeto: ${result.error}`,
            finalizado: true,
            erro: result.error
          };
        }
      } else {
        // Atualizar projeto existente
        const dailyData: DailyExecutionData = {
          'Status do projeto': this.state.projectData['Status do projeto'] || '',
          'Previsão para o dia': this.state.projectData['Previsão para o dia'] || '',
          'Feito ao final do dia': this.state.projectData['Feito ao final do dia'] || '',
          'Necessitou de retrabalho?': this.state.projectData['Necessitou de retrabalho?'] || 'não',
          'motivo da revisão': this.state.projectData['motivo da revisão'],
          'Data do registro do retrabalho': this.state.projectData['Data do registro do retrabalho'],
          'Etapa': this.state.projectData['Etapa'] || ''
        };

        // Decidir qual método chamar baseado no modo
        let result;
        let mensagem = '';

        if (this.state.mode === 'update_morning') {
          // Atualização da manhã
          const morningData: MorningUpdateData = {
            'Status do projeto': dailyData['Status do projeto'],
            'Previsão para o dia': dailyData['Previsão para o dia']
          };

          result = await this.sheetService.updateMorningData(
            this.state.projectCode!,
            morningData
          );

          if (result.success) {
            mensagem = `✅ *Atualização matinal salva com sucesso!*\n\n`;
            mensagem += `🆔 Código: *${this.state.projectCode}*\n`;
            mensagem += `📊 Status: ${morningData['Status do projeto']}\n`;
            mensagem += `📝 Previsão: ${morningData['Previsão para o dia']}\n\n`;
            mensagem += `_Dados salvos na planilha de engenheiros_`;
          }
        } else if (this.state.mode === 'update_night') {
          // Atualização da noite
          const nightData: NightUpdateData = {
            'Feito ao final do dia': dailyData['Feito ao final do dia'],
            'Necessitou de retrabalho?': dailyData['Necessitou de retrabalho?'],
            'motivo da revisão': dailyData['motivo da revisão'],
            'Data do registro do retrabalho': dailyData['Data do registro do retrabalho'],
            'Etapa': dailyData['Etapa'],
            'Observações': this.state.projectData['Observações']
          };

          result = await this.sheetService.updateNightData(
            this.state.projectCode!,
            nightData
          );

          if (result.success) {
            mensagem = `✅ *Atualização noturna salva com sucesso!*\n\n`;
            mensagem += `🆔 Código: *${this.state.projectCode}*\n`;
            mensagem += `✔️ Feito: ${nightData['Feito ao final do dia']}\n`;
            mensagem += `🔄 Retrabalho: ${nightData['Necessitou de retrabalho?']}\n`;
            mensagem += `📍 Etapa: ${nightData['Etapa']}\n`;
            if (nightData['Observações']) {
              mensagem += `📝 Observações: ${nightData['Observações']}\n`;
            }
            mensagem += `\n_Dados salvos na planilha de engenheiros_`;
          }
        } else {
          // Fallback: atualização completa (modo antigo)
          result = await this.sheetService.updateDailyExecution(
            this.state.projectCode!,
            dailyData
          );

          if (result.success) {
            mensagem = `✅ *Projeto atualizado com sucesso!*\n\n`;
            mensagem += `🆔 Código: *${this.state.projectCode}*\n`;
            mensagem += `📊 Status: ${dailyData['Status do projeto']}\n`;
            mensagem += `📍 Etapa: ${dailyData['Etapa']}\n`;
            
            if (dailyData['Necessitou de retrabalho?'] === 'sim') {
              mensagem += `⚠️ Retrabalho: ${dailyData['motivo da revisão']}\n`;
            }
            
            mensagem += `\n_Dados salvos na planilha de engenheiros_`;
          }
        }

        if (result.success) {
          return { mensagem, finalizado: true };
        } else {
          return {
            mensagem: `❌ Erro ao atualizar projeto: ${result.error}`,
            finalizado: true,
            erro: result.error
          };
        }
      }
    } catch (error: any) {
      return {
        mensagem: `❌ Erro ao salvar: ${error.message}`,
        finalizado: true,
        erro: error.message
      };
    }
  }

  // =====================================================
  // UTILITÁRIOS
  // =====================================================

  private cancelar(): FlowResult {
    return {
      mensagem: '❌ *Fluxo cancelado*\n\nDigite "menu" para voltar ao início.',
      finalizado: true
    };
  }

  private formatOptions(options: string[]): string {
    return options.map((opt, index) => `${index + 1}️⃣ ${opt}`).join('\n');
  }

  private generateSummary(): string {
    let summary = '';

    if (this.state.mode === 'create') {
      summary += `🆔 *Código:* ${this.state.projectData['Código do Projeto']}\n`;
      summary += `👤 *Cliente:* ${this.state.projectData['Cliente']}\n`;
      summary += `📞 *Contato:* ${this.state.projectData['Contato']}\n`;
      summary += `🏗️ *Obra:* ${this.state.projectData['Obra']}\n`;
      summary += `🏢 *Área:* ${this.state.projectData['Área']}\n`;
      summary += `📊 *Tipo:* ${this.state.projectData['Tipo de Projeto']}\n`;
      summary += `📝 *Descrição:* ${this.state.projectData['Descrição do projeto']}\n`;
      summary += `📅 *Data previsão interna:* ${this.state.projectData['Data de Previsão de entrega (interna)']}\n`;
      summary += `📅 *Data final cliente:* ${this.state.projectData['Data Final (acordado com o cliente)']}\n`;
    } else if (this.state.mode === 'update_morning') {
      summary += `🆔 *Código:* ${this.state.projectCode}\n`;
      summary += `📊 *Status:* ${this.state.projectData['Status do projeto']}\n`;
      summary += `📝 *Previsão dia:* ${this.state.projectData['Previsão para o dia']}\n`;
    } else if (this.state.mode === 'update_night') {
      summary += `🆔 *Código:* ${this.state.projectCode}\n`;
      summary += `✔️ *Feito dia:* ${this.state.projectData['Feito ao final do dia']}\n`;
      summary += `🔄 *Retrabalho:* ${this.state.projectData['Necessitou de retrabalho?']}\n`;

      if (this.state.projectData['Necessitou de retrabalho?'] === 'sim') {
        summary += `⚠️ *Motivo:* ${this.state.projectData['motivo da revisão']}\n`;
        summary += `📅 *Data retrabalho:* ${this.state.projectData['Data do registro do retrabalho']}\n`;
      }

      summary += `📍 *Etapa:* ${this.state.projectData['Etapa']}\n`;
      summary += `📝 *Observações:* ${this.state.projectData['Observações']}\n`;
    }

    return summary;
  }
}
