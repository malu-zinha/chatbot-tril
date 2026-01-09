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
import { getSupabaseService } from '../../integrations/supabase/supabaseService.ts';

// =====================================================
// CONSTANTES - CATEGORIAS DE EDIÇÃO
// =====================================================

const CATEGORIAS_EDICAO = {
  'dados_cadastrais': {
    nome: 'Dados Cadastrais',
    campos: ['Cliente', 'Contato', 'Obra', 'Área', 'Tipo de Projeto']
  },
  'datas_prazos': {
    nome: 'Datas e Prazos',
    campos: ['Dias estimados (interno)', 'Data de Previsão de entrega (interna)', 'Data Final (acordado com o cliente)']
  },
  'status_execucao': {
    nome: 'Status e Execução',
    campos: ['Status do projeto', 'Etapa', '% executado']
  }
};

// =====================================================
// MAPEAMENTO: STATUS → ETAPA AUTOMÁTICA
// =====================================================
// A etapa é definida automaticamente com base no status do projeto

const STATUS_PARA_ETAPA: { [key: string]: string } = {
  'aguardando início': 'Projeto recebido, esperando documentação, reunião ou liberação',
  'aguardando inf. Cliente': 'Aguardando documentação',
  'em execução': 'Engenheiro está trabalhando ativamente no dimensionamento, traçado, pré-projeto ou detalhamento',
  'em aprovação': 'Enviado ao cliente ou responsável; aguardando retorno',
  'parado cliente': 'Aguarda informações, revisões ou decisões do cliente',
  'parado tecpred': 'Aguarda decisão interna, aprovação técnica ou redistribuição',
  'concluído': 'Finalizado e entregue'
};

// =====================================================
// TIPOS E INTERFACES
// =====================================================

type FlowStep =
  | 'inicio'
  | 'escolher_acao'  // Agora com 3 opções: Criar, Editar, Notificações
  
  // Fluxo de Criação (Modo A)
  | 'cliente'
  | 'contato'
  | 'obra'
  | 'area_projeto'
  | 'tipo_projeto'
  | 'data_inicio'              // NOVO: data de início manual
  | 'data_previsao_interna'    // NOVO: data previsão interna manual
  | 'data_final_cliente'       // Data final cliente manual
  
  // Fluxo de Edição (Modo B)
  | 'escolher_projeto_edicao'     // NOVO
  | 'escolher_categoria'          // NOVO
  | 'escolher_campo'              // NOVO
  | 'novo_valor'                  // NOVO
  
  // Fluxo de Notificações (Modo C)
  | 'escolher_tipo_notificacao'   // NOVO: manhã ou noite
  | 'escolher_projeto_notif'      // NOVO
  | 'status_projeto'              // Pergunta o status (manhã e noite)
  | 'previsao_dia'                // Apenas manhã
  | 'feito_dia'                   // Apenas noite
  | 'retrabalho_pergunta'         // Apenas noite
  | 'retrabalho_motivo'           // Apenas noite (se teve retrabalho)
  // REMOVIDO: 'etapa_projeto' - Agora é automático baseado no status
  | 'observacoes_pergunta'        // Apenas noite
  | 'observacoes_texto'           // Apenas noite (se quiser adicionar)
  
  | 'confirmacao'
  | 'salvar'
  | 'fim';

interface FlowState {
  step: FlowStep;
  mode: 'create' | 'edit' | 'notification' | 'update_morning' | 'update_night' | null;  // ATUALIZADO
  periodo?: 'manha' | 'noite';
  projectCode?: string;
  projectData: Partial<ProjectData>;
  availableProjects?: Project[];
  engineerName?: string;
  editCategory?: string;      // NOVO: categoria selecionada na edição
  editField?: string;          // NOVO: campo sendo editado
  originalValue?: string;      // NOVO: valor original do campo sendo editado
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

        // Modo B: Edição
        case 'escolher_projeto_edicao':
          return await this.stepEscolherProjetoEdicao(msg);

        case 'escolher_categoria':
          return await this.stepEscolherCategoria(msg);

        case 'escolher_campo':
          return await this.stepEscolherCampo(msg);

        case 'novo_valor':
          return await this.stepNovoValor(msg);

        // Modo C: Notificações
        case 'escolher_tipo_notificacao':
          return await this.stepEscolherTipoNotificacao(msg);

        case 'escolher_projeto_notif':
          return await this.stepEscolherProjetoNotif(msg);

        // Modo A: Criação
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

        case 'data_inicio':
          return await this.stepDataInicio(msg);

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

        // REMOVIDO: case 'etapa_projeto' - Etapa agora é automática baseada no status

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
    // Ir direto para escolher_acao sem mostrar menu
    // (o menu já foi mostrado pelo messageHandler)
    this.state.step = 'escolher_acao';
    
    let mensagem = `📊 *Gestão de Projetos*\n\n`;
    mensagem += `O que você deseja fazer?\n\n`;
    mensagem += `1️⃣ Criar novo projeto\n`;
    mensagem += `2️⃣ Editar projeto existente\n`;
    mensagem += `3️⃣ Notificações diárias (Manhã/Noite)\n\n`;
    mensagem += `_Digite o número da opção_`;

    return { mensagem, finalizado: false };
  }

  private async stepEscolherAcao(msg: string): Promise<FlowResult> {
    const opcao = msg.trim();

    if (opcao === '1') {
      // MODO A: Criar novo projeto
      this.state.mode = 'create';
      this.state.step = 'cliente';
      
      let mensagem = `✅ *Criar Novo Projeto*\n\n`;
      mensagem += `Vamos preencher os dados do projeto.\n`;
      mensagem += `O código será gerado automaticamente.\n\n`;
      mensagem += `👤 *Digite o nome do CLIENTE*\n\n`;
      mensagem += `_Digite o nome completo do cliente_`;

      return { mensagem, finalizado: false };
      
    } else if (opcao === '2') {
      // MODO B: Editar projeto existente
      this.state.mode = 'edit';
      this.state.step = 'escolher_projeto_edicao';

      // Buscar TODOS os projetos da planilha
      const projects = await this.sheetService.listAllProjects();
      this.state.availableProjects = projects;

      if (projects.length === 0) {
        return {
          mensagem: '❌ Nenhum projeto encontrado na planilha.\n\nCadastre um novo projeto primeiro.',
          finalizado: true
        };
      }

      let mensagem = `✏️ *Editar Projeto Existente*\n\n`;
      mensagem += `📋 Escolha o projeto que deseja editar:\n\n`;
      
      projects.forEach((proj, index) => {
        mensagem += `${index + 1}️⃣ *${proj.codigo}* - ${proj.cliente}\n`;
        mensagem += `   ${proj.obra || 'Sem descrição'}\n\n`;
      });

      mensagem += `_Digite o número do projeto_`;
      return { mensagem, finalizado: false };
      
    } else if (opcao === '3') {
      // MODO C: Notificações diárias
      this.state.mode = 'notification';
      this.state.step = 'escolher_tipo_notificacao';

      let mensagem = `📅 *Notificações Diárias*\n\n`;
      mensagem += `Qual tipo de notificação deseja simular?\n\n`;
      mensagem += `🌅 *1️⃣ Manhã*\n`;
      mensagem += `   Status do projeto e previsão para o dia\n\n`;
      mensagem += `🌙 *2️⃣ Noite*\n`;
      mensagem += `   Feito hoje, retrabalho, etapa e observações\n\n`;
      mensagem += `_Digite o número da opção_`;

      return { mensagem, finalizado: false };
      
    } else {
      return {
        mensagem: '❌ Opção inválida. Digite *1*, *2* ou *3*.',
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
    
    this.state.step = 'data_inicio';

    let mensagem = `✅ Tipo *${tipo}* selecionado\n\n`;
    mensagem += `📝 Descrição: ${descricao}\n\n`;
    mensagem += `📅 *Digite a DATA DE INÍCIO do projeto*\n\n`;
    mensagem += `Formato: DD/MM/AAAA\n`;
    mensagem += `Exemplo: 15/01/2025\n\n`;
    mensagem += `_Digite a data de início_`;

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

  private async stepDataInicio(msg: string): Promise<FlowResult> {
    const dateStr = msg.trim();

    if (!this.sheetService.validateDateFormat(dateStr)) {
      return {
        mensagem: '❌ Formato inválido. Use DD/MM/AAAA (exemplo: 15/01/2025).',
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

    this.state.projectData['Data de Início'] = dateStr;
    this.state.step = 'data_previsao_interna';

    let mensagem = `✅ Data de início: *${dateStr}*\n\n`;
    mensagem += `📅 *Digite a DATA DE PREVISÃO DE ENTREGA (INTERNA)*\n\n`;
    mensagem += `Formato: DD/MM/AAAA\n`;
    mensagem += `Exemplo: 05/02/2025\n\n`;
    mensagem += `_Digite a data de previsão interna_`;

    return { mensagem, finalizado: false };
  }

  private async stepDataPrevisaoInterna(msg: string): Promise<FlowResult> {
    const dateStr = msg.trim();

    if (!this.sheetService.validateDateFormat(dateStr)) {
      return {
        mensagem: '❌ Formato inválido. Use DD/MM/AAAA (exemplo: 05/02/2025).',
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

    // Validar que a data de previsão é posterior à data de início
    const dataInicio = this.sheetService.parseDate(this.state.projectData['Data de Início'] || '');
    if (dataInicio && date <= dataInicio) {
      return {
        mensagem: '❌ A data de previsão interna deve ser posterior à data de início.',
        finalizado: false
      };
    }

    this.state.projectData['Data de Previsão de entrega (interna)'] = dateStr;
    this.state.step = 'data_final_cliente';

    let mensagem = `✅ Data de previsão interna: *${dateStr}*\n\n`;
    mensagem += `📅 *Digite a DATA FINAL (ACORDADA COM O CLIENTE)*\n\n`;
    mensagem += `Formato: DD/MM/AAAA\n`;
    mensagem += `Exemplo: 20/02/2025\n\n`;
    mensagem += `_Digite a data acordada com o cliente_`;

    return { mensagem, finalizado: false };
  }

  // =====================================================
  // MODO B: EDIÇÃO DE PROJETOS
  // =====================================================

  private async stepEscolherProjetoEdicao(msg: string): Promise<FlowResult> {
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

    this.state.step = 'escolher_categoria';

    let mensagem = `✅ Projeto *${selectedProject.codigo}* selecionado\n\n`;
    mensagem += `📊 Cliente: ${selectedProject.cliente}\n`;
    mensagem += `🏗️ Obra: ${selectedProject.obra}\n\n`;
    mensagem += `📁 *Qual categoria deseja editar?*\n\n`;
    mensagem += `1️⃣ *Dados Cadastrais*\n`;
    mensagem += `   Cliente, Contato, Obra, Área, Tipo\n\n`;
    mensagem += `2️⃣ *Datas e Prazos*\n`;
    mensagem += `   Dias estimados, Previsão interna, Data final cliente\n\n`;
    mensagem += `3️⃣ *Status e Execução*\n`;
    mensagem += `   Status do projeto, Etapa, % executado\n\n`;
    mensagem += `_Digite o número da categoria_`;

    return { mensagem, finalizado: false };
  }

  private async stepEscolherCategoria(msg: string): Promise<FlowResult> {
    const opcao = msg.trim();
    let categoria: string;
    let categoriaInfo;

    if (opcao === '1') {
      categoria = 'dados_cadastrais';
      categoriaInfo = CATEGORIAS_EDICAO[categoria];
    } else if (opcao === '2') {
      categoria = 'datas_prazos';
      categoriaInfo = CATEGORIAS_EDICAO[categoria];
    } else if (opcao === '3') {
      categoria = 'status_execucao';
      categoriaInfo = CATEGORIAS_EDICAO[categoria];
    } else {
      return {
        mensagem: '❌ Opção inválida. Digite *1*, *2* ou *3*.',
        finalizado: false
      };
    }

    this.state.editCategory = categoria;
    this.state.step = 'escolher_campo';

    let mensagem = `✏️ *${categoriaInfo.nome}*\n\n`;
    mensagem += `Qual campo deseja editar?\n\n`;
    
    categoriaInfo.campos.forEach((campo, index) => {
      const valorAtual = this.state.projectData[campo] || '(vazio)';
      mensagem += `${index + 1}️⃣ *${campo}*\n`;
      mensagem += `   Valor atual: ${valorAtual}\n\n`;
    });

    mensagem += `_Digite o número do campo_`;

    return { mensagem, finalizado: false };
  }

  private async stepEscolherCampo(msg: string): Promise<FlowResult> {
    const numero = parseInt(msg.trim(), 10);
    const categoriaInfo = CATEGORIAS_EDICAO[this.state.editCategory!];

    if (isNaN(numero) || numero < 1 || numero > categoriaInfo.campos.length) {
      return {
        mensagem: `❌ Número inválido. Digite um número entre 1 e ${categoriaInfo.campos.length}.`,
        finalizado: false
      };
    }

    const campo = categoriaInfo.campos[numero - 1];
    this.state.editField = campo;
    this.state.originalValue = this.state.projectData[campo] as string || '';
    this.state.step = 'novo_valor';

    let mensagem = `✏️ *Editar: ${campo}*\n\n`;
    mensagem += `Valor atual: *${this.state.originalValue || '(vazio)'}*\n\n`;

    // Mensagem específica baseada no tipo de campo
    if (campo === 'Obra') {
      mensagem += `Digite o novo valor:\n\n`;
      mensagem += this.formatOptions(TIPOS_OBRA);
      mensagem += `\n_Digite o número da opção_`;
    } else if (campo === 'Área') {
      mensagem += `Digite o novo valor:\n\n`;
      mensagem += this.formatOptions(AREAS_PROJETO);
      mensagem += `\n_Digite o número da opção_`;
    } else if (campo === 'Tipo de Projeto') {
      mensagem += `Digite o novo valor:\n\n`;
      mensagem += this.formatOptions(TIPOS_PROJETO);
      mensagem += `\n_Digite o número da opção_`;
    } else if (campo === 'Status do projeto') {
      mensagem += `Digite o novo valor:\n\n`;
      mensagem += this.formatOptions(STATUS_PROJETO);
      mensagem += `\n_Digite o número da opção_`;
    } else if (campo === 'Etapa') {
      mensagem += `Digite o novo valor:\n\n`;
      const etapasNomes = ETAPAS_PROJETO.map(e => e.nome);
      mensagem += this.formatOptions(etapasNomes);
      mensagem += `\n_Digite o número da opção_`;
    } else if (campo.includes('Data')) {
      mensagem += `Digite a nova data:\n\n`;
      mensagem += `Formato: DD/MM/AAAA\n`;
      mensagem += `_Exemplo: 15/12/2024_`;
    } else if (campo.includes('Dias') || campo.includes('%')) {
      mensagem += `Digite o novo valor (apenas número):\n\n`;
      mensagem += `_Digite apenas o número_`;
    } else {
      mensagem += `Digite o novo valor:\n\n`;
      mensagem += `_Digite o texto_`;
    }

    return { mensagem, finalizado: false };
  }

  private async stepNovoValor(msg: string): Promise<FlowResult> {
    const campo = this.state.editField!;
    let novoValor: string;

    // Processar entrada baseado no tipo de campo
    if (campo === 'Obra') {
      const numero = parseInt(msg.trim(), 10);
      if (isNaN(numero) || numero < 1 || numero > TIPOS_OBRA.length) {
        return {
          mensagem: `❌ Número inválido. Digite um número entre 1 e ${TIPOS_OBRA.length}.`,
          finalizado: false
        };
      }
      novoValor = TIPOS_OBRA[numero - 1];
    } else if (campo === 'Área') {
      const numero = parseInt(msg.trim(), 10);
      if (isNaN(numero) || numero < 1 || numero > AREAS_PROJETO.length) {
        return {
          mensagem: `❌ Número inválido. Digite um número entre 1 e ${AREAS_PROJETO.length}.`,
          finalizado: false
        };
      }
      novoValor = AREAS_PROJETO[numero - 1];
    } else if (campo === 'Tipo de Projeto') {
      const numero = parseInt(msg.trim(), 10);
      if (isNaN(numero) || numero < 1 || numero > TIPOS_PROJETO.length) {
        return {
          mensagem: `❌ Número inválido. Digite um número entre 1 e ${TIPOS_PROJETO.length}.`,
          finalizado: false
        };
      }
      novoValor = TIPOS_PROJETO[numero - 1];
    } else if (campo === 'Status do projeto') {
      const numero = parseInt(msg.trim(), 10);
      if (isNaN(numero) || numero < 1 || numero > STATUS_PROJETO.length) {
        return {
          mensagem: `❌ Número inválido. Digite um número entre 1 e ${STATUS_PROJETO.length}.`,
          finalizado: false
        };
      }
      novoValor = STATUS_PROJETO[numero - 1];
    } else if (campo === 'Etapa') {
      const numero = parseInt(msg.trim(), 10);
      if (isNaN(numero) || numero < 1 || numero > ETAPAS_PROJETO.length) {
        return {
          mensagem: `❌ Número inválido. Digite um número entre 1 e ${ETAPAS_PROJETO.length}.`,
          finalizado: false
        };
      }
      novoValor = ETAPAS_PROJETO[numero - 1].nome;
    } else if (campo.includes('Data')) {
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
      novoValor = dateStr;
    } else {
      novoValor = msg.trim();
      if (novoValor.length === 0) {
        return {
          mensagem: '❌ Valor não pode estar vazio.',
          finalizado: false
        };
      }
    }

    // Atualizar no state temporariamente
    this.state.projectData[campo] = novoValor;
    this.state.step = 'confirmacao';

    let mensagem = `📝 *Confirmação de Edição*\n\n`;
    mensagem += `Projeto: *${this.state.projectCode}*\n`;
    mensagem += `Campo: *${campo}*\n\n`;
    mensagem += `Valor anterior: ${this.state.originalValue || '(vazio)'}\n`;
    mensagem += `Novo valor: *${novoValor}*\n\n`;
    mensagem += `*Confirma a alteração?*\n\n`;
    mensagem += `1️⃣ Sim, salvar\n`;
    mensagem += `2️⃣ Não, cancelar\n\n`;
    mensagem += `_Digite o número da opção_`;

    return { mensagem, finalizado: false };
  }

  // =====================================================
  // FIM MODO B
  // =====================================================

  // =====================================================
  // MODO C: NOTIFICAÇÕES DIÁRIAS
  // =====================================================

  private async stepEscolherTipoNotificacao(msg: string): Promise<FlowResult> {
    const opcao = msg.trim();

    if (opcao === '1') {
      // Notificação da manhã
      this.state.mode = 'update_morning';  // CORREÇÃO: setar mode correto
      this.state.periodo = 'manha';
      this.state.step = 'escolher_projeto_notif';

      // Buscar TODOS os projetos da planilha
      const projects = await this.sheetService.listAllProjects();
      this.state.availableProjects = projects;

      if (projects.length === 0) {
        return {
          mensagem: '❌ Nenhum projeto encontrado na planilha.\n\nCadastre um novo projeto primeiro.',
          finalizado: true
        };
      }

      let mensagem = `🌅 *Notificação Matinal*\n\n`;
      mensagem += `📋 Escolha o projeto:\n\n`;
      
      projects.forEach((proj, index) => {
        mensagem += `${index + 1}️⃣ *${proj.codigo}* - ${proj.cliente}\n`;
        mensagem += `   ${proj.obra || 'Sem descrição'}\n`;
        mensagem += `   Status: ${proj.status || 'N/A'}\n\n`;
      });

      mensagem += `_Digite o número do projeto_`;
      return { mensagem, finalizado: false };

    } else if (opcao === '2') {
      // Notificação da noite
      this.state.mode = 'update_night';  // CORREÇÃO: setar mode correto
      this.state.periodo = 'noite';
      this.state.step = 'escolher_projeto_notif';

      // Buscar TODOS os projetos da planilha
      const projects = await this.sheetService.listAllProjects();
      this.state.availableProjects = projects;

      if (projects.length === 0) {
        return {
          mensagem: '❌ Nenhum projeto encontrado na planilha.\n\nCadastre um novo projeto primeiro.',
          finalizado: true
        };
      }

      let mensagem = `🌙 *Notificação Noturna*\n\n`;
      mensagem += `📋 Escolha o projeto:\n\n`;
      
      projects.forEach((proj, index) => {
        mensagem += `${index + 1}️⃣ *${proj.codigo}* - ${proj.cliente}\n`;
        mensagem += `   ${proj.obra || 'Sem descrição'}\n`;
        mensagem += `   Status: ${proj.status || 'N/A'}\n\n`;
      });

      mensagem += `_Digite o número do projeto_`;
      return { mensagem, finalizado: false };
    } else {
      return {
        mensagem: '❌ Opção inválida. Digite *1* para manhã ou *2* para noite.',
        finalizado: false
      };
    }
  }

  private async stepEscolherProjetoNotif(msg: string): Promise<FlowResult> {
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

    // Ambos os períodos começam perguntando o STATUS
    // (a etapa será definida automaticamente baseada no status)
    this.state.step = 'status_projeto';
    
    if (this.state.periodo === 'manha') {
      mensagem += `Vamos registrar a atualização matinal.\n\n`;
    } else if (this.state.periodo === 'noite') {
      mensagem += `Vamos registrar a atualização noturna.\n\n`;
    }
    
    mensagem += `📌 *Qual o STATUS atual do projeto?*\n\n`;
    mensagem += this.formatOptions(STATUS_PROJETO);
    mensagem += `\n_Digite o número da opção_`;

    return { mensagem, finalizado: false };
  }

  // =====================================================
  // FIM MODO C
  // =====================================================

  private async stepDataFinalCliente(msg: string): Promise<FlowResult> {
    const dateStr = msg.trim();

    if (!this.sheetService.validateDateFormat(dateStr)) {
      return {
        mensagem: '❌ Formato inválido. Use DD/MM/AAAA (exemplo: 20/02/2025).',
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

    // Validar que a data final cliente é posterior à data de início
    const dataInicio = this.sheetService.parseDate(this.state.projectData['Data de Início'] || '');
    if (dataInicio && date <= dataInicio) {
      return {
        mensagem: '❌ A data acordada com o cliente deve ser posterior à data de início.',
        finalizado: false
      };
    }

    this.state.projectData['Data Final (acordado com o cliente)'] = dateStr;
    
    // Prazos serão calculados automaticamente no método salvar()
    // baseados nas diferenças entre as datas (em dias úteis)
    
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
    
    // ✅ DEFINIR ETAPA AUTOMATICAMENTE baseado no status
    const etapaAutomatica = STATUS_PARA_ETAPA[status] || status;
    this.state.projectData['Etapa'] = etapaAutomatica;

    let mensagem = `✅ Status: *${status}*\n`;
    mensagem += `📍 Etapa (automática): *${etapaAutomatica}*\n\n`;

    // Decidir próximo passo baseado no período
    if (this.state.periodo === 'manha') {
      // Período manhã: vai para previsão do dia
      this.state.step = 'previsao_dia';
      
      // Buscar opções de previsão conforme status (menu dinâmico)
      const opcoes = this.sheetService.getPrevisoesPorStatus(status);
      
      mensagem += `📝 *PREVISÃO PARA O DIA*\n\n`;
      mensagem += `O que você planeja realizar hoje?\n\n`;
      mensagem += this.formatOptions(opcoes);
      mensagem += `\n_Digite o número da opção_`;
    } else if (this.state.periodo === 'noite') {
      // Período noite: vai para feito do dia
      this.state.step = 'feito_dia';
      
      // Menu dinâmico conforme status
      const opcoes = this.sheetService.getFeitosPorStatus(status);
      
      mensagem += `✔️ *O que foi FEITO ao final do dia?*\n\n`;
      mensagem += this.formatOptions(opcoes);
      mensagem += `\n_Digite o número da opção_`;
    }

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
      this.state.step = 'observacoes_pergunta';

      let mensagem = `✅ Sem retrabalho\n\n`;
      mensagem += `📝 *Deseja adicionar OBSERVAÇÕES?*\n\n`;
      mensagem += `1️⃣ Sim\n`;
      mensagem += `2️⃣ Não\n\n`;
      mensagem += `_Digite o número da opção_`;

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
    
    this.state.step = 'observacoes_pergunta';

    let mensagem = `✅ Motivo: *${motivo}*\n`;
    mensagem += `📅 Data do retrabalho: *${dataFormatada}*\n\n`;
    mensagem += `📝 *Deseja adicionar OBSERVAÇÕES?*\n\n`;
    mensagem += `1️⃣ Sim\n`;
    mensagem += `2️⃣ Não\n\n`;
    mensagem += `_Digite o número da opção_`;

    return { mensagem, finalizado: false };
  }

  // MÉTODO REMOVIDO: stepEtapaProjeto
  // A etapa agora é definida AUTOMATICAMENTE baseada no status do projeto
  // Ver mapeamento STATUS_PARA_ETAPA no início do arquivo
  
  /* 
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
  */

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
      // Confirmar e salvar - método apropriado baseado no modo
      if (this.state.mode === 'edit') {
        return await this.salvarEdicao();
      } else {
      return await this.salvar();
      }
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
      const supabase = getSupabaseService();
      
      if (this.state.mode === 'create') {
        // GERAR CÓDIGO AUTOMÁTICO
        const nextCode = await this.sheetService.generateNextProjectCode();
        this.state.projectCode = nextCode;
        this.state.projectData['Código do Projeto'] = nextCode;

        // CAMPOS AUTOMÁTICOS - CALCULAR PRAZOS
        // As 3 datas já foram preenchidas pelo usuário:
        // - Data de Início
        // - Data de Previsão de entrega (interna)
        // - Data Final (acordado com o cliente)
        
        const dataInicio = this.sheetService.parseDate(this.state.projectData['Data de Início']!);
        const dataPrevisaoInterna = this.sheetService.parseDate(this.state.projectData['Data de Previsão de entrega (interna)']!);
        const dataFinalCliente = this.sheetService.parseDate(this.state.projectData['Data Final (acordado com o cliente)']!);
        
        if (!dataInicio || !dataPrevisaoInterna || !dataFinalCliente) {
          return {
            mensagem: '❌ Erro: uma ou mais datas inválidas',
            finalizado: true,
            erro: 'Data inválida'
          };
        }

        // Calcular prazos em dias úteis (diferença entre as datas)
        const prazoInterno = this.sheetService.calculateBusinessDays(dataInicio, dataPrevisaoInterna);
        const prazoCliente = this.sheetService.calculateBusinessDays(dataInicio, dataFinalCliente);
        
        // Preencher campos automáticos
        this.state.projectData['Dias estimados (interno)'] = prazoInterno.toString(); // Para compatibilidade
        this.state.projectData['Prazo Interno (dias úteis)'] = prazoInterno.toString();
        this.state.projectData['Prazo Cliente (dias úteis)'] = prazoCliente.toString();
        this.state.projectData['Dias de atraso'] = '0'; // inicial
        
        // Descrição já foi preenchida no stepTipoProjeto
        
        // ESTRATÉGIA: Salvar APENAS no Supabase (planilhas são atualizadas por sincronização)
        
        // 1. Salvar no Supabase
        if (supabase.isConnected()) {
          console.log('💾 Salvando projeto no Supabase...');
          
          // Buscar ou criar engenheiro
          const engenheiro = await supabase.criarOuBuscarEngenheiro(
            this.whatsapp,
            this.state.engineerName
          );
          
          if (engenheiro) {
            // Criar projeto no banco
            const projetoSalvo = await supabase.criarProjeto(
              this.state.projectData,
              engenheiro.id
            );
            
            if (projetoSalvo) {
              console.log('✅ Projeto salvo no Supabase');
              
              let mensagem = `✅ *Projeto criado com sucesso!*\n\n`;
              mensagem += `🆔 Código: *${this.state.projectCode}*\n`;
              mensagem += `👤 Cliente: ${this.state.projectData['Cliente']}\n`;
              mensagem += `🏗️ Obra: ${this.state.projectData['Obra']}\n`;
              mensagem += `📊 Tipo: ${this.state.projectData['Tipo de Projeto']}\n\n`;
              mensagem += `📅 *Datas:*\n`;
              mensagem += `  • Início: ${this.state.projectData['Data de Início']}\n`;
              mensagem += `  • Previsão interna: ${this.state.projectData['Data de Previsão de entrega (interna)']}\n`;
              mensagem += `  • Final cliente: ${this.state.projectData['Data Final (acordado com o cliente)']}\n\n`;
              mensagem += `⏱️ *Prazos (calculados):*\n`;
              mensagem += `  • Prazo interno: ${prazoInterno} dias úteis\n`;
              mensagem += `  • Prazo cliente: ${prazoCliente} dias úteis\n\n`;
              mensagem += `_✅ Dados salvos no banco de dados_\n`;
              mensagem += `_🔄 Planilhas serão atualizadas automaticamente (até 5min)_`;

              return { mensagem, finalizado: true };
            }
          }
          
          return {
            mensagem: `❌ Erro ao salvar projeto no banco de dados`,
            finalizado: true,
            erro: 'Erro ao criar projeto no Supabase'
          };
        } else {
          // Fallback: salvar na planilha se Supabase não configurado
          console.log('⚠️ Supabase não configurado, salvando apenas na planilha...');
        const result = await this.sheetService.createProject(this.state.projectData as ProjectData);
        
        if (result.success) {
          let mensagem = `✅ *Projeto criado com sucesso!*\n\n`;
          mensagem += `🆔 Código: *${this.state.projectCode}*\n`;
          mensagem += `👤 Cliente: ${this.state.projectData['Cliente']}\n`;
          mensagem += `🏗️ Obra: ${this.state.projectData['Obra']}\n`;
          mensagem += `📊 Tipo: ${this.state.projectData['Tipo de Projeto']}\n\n`;
          mensagem += `📅 *Datas:*\n`;
          mensagem += `  • Início: ${this.state.projectData['Data de Início']}\n`;
          mensagem += `  • Previsão interna: ${this.state.projectData['Data de Previsão de entrega (interna)']}\n`;
          mensagem += `  • Final cliente: ${this.state.projectData['Data Final (acordado com o cliente)']}\n\n`;
          mensagem += `⏱️ *Prazos (calculados):*\n`;
          mensagem += `  • Prazo interno: ${prazoInterno} dias úteis\n`;
          mensagem += `  • Prazo cliente: ${prazoCliente} dias úteis\n\n`;
            mensagem += `_✅ Dados salvos na planilha_\n`;
            mensagem += `_⚠️ Configure Supabase para usar o banco de dados_`;

          return { mensagem, finalizado: true };
        } else {
          return {
              mensagem: `❌ Erro ao criar projeto: ${result.error || 'Erro desconhecido'}`,
            finalizado: true,
            erro: result.error
          };
          }
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
        let salvouSupabase = false;
        let salvouPlanilha = false;

        if (this.state.mode === 'update_morning') {
          // Atualização da manhã
          const morningData: MorningUpdateData = {
            'Status do projeto': dailyData['Status do projeto'],
            'Previsão para o dia': dailyData['Previsão para o dia']
          };

          // Salvar APENAS no Supabase
          if (supabase.isConnected()) {
            const projeto = await supabase.buscarProjetoPorCodigo(this.state.projectCode!);
            
            if (projeto) {
              const atualizacao = await supabase.registrarAtualizacaoManha(projeto.id, {
                status: morningData['Status do projeto'],
                previsao: morningData['Previsão para o dia']
              });
              
              if (atualizacao) {
                salvouSupabase = true;
            mensagem = `✅ *Atualização matinal salva com sucesso!*\n\n`;
            mensagem += `🆔 Código: *${this.state.projectCode}*\n`;
            mensagem += `📊 Status: ${morningData['Status do projeto']}\n`;
            mensagem += `📝 Previsão: ${morningData['Previsão para o dia']}\n\n`;
                mensagem += `_✅ Salvo no banco de dados_\n`;
                mensagem += `_🔄 Planilhas serão atualizadas automaticamente_`;
              } else {
                mensagem = `❌ Erro ao salvar atualização matinal`;
              }
            } else {
              mensagem = `❌ Projeto não encontrado: ${this.state.projectCode}`;
            }
          } else {
            // Fallback: planilha
            result = await this.sheetService.updateMorningData(this.state.projectCode!, morningData);
            if (result.success) {
              salvouPlanilha = true;
              mensagem = `✅ *Atualização matinal salva!*\n\n`;
              mensagem += `_⚠️ Configure Supabase para usar o banco de dados_`;
            } else {
              mensagem = `❌ Erro ao salvar atualização`;
            }
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

          // Salvar APENAS no Supabase
          if (supabase.isConnected()) {
            const projeto = await supabase.buscarProjetoPorCodigo(this.state.projectCode!);
            
            if (projeto) {
              // Obter percentual da etapa
              const etapaInfo = ETAPAS_PROJETO.find(e => e.nome === nightData['Etapa']);
              const percentual = etapaInfo?.percentual || 0;
              
              const atualizacao = await supabase.registrarAtualizacaoNoite(projeto.id, {
                feito: nightData['Feito ao final do dia'],
                retrabalho: nightData['Necessitou de retrabalho?'] === 'sim',
                motivoRetrabalho: nightData['motivo da revisão'],
                etapa: nightData['Etapa'],
                percentual: percentual,
                observacoes: nightData['Observações'] || ''
              });
              
              if (atualizacao) {
                salvouSupabase = true;
            mensagem = `✅ *Atualização noturna salva com sucesso!*\n\n`;
            mensagem += `🆔 Código: *${this.state.projectCode}*\n`;
            mensagem += `✔️ Feito: ${nightData['Feito ao final do dia']}\n`;
            mensagem += `🔄 Retrabalho: ${nightData['Necessitou de retrabalho?']}\n`;
            mensagem += `📍 Etapa: ${nightData['Etapa']}\n`;
            if (nightData['Observações']) {
              mensagem += `📝 Observações: ${nightData['Observações']}\n`;
            }
                mensagem += `\n_✅ Salvo no banco de dados_\n`;
                mensagem += `_🔄 Planilhas serão atualizadas automaticamente_`;
              } else {
                mensagem = `❌ Erro ao salvar atualização noturna`;
              }
            } else {
              mensagem = `❌ Projeto não encontrado: ${this.state.projectCode}`;
            }
          } else {
            // Fallback: planilha
            result = await this.sheetService.updateNightData(this.state.projectCode!, nightData);
            if (result.success) {
              salvouPlanilha = true;
              mensagem = `✅ *Atualização noturna salva!*\n\n`;
              mensagem += `_⚠️ Configure Supabase para usar o banco de dados_`;
            } else {
              mensagem = `❌ Erro ao salvar atualização`;
            }
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

        if (salvouSupabase || salvouPlanilha || (result && result.success)) {
          return { mensagem, finalizado: true };
        } else {
          return {
            mensagem: `❌ Erro ao atualizar projeto: ${result?.error || 'Erro desconhecido'}`,
            finalizado: true,
            erro: result?.error
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
  // SALVAR EDIÇÃO (MODO B)
  // =====================================================

  private async salvarEdicao(): Promise<FlowResult> {
    try {
      const campo = this.state.editField!;
      const novoValor = this.state.projectData[campo] as string;
      const supabase = getSupabaseService();

      // ESTRATÉGIA: Salvar APENAS no Supabase (planilhas são atualizadas por sincronização)
      
      if (supabase.isConnected()) {
        console.log('💾 Salvando edição no Supabase...');
        
        // Atualizar campo no Supabase
        const result = await supabase.atualizarCampoProjeto(
          this.state.projectCode!,
          campo,
          novoValor
        );

        if (result.success) {
          console.log('✅ Edição salva no Supabase');
          
          let mensagem = `✅ *Campo atualizado com sucesso!*\n\n`;
          mensagem += `Projeto: *${this.state.projectCode}*\n`;
          mensagem += `Campo: *${campo}*\n`;
          mensagem += `Valor anterior: ${this.state.originalValue || '(vazio)'}\n`;
          mensagem += `Novo valor: *${novoValor}*\n\n`;
          mensagem += `📊 *Salvamento:*\n`;
          mensagem += `✅ Supabase: Salvo\n`;
          mensagem += `🔄 Planilha: Sincroniza em ~5min\n\n`;
          mensagem += `_Os dados foram salvos no banco de dados!_\n`;
          mensagem += `_A planilha será atualizada automaticamente._`;

          return { mensagem, finalizado: true };
        } else {
          return {
            mensagem: `❌ Erro ao atualizar no Supabase: ${result.error}`,
            finalizado: true,
            erro: result.error
          };
        }
      } else {
        // Fallback: Supabase não conectado, salvar direto na planilha
        console.log('⚠️ Supabase não conectado, salvando direto na planilha...');
        
        const result = await this.sheetService.updateProjectField(
          this.state.projectCode!,
          campo,
          novoValor
        );

        if (result.success) {
          let mensagem = `✅ *Campo atualizado com sucesso!*\n\n`;
          mensagem += `Projeto: *${this.state.projectCode}*\n`;
          mensagem += `Campo: *${campo}*\n`;
          mensagem += `Valor anterior: ${this.state.originalValue || '(vazio)'}\n`;
          mensagem += `Novo valor: *${novoValor}*\n\n`;
          mensagem += `⚠️ Salvo direto na planilha (Supabase offline)`;

          return { mensagem, finalizado: true };
        } else {
          return {
            mensagem: `❌ Erro ao atualizar: ${result.error}`,
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
      summary += `📅 *Data início:* ${this.state.projectData['Data de Início']}\n`;
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
