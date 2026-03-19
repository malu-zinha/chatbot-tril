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
  | 'escolher_acao'

  // Notificacao Manha
  | 'escolher_projeto_manha'
  | 'escolher_area_manha'
  | 'status_atual_manha'
  | 'previsao_dia'

  // Notificacao Noite
  | 'escolher_projeto_noite'
  | 'escolher_area_noite'
  | 'feito_dia'
  | 'retrabalho_pergunta'
  | 'retrabalho_motivo'
  | 'observacoes_pergunta'
  | 'observacoes_texto'

  // Edicao
  | 'escolher_projeto_edicao'
  | 'escolher_area_edicao'
  | 'escolher_campo'
  | 'novo_valor'
  | 'confirmacao'

  // Visualizacao
  | 'visualizar_projetos'
  | 'escolher_projeto_viz'
  | 'mostrar_detalhes_projeto'

  // Progresso Ponderado
  | 'progresso_escolher_projeto'
  | 'progresso_escolher_pavimento'
  | 'progresso_escolher_etapa'

  | 'fim';

interface FlowState {
  step: FlowStep;
  mode: 'notif_manha' | 'notif_noite' | 'edit' | null;
  periodo?: 'manha' | 'noite';
  projectCode?: string;
  projectData: Partial<ProjectData>;
  availableAtribuicoes?: Array<{
    id: string;  // eng_projeto_id
    codigo: string;
    cliente: string;
    area: string;
    area_id: string;  // UUID da area
    status: string;
    projeto_id: string;  // UUID do projeto
  }>;
  selectedAtribuicaoId?: string;  // eng_projeto_id selecionado
  selectedAreaId?: string;  // area_id selecionado
  engineerName?: string;
  editField?: string;
  originalValue?: string;
  // Dados temporarios do progresso ponderado
  selectedProjetoId?: string;
  selectedProjetoCodigo?: string;
  pavimentosDisponiveis?: any[];
  etapasDisponiveis?: any[];
  selectedPavimentoId?: string;
  selectedPavimentoNome?: string;
  // Dados temporarios das notificacoes
  statusAtual?: number;  // status_id
  previsaoTexto?: string;
  feitoTexto?: string;
  teveRetrabalho?: boolean;
  motivoRetrabalho?: string;
  observacoesTexto?: string;
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
  private supabase;

  constructor(whatsapp: string, engineerName?: string) {
    this.whatsapp = whatsapp;
    this.state = {
      step: 'inicio',
      mode: null,
      projectData: {},
      engineerName: engineerName || 'Engenheiro' // Nome padrão (não usado mais, mantido por compatibilidade)
    };
    this.sheetService = getEngineerSheetService();
    this.supabase = getSupabaseService();
  }

  // =====================================================
  // MÉTODOS AUXILIARES: Buscar Atribuições
  // =====================================================

  /**
   * Busca atribuições do engenheiro (do Supabase ou planilha)
   */
  private async buscarAtribuicoesEngenheiro(): Promise<Array<{
    id: string;
    codigo: string;
    cliente: string;
    area: string;
    status: string;
    projeto_id: string;
  }>> {
    console.log('🔍 [DEBUG] buscarAtribuicoesEngenheiro() iniciado');
    console.log('🔍 [DEBUG] WhatsApp:', this.whatsapp);
    console.log('🔍 [DEBUG] Supabase conectado?', this.supabase.isConnected());

    // Tentar buscar do Supabase primeiro
    if (this.supabase.isConnected()) {
      try {
        console.log('🔍 [DEBUG] Buscando engenheiro no Supabase...');
        const engenheiro = await this.supabase.buscarEngenheiroPorWhatsapp(this.whatsapp);
        console.log('🔍 [DEBUG] Engenheiro encontrado?', engenheiro ? 'SIM' : 'NÃO');

        if (engenheiro) {
          console.log('🔍 [DEBUG] eng_id:', engenheiro.eng_id);
          console.log('🔍 [DEBUG] Buscando atribuições...');
          const atribuicoes = await this.supabase.listarAtribuicoesEngenheiro(engenheiro.eng_id);
          console.log('🔍 [DEBUG] Atribuições encontradas:', atribuicoes.length);
          console.log('🔍 [DEBUG] Atribuições:', JSON.stringify(atribuicoes, null, 2));

          // Enriquecer com dados de projeto, área e status
          const atribuicoesEnriquecidas = [];
          for (const atrib of atribuicoes) {
            console.log('🔍 [DEBUG] Processando atribuição:', atrib.id);
            const projeto = await this.supabase.buscarProjetoPorId(atrib.projeto_id);
            console.log('🔍 [DEBUG] Projeto:', projeto?.codigo_projeto);
            const area = await this.supabase.buscarAreaPorId(atrib.area_id);
            console.log('🔍 [DEBUG] Área:', area?.nome);
            const status = atrib.status_id ? await this.supabase.buscarStatusPorId(atrib.status_id) : null;
            console.log('🔍 [DEBUG] Status:', status?.descricao);

            atribuicoesEnriquecidas.push({
              id: atrib.id,  // eng_projeto_id
              codigo: projeto?.codigo_projeto || '',
              cliente: projeto?.cliente || '',
              area: area?.descricao || '',
              area_id: atrib.area_id,
              status: status?.descricao || '',
              projeto_id: atrib.projeto_id
            });
          }

          console.log('🔍 [DEBUG] Atribuições enriquecidas:', atribuicoesEnriquecidas.length);
          return atribuicoesEnriquecidas;
        } else {
          console.log('❌ [DEBUG] Engenheiro não encontrado no Supabase');
        }
      } catch (error: any) {
        console.error('❌ Erro ao buscar atribuições do Supabase:', error);
        console.error('❌ Stack:', error.stack);
        // Fallback para planilha
      }
    }

    // Fallback: buscar da planilha
    const projects = await this.sheetService.listAllProjects();
    return projects.map(proj => ({
      id: '',  // Não temos eng_projeto_id da planilha
      codigo: proj.codigo,
      cliente: proj.cliente,
      area: proj.area || '',
      status: proj.status || '',
      projeto_id: ''  // Não temos projeto_id da planilha
    }));
  }

  /**
   * Agrupa atribuições por código de projeto (para mostrar projetos únicos)
   */
  private agruparAtribuicoesPorProjeto(atribuicoes: Array<{ codigo: string, area: string, [key: string]: any }>): Array<{
    codigo: string;
    cliente: string;
    areas: string[];
    status: string;
    atribuicoes: typeof atribuicoes;
  }> {
    const grupos = new Map<string, typeof atribuicoes>();

    atribuicoes.forEach(atrib => {
      if (!grupos.has(atrib.codigo)) {
        grupos.set(atrib.codigo, []);
      }
      grupos.get(atrib.codigo)!.push(atrib);
    });

    return Array.from(grupos.entries()).map(([codigo, atribs]) => ({
      codigo,
      cliente: atribs[0]?.cliente || '',
      areas: atribs.map(a => a.area).filter(Boolean),
      status: atribs[0]?.status || '',
      atribuicoes: atribs
    }));
  }

  // =====================================================
  // PROCESSAR MENSAGEM
  // =====================================================

  async processarMensagem(mensagem: string): Promise<FlowResult> {
    try {
      const msg = mensagem.trim();

      // ═══════════════════════════════════════════
      // COMANDO: VOLTAR
      // ═══════════════════════════════════════════
      if (msg.toLowerCase() === 'voltar' || msg === '0') {
        return this.voltarPasso();
      }

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

        // Notificacao Manha
        case 'escolher_projeto_manha':
          return await this.stepEscolherProjetoManha(msg);
        case 'escolher_area_manha':
          return await this.stepEscolherAreaManha(msg); // Processa escolha do projeto
        case 'status_atual_manha':
          return await this.stepStatusAtualManha(msg);
        case 'previsao_dia':
          return await this.stepPrevisaoDia(msg);

        // Notificacao Noite
        case 'escolher_projeto_noite':
          return await this.stepEscolherProjetoNoite(msg);
        case 'escolher_area_noite':
          return await this.stepEscolherAreaNoite(msg); // Processa escolha do projeto
        case 'feito_dia':
          return await this.stepFeitoDia(msg);
        case 'retrabalho_pergunta':
          return await this.stepRetrabalhoPergunta(msg);
        case 'retrabalho_motivo':
          return await this.stepRetrabalhoMotivo(msg);
        case 'observacoes_pergunta':
          return await this.stepObservacoesPergunta(msg);
        case 'observacoes_texto':
          return await this.stepObservacoesTexto(msg);

        // Edicao
        case 'escolher_projeto_edicao':
          return await this.stepEscolherProjetoEdicao(msg);
        case 'escolher_area_edicao':
          return await this.stepEscolherAreaEdicao(msg); // Não usado, mantido para compatibilidade
        case 'escolher_campo':
          return await this.stepEscolherCampo(msg);
        case 'novo_valor':
          return await this.stepNovoValor(msg);

        case 'confirmacao':
          return await this.stepConfirmacao(msg);

        // Visualizacao
        case 'visualizar_projetos':
          return await this.stepVisualizarProjetos();
        case 'escolher_projeto_viz':
          return await this.stepEscolherProjetoViz(msg);
        case 'mostrar_detalhes_projeto':
          return { mensagem: 'Digite "menu" para voltar', finalizado: true };

        // Progresso Ponderado
        case 'progresso_escolher_projeto':
          return await this.stepProgressoEscolherProjeto(msg);
        case 'progresso_escolher_pavimento':
          return await this.stepProgressoEscolherPavimento(msg);
        case 'progresso_escolher_etapa':
          return await this.stepProgressoEscolherEtapa(msg);

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
    // O menu já foi mostrado pelo messageHandler
    // Apenas aguardar escolha (1, 2 ou 3)
    this.state.step = 'escolher_acao';
    return { mensagem: '', finalizado: false };
  }

  private async stepEscolherAcao(msg: string): Promise<FlowResult> {
    const opcao = msg.trim();

    if (opcao === '1') {
      // Notificacao Matinal
      this.state.mode = 'notif_manha';
      this.state.periodo = 'manha';
      this.state.step = 'escolher_projeto_manha';
      return await this.stepEscolherProjetoManha('');

    } else if (opcao === '2') {
      // Notificacao Noturna
      this.state.mode = 'notif_noite';
      this.state.periodo = 'noite';
      this.state.step = 'escolher_projeto_noite';
      return await this.stepEscolherProjetoNoite('');

    } else if (opcao === '3') {
      // Editar projeto
      this.state.mode = 'edit';
      this.state.step = 'escolher_projeto_edicao';
      return await this.stepEscolherProjetoEdicao('');

    } else if (opcao === '4') {
      // Visualizar projetos
      this.state.step = 'visualizar_projetos';
      return await this.stepVisualizarProjetos();

    } else if (opcao === '5') {
      // Marcar etapa concluída (progresso ponderado)
      this.state.step = 'progresso_escolher_projeto';
      return await this.stepProgressoEscolherProjeto('');

    } else {
      return {
        mensagem: '❌ Opção inválida. Digite *1*, *2*, *3*, *4* ou *5*.',
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

    // Buscar projetos agrupados novamente
    const atribuicoes = this.state.availableAtribuicoes || await this.buscarAtribuicoesEngenheiro();
    const projetosAgrupados = this.agruparAtribuicoesPorProjeto(atribuicoes);

    if (isNaN(numero) || numero < 1 || numero > projetosAgrupados.length) {
      return {
        mensagem: `❌ Número inválido. Digite um número entre 1 e ${projetosAgrupados.length}.`,
        finalizado: false
      };
    }

    const selectedProjeto = projetosAgrupados[numero - 1];
    this.state.projectCode = selectedProjeto.codigo;

    // Se houver múltiplas áreas, escolher qual editar
    if (selectedProjeto.areas.length > 1) {
      // Armazenar atribuições deste projeto
      const atribsDoProjeto = atribuicoes.filter(a => a.codigo === selectedProjeto.codigo);
      this.state.availableAtribuicoes = atribsDoProjeto;

      // Por enquanto, editar a primeira atribuição
      // TODO: Permitir escolher qual área editar
      this.state.selectedAtribuicaoId = atribsDoProjeto[0]?.id || '';

      let mensagem = `✅ Projeto *${selectedProjeto.codigo}* selecionado\n\n`;
      mensagem += `📊 Cliente: ${selectedProjeto.cliente}\n`;
      mensagem += `🏢 Áreas: ${selectedProjeto.areas.join(', ')}\n\n`;
      mensagem += `ℹ️ Este projeto tem ${selectedProjeto.areas.length} área(s).\n`;
      mensagem += `Editando a primeira área: *${selectedProjeto.areas[0]}*\n\n`;
      mensagem += `📁 *Qual categoria deseja editar?*\n\n`;
      mensagem += `1️⃣ *Dados Cadastrais*\n`;
      mensagem += `   Cliente, Contato, Obra, Área, Tipo\n\n`;
      mensagem += `2️⃣ *Datas e Prazos*\n`;
      mensagem += `   Dias estimados, Previsão interna, Data final cliente\n\n`;
      mensagem += `3️⃣ *Status e Execução*\n`;
      mensagem += `   Status do projeto, Etapa, % executado\n\n`;
      mensagem += `_Digite o número da categoria_`;

      this.state.step = 'escolher_categoria';
      return { mensagem, finalizado: false };
    }

    // Uma única área - buscar dados
    const atribuicao = atribuicoes.find(a => a.codigo === selectedProjeto.codigo);
    if (atribuicao) {
      this.state.selectedAtribuicaoId = atribuicao.id;
    }

    // Buscar dados completos (da planilha como fallback)
    const projectData = await this.sheetService.getProject(selectedProjeto.codigo, selectedProjeto.areas[0]);
    if (projectData) {
      this.state.projectData = projectData;
    }

    this.state.step = 'escolher_categoria';

    let mensagem = `✅ Projeto *${selectedProjeto.codigo}* selecionado\n\n`;
    mensagem += `📊 Cliente: ${selectedProjeto.cliente}\n`;
    mensagem += `🏢 Área: ${selectedProjeto.areas[0]}\n\n`;
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
      this.state.mode = 'update_morning';
      this.state.periodo = 'manha';
      this.state.step = 'escolher_projeto_notif';

      // Buscar atribuições do engenheiro
      const atribuicoes = await this.buscarAtribuicoesEngenheiro();
      this.state.availableAtribuicoes = atribuicoes;

      if (atribuicoes.length === 0) {
        return {
          mensagem: '❌ Nenhum projeto encontrado.\n\nCadastre um novo projeto primeiro.',
          finalizado: true
        };
      }

      // Agrupar por projeto para mostrar
      const projetosAgrupados = this.agruparAtribuicoesPorProjeto(atribuicoes);

      let mensagem = `🌅 *Notificação Matinal*\n\n`;
      mensagem += `📋 Escolha o projeto:\n\n`;

      projetosAgrupados.forEach((proj, index) => {
        mensagem += `${index + 1}️⃣ *${proj.codigo}* - ${proj.cliente}\n`;
        if (proj.areas.length > 0) {
          mensagem += `   Áreas: ${proj.areas.join(', ')}\n`;
        }
        mensagem += `   Status: ${proj.status || 'N/A'}\n\n`;
      });

      mensagem += `_Digite o número do projeto_`;
      return { mensagem, finalizado: false };

    } else if (opcao === '2') {
      // Notificação da noite
      this.state.mode = 'update_night';
      this.state.periodo = 'noite';
      this.state.step = 'escolher_projeto_notif';

      // Buscar atribuições do engenheiro
      const atribuicoes = await this.buscarAtribuicoesEngenheiro();
      this.state.availableAtribuicoes = atribuicoes;

      if (atribuicoes.length === 0) {
        return {
          mensagem: '❌ Nenhum projeto encontrado.\n\nCadastre um novo projeto primeiro.',
          finalizado: true
        };
      }

      // Agrupar por projeto para mostrar
      const projetosAgrupados = this.agruparAtribuicoesPorProjeto(atribuicoes);

      let mensagem = `🌙 *Notificação Noturna*\n\n`;
      mensagem += `📋 Escolha o projeto:\n\n`;

      projetosAgrupados.forEach((proj, index) => {
        mensagem += `${index + 1}️⃣ *${proj.codigo}* - ${proj.cliente}\n`;
        if (proj.areas.length > 0) {
          mensagem += `   Áreas: ${proj.areas.join(', ')}\n`;
        }
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

    // Buscar projetos agrupados
    const atribuicoes = this.state.availableAtribuicoes || await this.buscarAtribuicoesEngenheiro();
    const projetosAgrupados = this.agruparAtribuicoesPorProjeto(atribuicoes);

    if (isNaN(numero) || numero < 1 || numero > projetosAgrupados.length) {
      return {
        mensagem: `❌ Número inválido. Digite um número entre 1 e ${projetosAgrupados.length}.`,
        finalizado: false
      };
    }

    const selectedProjeto = projetosAgrupados[numero - 1];
    this.state.projectCode = selectedProjeto.codigo;

    // Se houver múltiplas áreas, usar a primeira (ou permitir escolher depois)
    const atribsDoProjeto = atribuicoes.filter(a => a.codigo === selectedProjeto.codigo);
    if (atribsDoProjeto.length > 0) {
      // Usar primeira atribuição (ou permitir escolher depois)
      this.state.selectedAtribuicaoId = atribsDoProjeto[0].id;

      if (atribsDoProjeto.length > 1) {
        // Múltiplas áreas - por enquanto usar primeira
        // TODO: Permitir escolher qual área atualizar
      }
    }

    // Buscar dados completos (fallback para planilha)
    const projectData = await this.sheetService.getProject(selectedProjeto.codigo, selectedProjeto.areas[0]);
    if (projectData) {
      this.state.projectData = projectData;
    }

    let mensagem = `✅ Projeto *${selectedProjeto.codigo}* selecionado\n\n`;
    mensagem += `📊 Cliente: ${selectedProjeto.cliente}\n`;
    if (selectedProjeto.areas.length > 0) {
      mensagem += `🏢 Área: ${selectedProjeto.areas[0]}\n`;
      if (selectedProjeto.areas.length > 1) {
        mensagem += `   (Este projeto tem ${selectedProjeto.areas.length} áreas - atualizando a primeira)\n`;
      }
    }
    mensagem += `\n`;

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

    // NOVO FLUXO: Após preencher todas as datas, perguntar áreas que vai trabalhar
    // (pode ser múltiplas áreas)
    this.state.step = 'escolher_areas';

    let mensagem = `✅ Data final cliente: *${dateStr}*\n\n`;
    mensagem += `🏢 *Quais ÁREAS você vai trabalhar neste projeto?*\n\n`;
    mensagem += `Você pode escolher múltiplas áreas.\n`;
    mensagem += `Digite os números separados por vírgula (ex: 1,3,5)\n\n`;
    mensagem += this.formatOptions(AREAS_PROJETO);
    mensagem += `\n_Digite os números das áreas (ex: 1 ou 1,3,5)_`;

    return { mensagem, finalizado: false };
  }

  private async stepEscolherAreas(msg: string): Promise<FlowResult> {
    // Processar entrada: pode ser um número ou múltiplos números separados por vírgula
    const partes = msg.split(',').map(p => p.trim());
    const numeros: number[] = [];

    for (const parte of partes) {
      const num = parseInt(parte, 10);
      if (isNaN(num) || num < 1 || num > AREAS_PROJETO.length) {
        return {
          mensagem: `❌ Número inválido: ${parte}. Digite números entre 1 e ${AREAS_PROJETO.length}.`,
          finalizado: false
        };
      }
      numeros.push(num);
    }

    // Armazenar áreas selecionadas no state
    const areasSelecionadas = numeros.map(n => AREAS_PROJETO[n - 1]);
    (this.state as any).areasSelecionadas = areasSelecionadas;
    (this.state as any).areaIndex = 0; // Índice da área atual sendo processada

    // Se só uma área, ir direto para dados da área
    if (areasSelecionadas.length === 1) {
      (this.state as any).areaAtual = areasSelecionadas[0];
      this.state.step = 'dados_area';

      let mensagem = `✅ Área selecionada: *${areasSelecionadas[0]}*\n\n`;
      mensagem += `📅 *Digite a DATA DE INÍCIO para esta área*\n\n`;
      mensagem += `Formato: DD/MM/AAAA\n`;
      mensagem += `Exemplo: 15/01/2025\n\n`;
      mensagem += `_Digite a data de início_`;

      return { mensagem, finalizado: false };
    }

    // Múltiplas áreas: processar primeira área
    (this.state as any).areaAtual = areasSelecionadas[0];
    this.state.step = 'dados_area';

    let mensagem = `✅ Áreas selecionadas: ${areasSelecionadas.length}\n\n`;
    mensagem += `📋 Vamos preencher os dados de cada área:\n\n`;
    mensagem += `🏢 *Área 1 de ${areasSelecionadas.length}: ${areasSelecionadas[0]}*\n\n`;
    mensagem += `📅 *Digite a DATA DE INÍCIO para esta área*\n\n`;
    mensagem += `Formato: DD/MM/AAAA\n`;
    mensagem += `_Digite a data de início_`;

    return { mensagem, finalizado: false };
  }

  private async stepDadosArea(msg: string): Promise<FlowResult> {
    // Este step será chamado múltiplas vezes (uma por área)
    const areasSelecionadas = (this.state as any).areasSelecionadas || [];
    const areaIndex = (this.state as any).areaIndex || 0;
    const areaAtual = (this.state as any).areaAtual || areasSelecionadas[areaIndex];

    // Estado interno para rastrear qual dado está sendo preenchido
    const dadosAreaKey = `dados_area_${areaIndex}`;
    if (!(this.state as any)[dadosAreaKey]) {
      (this.state as any)[dadosAreaKey] = { area: areaAtual };
    }
    const dadosArea = (this.state as any)[dadosAreaKey];

    // Verificar qual campo está sendo preenchido
    if (!dadosArea.data_inicio) {
      // Preenchendo data de início
      const dateStr = msg.trim();
      if (!this.sheetService.validateDateFormat(dateStr)) {
        return {
          mensagem: '❌ Formato inválido. Use DD/MM/AAAA.',
          finalizado: false
        };
      }
      const date = this.sheetService.parseDate(dateStr);
      if (!date) {
        return {
          mensagem: '❌ Data inválida.',
          finalizado: false
        };
      }
      dadosArea.data_inicio = dateStr;

      let mensagem = `✅ Data de início: *${dateStr}*\n\n`;
      mensagem += `📅 *Digite a DATA PREVISTA para esta área*\n\n`;
      mensagem += `Formato: DD/MM/AAAA\n`;
      mensagem += `_Digite a data prevista_`;

      return { mensagem, finalizado: false };
    } else if (!dadosArea.data_prevista) {
      // Preenchendo data prevista
      const dateStr = msg.trim();
      if (!this.sheetService.validateDateFormat(dateStr)) {
        return {
          mensagem: '❌ Formato inválido. Use DD/MM/AAAA.',
          finalizado: false
        };
      }
      const date = this.sheetService.parseDate(dateStr);
      if (!date) {
        return {
          mensagem: '❌ Data inválida.',
          finalizado: false
        };
      }
      dadosArea.data_prevista = dateStr;

      let mensagem = `✅ Data prevista: *${dateStr}*\n\n`;
      mensagem += `📊 *Qual o STATUS inicial desta área?*\n\n`;
      mensagem += this.formatOptions(STATUS_PROJETO);
      mensagem += `\n_Digite o número da opção_`;

      return { mensagem, finalizado: false };
    } else if (!dadosArea.status) {
      // Preenchendo status
      const numero = parseInt(msg.trim(), 10);
      if (isNaN(numero) || numero < 1 || numero > STATUS_PROJETO.length) {
        return {
          mensagem: `❌ Número inválido. Digite um número entre 1 e ${STATUS_PROJETO.length}.`,
          finalizado: false
        };
      }
      dadosArea.status = STATUS_PROJETO[numero - 1];

      // Verificar se há mais áreas para processar
      const nextIndex = areaIndex + 1;
      if (nextIndex < areasSelecionadas.length) {
        // Próxima área
        (this.state as any).areaIndex = nextIndex;
        (this.state as any).areaAtual = areasSelecionadas[nextIndex];

        let mensagem = `✅ Área ${areaIndex + 1} completa!\n\n`;
        mensagem += `🏢 *Área ${nextIndex + 1} de ${areasSelecionadas.length}: ${areasSelecionadas[nextIndex]}*\n\n`;
        mensagem += `📅 *Digite a DATA DE INÍCIO para esta área*\n\n`;
        mensagem += `Formato: DD/MM/AAAA\n`;
        mensagem += `_Digite a data de início_`;

        return { mensagem, finalizado: false };
      } else {
        // Todas as áreas processadas, ir para confirmação
        this.state.step = 'confirmacao';

        let mensagem = `✅ Todas as áreas preenchidas!\n\n`;
        mensagem += `📋 *CONFIRMAÇÃO DO CADASTRO*\n\n`;
        mensagem += this.generateSummary();
        mensagem += `\n\n*Confirma os dados?*\n\n`;
        mensagem += `1️⃣ Sim, salvar\n`;
        mensagem += `2️⃣ Não, cancelar\n\n`;
        mensagem += `_Digite o número da opção_`;

        return { mensagem, finalizado: false };
      }
    }

    return {
      mensagem: '❌ Erro no fluxo de áreas.',
      finalizado: true,
      erro: 'Estado inválido'
    };
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
            this.state.engineerName || 'Engenheiro'
          );

          if (!engenheiro) {
            return {
              mensagem: `❌ Erro ao buscar/criar engenheiro`,
              finalizado: true,
              erro: 'Engenheiro não encontrado'
            };
          }

          // Criar projeto básico (sem engenheiro_id - novo schema)
          const projetoSalvo = await supabase.criarProjeto(
            this.state.projectCode!,
            this.state.projectData['Cliente']!,
            this.state.projectData['Descrição do projeto']
          );

          if (!projetoSalvo) {
            return {
              mensagem: `❌ Erro ao criar projeto no banco de dados`,
              finalizado: true,
              erro: 'Erro ao criar projeto no Supabase'
            };
          }

          console.log('✅ Projeto básico criado, criando atribuições...');

          // Criar atribuições para cada área selecionada
          const areasSelecionadas = (this.state as any).areasSelecionadas || [];
          const atribuicoesCriadas: string[] = [];
          const erros: string[] = [];

          for (let i = 0; i < areasSelecionadas.length; i++) {
            const dadosArea = (this.state as any)[`dados_area_${i}`];
            if (!dadosArea) {
              erros.push(`Área ${i + 1}: dados não encontrados`);
              continue;
            }

            // Mapear nome da área da planilha para código do banco
            // A lista AREAS_PROJETO tem nomes como "elétrica", "hidrossanitário"
            // O banco tem códigos como "E1", "H1", "CL1", etc.
            // Por enquanto, vamos buscar área por descrição ou criar mapeamento
            const areaNome = dadosArea.area.toLowerCase();

            // Mapeamento nome planilha → código banco
            // (Este mapeamento precisa ser ajustado conforme as áreas reais do banco)
            const areaMap: Record<string, string> = {
              'elétrica': 'E1',
              'hidrossanitário': 'H1',
              'climatização': 'CL1',
              'telecom': 'T1',
              'gás': 'G1',
              'drenagem': 'H1', // Pode ser H ou outra categoria
              'rede de água': 'H1',
              'esgoto': 'H1',
              'solar fotovoltaico': 'E1',
              'hidráulico piscina': 'H1',
            };

            let areaCodigo = areaMap[areaNome] || 'E1'; // Fallback para E1

            // Tentar buscar área no banco para validar
            const supabase = getSupabaseService();
            const areaBD = await supabase.buscarAreaPorCodigo(areaCodigo);
            if (!areaBD) {
              console.warn(`⚠️ Área ${areaCodigo} não encontrada no banco, usando fallback`);
              // Tentar buscar por descrição (se método existir)
              // Por enquanto, usar o código mapeado mesmo
            }

            // Mapear status para código
            const statusNome = dadosArea.status.toLowerCase();
            const statusMap: Record<string, string> = {
              'em execução': 'EM_EXECUCAO',
              'em aprovação': 'EM_APROVACAO',
              'parado cliente': 'PARADO_CLIENTE',
              'parado tecpred': 'PARADO_TECPRED',
              'concluído': 'CONCLUIDO',
              'aguardando início': 'AGUARDANDO_INICIO',
              'aguardando inf. cliente': 'AGUARDANDO_INF_CLIENTE',
            };
            const statusCodigo = statusMap[statusNome] || 'AGUARDANDO_INICIO';

            const atribuicao = await supabase.atribuirAreaProjeto(
              engenheiro.eng_id,
              projetoSalvo.projeto_id,
              areaCodigo,
              dadosArea.data_inicio,
              dadosArea.data_prevista,
              statusCodigo
            );

            if (atribuicao) {
              atribuicoesCriadas.push(dadosArea.area);
              console.log(`✅ Atribuição criada: ${dadosArea.area}`);
            } else {
              erros.push(`Área ${dadosArea.area}: erro ao criar atribuição`);
            }
          }

          if (atribuicoesCriadas.length === 0) {
            return {
              mensagem: `❌ Erro ao criar atribuições: ${erros.join(', ')}`,
              finalizado: true,
              erro: 'Erro ao criar atribuições'
            };
          }

          console.log(`✅ ${atribuicoesCriadas.length} atribuição(ões) criada(s)`);

          let mensagem = `✅ *Projeto criado com sucesso!*\n\n`;
          mensagem += `🆔 Código: *${this.state.projectCode}*\n`;
          mensagem += `👤 Cliente: ${this.state.projectData['Cliente']}\n`;
          mensagem += `🏗️ Obra: ${this.state.projectData['Obra']}\n`;
          mensagem += `📊 Tipo: ${this.state.projectData['Tipo de Projeto']}\n\n`;
          mensagem += `🏢 *Áreas atribuídas:*\n`;
          atribuicoesCriadas.forEach((area, idx) => {
            const dadosArea = (this.state as any)[`dados_area_${idx}`];
            mensagem += `  • ${area}: Início ${dadosArea.data_inicio}, Previsão ${dadosArea.data_prevista}\n`;
          });
          mensagem += `\n📅 *Datas do projeto:*\n`;
          mensagem += `  • Início: ${this.state.projectData['Data de Início']}\n`;
          mensagem += `  • Previsão interna: ${this.state.projectData['Data de Previsão de entrega (interna)']}\n`;
          mensagem += `  • Final cliente: ${this.state.projectData['Data Final (acordado com o cliente)']}\n\n`;
          mensagem += `⏱️ *Prazos (calculados):*\n`;
          mensagem += `  • Prazo interno: ${prazoInterno} dias úteis\n`;
          mensagem += `  • Prazo cliente: ${prazoCliente} dias úteis\n\n`;

          if (erros.length > 0) {
            mensagem += `⚠️ *Avisos:*\n`;
            erros.forEach(erro => mensagem += `  • ${erro}\n`);
            mensagem += `\n`;
          }

          mensagem += `_✅ Dados salvos no banco de dados_\n`;
          mensagem += `_🔄 Planilhas serão atualizadas automaticamente (até 5min)_`;

          return { mensagem, finalizado: true };
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

          // Salvar APENAS no Supabase usando eng_projeto_id
          if (supabase.isConnected() && this.state.selectedAtribuicaoId) {
            // Mapear status para código
            const statusNome = morningData['Status do projeto'].toLowerCase();
            const statusMap: Record<string, string> = {
              'em execução': 'EM_EXECUCAO',
              'em aprovação': 'EM_APROVACAO',
              'parado cliente': 'PARADO_CLIENTE',
              'parado tecpred': 'PARADO_TECPRED',
              'concluído': 'CONCLUIDO',
              'aguardando início': 'AGUARDANDO_INICIO',
              'aguardando inf. cliente': 'AGUARDANDO_INF_CLIENTE',
            };
            const statusCodigo = statusMap[statusNome] || 'EM_EXECUCAO';

            const previsao = await supabase.registrarPrevisaoDia(
              this.state.selectedAtribuicaoId,
              morningData['Previsão para o dia'],
              statusCodigo
            );

            if (previsao) {
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
          } else if (!supabase.isConnected()) {
            // Fallback: planilha
            result = await this.sheetService.updateMorningData(this.state.projectCode!, morningData);
            if (result.success) {
              salvouPlanilha = true;
              mensagem = `✅ *Atualização matinal salva!*\n\n`;
              mensagem += `_⚠️ Configure Supabase para usar o banco de dados_`;
            } else {
              mensagem = `❌ Erro ao salvar atualização`;
            }
          } else {
            mensagem = `❌ Atribuição não encontrada. Tente novamente.`;
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

          // Salvar APENAS no Supabase usando eng_projeto_id
          if (supabase.isConnected() && this.state.selectedAtribuicaoId) {
            const feito = await supabase.registrarFeitoDia(
              this.state.selectedAtribuicaoId,
              nightData['Feito ao final do dia'],
              nightData['Necessitou de retrabalho?'] === 'sim',
              nightData['motivo da revisão']
            );

            if (feito) {
              salvouSupabase = true;
              mensagem = `✅ *Atualização noturna salva com sucesso!*\n\n`;
              mensagem += `🆔 Código: *${this.state.projectCode}*\n`;
              mensagem += `✔️ Feito: ${nightData['Feito ao final do dia']}\n`;
              mensagem += `🔄 Retrabalho: ${nightData['Necessitou de retrabalho?']}\n`;
              if (nightData['Observações']) {
                mensagem += `📝 Observações: ${nightData['Observações']}\n`;
              }
              mensagem += `\n_✅ Salvo no banco de dados_\n`;
              mensagem += `_🔄 Planilhas serão atualizadas automaticamente_`;
            } else {
              mensagem = `❌ Erro ao salvar atualização noturna`;
            }
          } else if (!supabase.isConnected()) {
            // Fallback: planilha
            result = await this.sheetService.updateNightData(this.state.projectCode!, nightData);
            if (result.success) {
              salvouPlanilha = true;
              mensagem = `✅ *Atualização noturna salva!*\n\n`;
              mensagem += `_⚠️ Configure Supabase para usar o banco de dados_`;
            } else {
              mensagem = `❌ Erro ao salvar atualização`;
            }
          } else {
            mensagem = `❌ Atribuição não encontrada. Tente novamente.`;
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
      summary += `🆔 *Código:* ${this.state.projectData['Código do Projeto'] || this.state.projectCode}\n`;
      summary += `👤 *Cliente:* ${this.state.projectData['Cliente']}\n`;
      summary += `📞 *Contato:* ${this.state.projectData['Contato']}\n`;
      summary += `🏗️ *Obra:* ${this.state.projectData['Obra']}\n`;

      // Mostrar áreas selecionadas
      const areasSelecionadas = (this.state as any).areasSelecionadas || [];
      if (areasSelecionadas.length > 0) {
        summary += `🏢 *Áreas:* ${areasSelecionadas.join(', ')}\n`;
        // Mostrar dados de cada área
        areasSelecionadas.forEach((area: string, idx: number) => {
          const dadosArea = (this.state as any)[`dados_area_${idx}`];
          if (dadosArea) {
            summary += `   • ${area}: Início ${dadosArea.data_inicio || 'N/A'}, Previsão ${dadosArea.data_prevista || 'N/A'}, Status ${dadosArea.status || 'N/A'}\n`;
          }
        });
      } else {
        summary += `🏢 *Área:* ${this.state.projectData['Área'] || 'N/A'}\n`;
      }

      summary += `📊 *Tipo:* ${this.state.projectData['Tipo de Projeto']}\n`;
      summary += `📝 *Descrição:* ${this.state.projectData['Descrição do projeto']}\n`;
      summary += `📅 *Data início projeto:* ${this.state.projectData['Data de Início']}\n`;
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

  // =====================================================
  // NOVOS STEPS: NOTIFICAÇÃO MATINAL
  // =====================================================

  private async stepEscolherProjetoManha(msg: string): Promise<FlowResult> {
    const atribuicoes = await this.buscarAtribuicoesEngenheiro();

    if (atribuicoes.length === 0) {
      return {
        mensagem: '❌ Você não tem projetos atribuídos.\n\nContate o dono da empresa.',
        finalizado: true
      };
    }

    this.state.availableAtribuicoes = atribuicoes;
    this.state.step = 'escolher_area_manha'; // Avançar step para receber escolha

    let mensagem = `🌅 *Notificação Matinal*\n\n`;
    mensagem += `📋 Escolha o projeto:\n\n`;

    atribuicoes.forEach((atrib, index) => {
      mensagem += `${index + 1}️⃣ *${atrib.codigo}* - ${atrib.cliente}\n`;
      mensagem += `   Área: ${atrib.area}\n`;
      mensagem += `   Status: ${atrib.status || 'N/A'}\n\n`;
    });

    mensagem += `_Digite o número do projeto_`;
    return { mensagem, finalizado: false };
  }

  private async stepEscolherAreaManha(msg: string): Promise<FlowResult> {
    const escolha = parseInt(msg.trim()) - 1;

    if (isNaN(escolha) || escolha < 0 || escolha >= (this.state.availableAtribuicoes?.length || 0)) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.state.availableAtribuicoes?.length || 0}.`,
        finalizado: false
      };
    }

    const atribuicao = this.state.availableAtribuicoes![escolha];
    this.state.selectedAtribuicaoId = atribuicao.id;
    this.state.projectCode = atribuicao.codigo;

    // Prosseguir para status
    this.state.step = 'status_atual_manha';
    return await this.stepStatusAtualManha('');
  }

  private async stepStatusAtualManha(msg: string): Promise<FlowResult> {
    if (msg === '') {
      // Primeira vez, mostrar lista de status
      const statusList = await this.supabase.listarStatus();

      let mensagem = `📊 *Status Atual do Projeto*\n\n`;
      mensagem += `Qual o status atual?\n\n`;

      statusList.forEach((status, index) => {
        mensagem += `${index + 1}️⃣ ${status.descricao}\n`;
      });

      mensagem += `\n_Digite o número do status_`;

      // Armazenar lista para referência
      (this.state as any).statusList = statusList;
      return { mensagem, finalizado: false };
    }

    const escolha = parseInt(msg.trim()) - 1;
    const statusList = (this.state as any).statusList || [];

    if (isNaN(escolha) || escolha < 0 || escolha >= statusList.length) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${statusList.length}.`,
        finalizado: false
      };
    }

    this.state.statusAtual = statusList[escolha].status_id;
    this.state.step = 'previsao_dia';

    return {
      mensagem: `✅ Status: ${statusList[escolha].descricao}\n\n📝 *O que você pretende fazer hoje?*\n\n_Descreva brevemente a previsão para o dia_`,
      finalizado: false
    };
  }

  private async stepPrevisaoDia(msg: string): Promise<FlowResult> {
    const previsao = msg.trim();

    if (previsao.length < 5) {
      return {
        mensagem: '❌ Previsão muito curta. Digite pelo menos 5 caracteres.',
        finalizado: false
      };
    }

    this.state.previsaoTexto = previsao;

    // Salvar no Supabase
    const sucesso = await this.supabase.registrarPrevisaoDia(
      this.state.selectedAtribuicaoId!,
      this.state.statusAtual!,
      previsao
    );

    if (!sucesso) {
      return {
        mensagem: '❌ Erro ao salvar previsão. Tente novamente.',
        finalizado: true
      };
    }

    let mensagem = `✅ *Notificação Matinal Registrada!*\n\n`;
    mensagem += `📊 Projeto: ${this.state.projectCode}\n`;
    mensagem += `📝 Previsão: ${previsao}\n\n`;
    mensagem += `Tenha um ótimo dia de trabalho! 🚀`;

    return { mensagem, finalizado: true };
  }

  // =====================================================
  // NOVOS STEPS: NOTIFICAÇÃO NOTURNA
  // =====================================================

  private async stepEscolherProjetoNoite(msg: string): Promise<FlowResult> {
    const atribuicoes = await this.buscarAtribuicoesEngenheiro();

    if (atribuicoes.length === 0) {
      return {
        mensagem: '❌ Você não tem projetos atribuídos.\n\nContate o dono da empresa.',
        finalizado: true
      };
    }

    this.state.availableAtribuicoes = atribuicoes;
    this.state.step = 'escolher_area_noite'; // Avançar step para receber escolha

    let mensagem = `🌙 *Notificação Noturna*\n\n`;
    mensagem += `📋 Escolha o projeto:\n\n`;

    atribuicoes.forEach((atrib, index) => {
      mensagem += `${index + 1}️⃣ *${atrib.codigo}* - ${atrib.cliente}\n`;
      mensagem += `   Área: ${atrib.area}\n`;
      mensagem += `   Status: ${atrib.status || 'N/A'}\n\n`;
    });

    mensagem += `_Digite o número do projeto_`;
    return { mensagem, finalizado: false };
  }

  private async stepEscolherAreaNoite(msg: string): Promise<FlowResult> {
    const escolha = parseInt(msg.trim()) - 1;

    if (isNaN(escolha) || escolha < 0 || escolha >= (this.state.availableAtribuicoes?.length || 0)) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.state.availableAtribuicoes?.length || 0}.`,
        finalizado: false
      };
    }

    const atribuicao = this.state.availableAtribuicoes![escolha];
    this.state.selectedAtribuicaoId = atribuicao.id;
    this.state.projectCode = atribuicao.codigo;

    // Prosseguir para feito do dia
    this.state.step = 'feito_dia';

    return {
      mensagem: `✅ Projeto: *${atribuicao.codigo}*\n\n✔️ *O que foi feito hoje?*\n\n_Descreva o trabalho realizado no dia_`,
      finalizado: false
    };
  }

  private async stepFeitoDia(msg: string): Promise<FlowResult> {
    const feito = msg.trim();

    if (feito.length < 5) {
      return {
        mensagem: '❌ Descrição muito curta. Digite pelo menos 5 caracteres.',
        finalizado: false
      };
    }

    this.state.feitoTexto = feito;
    this.state.step = 'retrabalho_pergunta';

    return {
      mensagem: `✅ Feito registrado!\n\n🔄 *Teve retrabalho hoje?*\n\n1️⃣ Sim\n2️⃣ Não\n\n_Digite 1 ou 2_`,
      finalizado: false
    };
  }

  private async stepRetrabalhoPergunta(msg: string): Promise<FlowResult> {
    const resposta = msg.trim();

    if (resposta === '1') {
      // Teve retrabalho
      this.state.teveRetrabalho = true;
      this.state.step = 'retrabalho_motivo';

      let mensagem = `⚠️ *Motivo do Retrabalho*\n\n`;
      mensagem += `1️⃣ Erro de dimensionamento\n`;
      mensagem += `2️⃣ Mudança de requisitos\n`;
      mensagem += `3️⃣ Falta de informações\n`;
      mensagem += `4️⃣ Erro de comunicação\n`;
      mensagem += `5️⃣ Outro\n\n`;
      mensagem += `_Digite o número do motivo_`;

      return { mensagem, finalizado: false };

    } else if (resposta === '2') {
      // Não teve retrabalho
      this.state.teveRetrabalho = false;

      // Registrar dia SEM retrabalho (importante para calcular a taxa corretamente!)
      await this.supabase.registrarRetrabalho(
        this.state.selectedAtribuicaoId!,
        false, // necessitou_retrabalho = false
        null   // sem motivo
      );

      this.state.step = 'observacoes_pergunta';

      return {
        mensagem: `✅ Sem retrabalho!\n\n📝 *Quer adicionar observações?*\n\n1️⃣ Sim\n2️⃣ Não\n\n_Digite 1 ou 2_`,
        finalizado: false
      };

    } else {
      return {
        mensagem: '❌ Opção inválida. Digite *1* para Sim ou *2* para Não.',
        finalizado: false
      };
    }
  }

  private async stepRetrabalhoMotivo(msg: string): Promise<FlowResult> {
    const motivos = [
      'Erro de dimensionamento',
      'Mudança de requisitos',
      'Falta de informações',
      'Erro de comunicação',
      'Outro'
    ];

    const escolha = parseInt(msg.trim()) - 1;

    if (isNaN(escolha) || escolha < 0 || escolha >= motivos.length) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${motivos.length}.`,
        finalizado: false
      };
    }

    this.state.motivoRetrabalho = motivos[escolha];

    // Registrar retrabalho no Supabase
    await this.supabase.registrarRetrabalho(
      this.state.selectedAtribuicaoId!,
      true,
      motivos[escolha]
    );

    this.state.step = 'observacoes_pergunta';

    return {
      mensagem: `✅ Motivo registrado: ${motivos[escolha]}\n\n📝 *Quer adicionar observações?*\n\n1️⃣ Sim\n2️⃣ Não\n\n_Digite 1 ou 2_`,
      finalizado: false
    };
  }

  private async stepObservacoesPergunta(msg: string): Promise<FlowResult> {
    const resposta = msg.trim();

    if (resposta === '1') {
      // Quer adicionar observações
      this.state.step = 'observacoes_texto';

      return {
        mensagem: `📝 *Observações*\n\n_Digite suas observações sobre o dia de trabalho_`,
        finalizado: false
      };

    } else if (resposta === '2') {
      // Não quer observações
      this.state.observacoesTexto = undefined;

      // Salvar tudo e finalizar
      return await this.salvarNotificacaoNoturna();

    } else {
      return {
        mensagem: '❌ Opção inválida. Digite *1* para Sim ou *2* para Não.',
        finalizado: false
      };
    }
  }

  private async stepObservacoesTexto(msg: string): Promise<FlowResult> {
    const obs = msg.trim();

    if (obs.length < 3) {
      return {
        mensagem: '❌ Observação muito curta. Digite pelo menos 3 caracteres.',
        finalizado: false
      };
    }

    this.state.observacoesTexto = obs;

    // Salvar tudo e finalizar
    return await this.salvarNotificacaoNoturna();
  }

  private async salvarNotificacaoNoturna(): Promise<FlowResult> {
    // Salvar feito do dia (em projetos_previsao) e observações (em engenheiros_projetos)
    const sucesso = await this.supabase.atualizarFeitoDia(
      this.state.selectedAtribuicaoId!,
      this.state.feitoTexto!,
      this.state.observacoesTexto || null  // Apenas as observações, sem repetir o feito
    );

    if (!sucesso) {
      return {
        mensagem: '❌ Erro ao salvar notificação. Tente novamente.',
        finalizado: true
      };
    }

    let mensagem = `✅ *Notificação Noturna Registrada!*\n\n`;
    mensagem += `📊 Projeto: ${this.state.projectCode}\n`;
    mensagem += `✔️ Feito: ${this.state.feitoTexto}\n`;

    if (this.state.teveRetrabalho) {
      mensagem += `🔄 Retrabalho: Sim (${this.state.motivoRetrabalho})\n`;
    } else {
      mensagem += `🔄 Retrabalho: Não\n`;
    }

    if (this.state.observacoesTexto) {
      mensagem += `📝 Observações: ${this.state.observacoesTexto}\n`;
    }

    mensagem += `\nDescanse bem! 🌙`;

    return { mensagem, finalizado: true };
  }

  // =====================================================
  // NOVOS STEPS: EDIÇÃO DE PROJETOS
  // =====================================================

  private async stepEscolherProjetoEdicao(msg: string): Promise<FlowResult> {
    if (msg === '') {
      // Primeira vez, buscar projetos
      const atribuicoes = await this.buscarAtribuicoesEngenheiro();

      if (atribuicoes.length === 0) {
        return {
          mensagem: '❌ Você não tem projetos atribuídos.\n\nContate o dono da empresa.',
          finalizado: true
        };
      }

      this.state.availableAtribuicoes = atribuicoes;
      // Não muda o step aqui, a próxima mensagem será processada aqui mesmo

      let mensagem = `✏️ *Editar Projeto*\n\n`;
      mensagem += `📋 Escolha o projeto:\n\n`;

      atribuicoes.forEach((atrib, index) => {
        mensagem += `${index + 1}️⃣ *${atrib.codigo}* - ${atrib.cliente}\n`;
        mensagem += `   Área: ${atrib.area}\n`;
        mensagem += `   Status: ${atrib.status || 'N/A'}\n\n`;
      });

      mensagem += `_Digite o número do projeto_`;
      return { mensagem, finalizado: false };
    }

    // Processar a escolha do projeto
    const escolha = parseInt(msg.trim()) - 1;

    if (isNaN(escolha) || escolha < 0 || escolha >= (this.state.availableAtribuicoes?.length || 0)) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.state.availableAtribuicoes?.length || 0}.`,
        finalizado: false
      };
    }

    const atribuicao = this.state.availableAtribuicoes![escolha];
    this.state.selectedAtribuicaoId = atribuicao.id;
    this.state.projectCode = atribuicao.codigo;

    // Agora sim, avançar para escolher campo
    this.state.step = 'escolher_campo';
    return await this.stepEscolherCampo('');
  }

  private async stepEscolherAreaEdicao(msg: string): Promise<FlowResult> {
    // Este step não é necessário pois já escolhemos a atribuição específica
    // Mantido para compatibilidade
    return await this.stepEscolherCampo('');
  }

  private async stepEscolherCampo(msg: string): Promise<FlowResult> {
    if (msg === '') {
      // Primeira vez, mostrar campos
      let mensagem = `✏️ *Editar Projeto: ${this.state.projectCode}*\n\n`;
      mensagem += `📋 Escolha o campo para editar:\n\n`;
      mensagem += `1️⃣ Status do projeto\n`;
      mensagem += `2️⃣ Percentual de andamento (%)\n`;
      mensagem += `3️⃣ Data de início\n`;
      mensagem += `4️⃣ Data prevista de conclusão\n`;
      mensagem += `5️⃣ Observações\n\n`;
      mensagem += `_Digite o número do campo_`;

      return { mensagem, finalizado: false };
    }

    const campos = ['status_id', 'percentual_andamento', 'data_inicio', 'data_prevista', 'observacoes'];
    const nomeCampos = ['Status', 'Percentual', 'Data início', 'Data prevista', 'Observações'];
    const escolha = parseInt(msg.trim()) - 1;

    if (isNaN(escolha) || escolha < 0 || escolha >= campos.length) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${campos.length}.`,
        finalizado: false
      };
    }

    this.state.editField = campos[escolha];
    (this.state as any).editFieldName = nomeCampos[escolha];
    this.state.step = 'novo_valor';

    return await this.stepNovoValor('');
  }

  private async stepNovoValor(msg: string): Promise<FlowResult> {
    const campo = this.state.editField!;

    if (msg === '') {
      // Primeira vez, pedir o novo valor
      let mensagem = `✏️ *Editar: ${(this.state as any).editFieldName}*\n\n`;

      if (campo === 'status_id') {
        const statusList = await this.supabase.listarStatus();
        (this.state as any).statusList = statusList;

        mensagem += `Escolha o novo status:\n\n`;
        statusList.forEach((status, index) => {
          mensagem += `${index + 1}️⃣ ${status.descricao}\n`;
        });
        mensagem += `\n_Digite o número do status_`;

      } else if (campo === 'percentual_andamento') {
        mensagem += `Digite o novo percentual (0-100):\n\n`;
        mensagem += `_Digite apenas o número (ex: 75)_`;

      } else if (campo === 'data_inicio' || campo === 'data_prevista') {
        mensagem += `Digite a nova data:\n\n`;
        mensagem += `_Formato: DD/MM/AAAA (ex: 25/01/2026)_`;

      } else if (campo === 'observacoes') {
        mensagem += `Digite as novas observações:\n\n`;
        mensagem += `_Texto livre_`;
      }

      return { mensagem, finalizado: false };
    }

    // Validar e processar o valor
    let novoValor: any;
    let valorFormatado: string;

    if (campo === 'status_id') {
      const statusList = (this.state as any).statusList || [];
      const escolha = parseInt(msg.trim()) - 1;

      if (isNaN(escolha) || escolha < 0 || escolha >= statusList.length) {
        return {
          mensagem: `❌ Opção inválida. Digite um número entre 1 e ${statusList.length}.`,
          finalizado: false
        };
      }

      novoValor = statusList[escolha].status_id;
      valorFormatado = statusList[escolha].descricao;

    } else if (campo === 'percentual_andamento') {
      const percentual = parseFloat(msg.trim());

      if (isNaN(percentual) || percentual < 0 || percentual > 100) {
        return {
          mensagem: '❌ Percentual inválido. Digite um número entre 0 e 100.',
          finalizado: false
        };
      }

      novoValor = percentual;
      valorFormatado = `${percentual}%`;

    } else if (campo === 'data_inicio' || campo === 'data_prevista') {
      // Validar formato DD/MM/AAAA
      const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const match = msg.trim().match(regex);

      if (!match) {
        return {
          mensagem: '❌ Data inválida. Use o formato DD/MM/AAAA (ex: 25/01/2026).',
          finalizado: false
        };
      }

      // Converter para YYYY-MM-DD
      const [_, dia, mes, ano] = match;
      novoValor = `${ano}-${mes}-${dia}`;
      valorFormatado = msg.trim();

    } else if (campo === 'observacoes') {
      if (msg.trim().length < 3) {
        return {
          mensagem: '❌ Observações muito curtas. Digite pelo menos 3 caracteres.',
          finalizado: false
        };
      }

      novoValor = msg.trim();
      valorFormatado = msg.trim();
    }

    (this.state as any).novoValor = novoValor;
    (this.state as any).valorFormatado = valorFormatado;
    this.state.step = 'confirmacao';

    let mensagem = `✅ *Confirmação*\n\n`;
    mensagem += `📊 Projeto: ${this.state.projectCode}\n`;
    mensagem += `✏️ Campo: ${(this.state as any).editFieldName}\n`;
    mensagem += `📝 Novo valor: ${valorFormatado}\n\n`;
    mensagem += `Confirmar alteração?\n\n`;
    mensagem += `1️⃣ Sim\n`;
    mensagem += `2️⃣ Não\n\n`;
    mensagem += `_Digite 1 ou 2_`;

    return { mensagem, finalizado: false };
  }

  private async stepConfirmacao(msg: string): Promise<FlowResult> {
    const resposta = msg.trim();

    if (resposta === '1') {
      // Confirmar e salvar
      const campo = this.state.editField!;
      const novoValor = (this.state as any).novoValor;

      let sucesso = false;

      if (campo === 'status_id') {
        // Usar método específico para status
        const statusList = (this.state as any).statusList || [];
        const status = statusList.find((s: any) => s.status_id === novoValor);
        sucesso = await this.supabase.atualizarStatusAtribuicao(
          this.state.selectedAtribuicaoId!,
          status.codigo
        );
      } else {
        // Atualizar campo genérico
        sucesso = await this.supabase.atualizarCampoAtribuicao(
          this.state.selectedAtribuicaoId!,
          campo as any,
          novoValor
        );
      }

      if (!sucesso) {
        return {
          mensagem: '❌ Erro ao salvar alteração. Tente novamente.',
          finalizado: true
        };
      }

      let mensagem = `✅ *Alteração Salva!*\n\n`;
      mensagem += `📊 Projeto: ${this.state.projectCode}\n`;
      mensagem += `✏️ Campo: ${(this.state as any).editFieldName}\n`;
      mensagem += `📝 Novo valor: ${(this.state as any).valorFormatado}\n\n`;
      mensagem += `Projeto atualizado com sucesso! 🎉`;

      return { mensagem, finalizado: true };

    } else if (resposta === '2') {
      // Cancelar
      return {
        mensagem: '❌ Alteração cancelada.\n\nNenhuma modificação foi feita.',
        finalizado: true
      };

    } else {
      return {
        mensagem: '❌ Opção inválida. Digite *1* para confirmar ou *2* para cancelar.',
        finalizado: false
      };
    }
  }

  // =====================================================
  // VISUALIZAÇÃO DE PROJETOS
  // =====================================================

  /**
   * STEP: Visualizar Projetos
   * Lista todos os projetos do engenheiro com informações resumidas
   */
  private async stepVisualizarProjetos(): Promise<FlowResult> {
    const atribuicoes = await this.buscarAtribuicoesEngenheiro();

    if (atribuicoes.length === 0) {
      return {
        mensagem: '📭 Você não tem projetos atribuídos no momento.',
        finalizado: true
      };
    }

    let mensagem = `📊 *Meus Projetos (${atribuicoes.length})*\n\n`;

    atribuicoes.forEach((proj, idx) => {
      mensagem += `${idx + 1}️⃣ *${proj.codigo}* - ${proj.cliente}\n`;
      mensagem += `   📦 Área: ${proj.area}\n`;
      mensagem += `   📈 Status: ${proj.status}\n`;
      mensagem += `   ⚡ Andamento: ${proj.percentual || 0}%\n`;
      if (proj.data_prevista) {
        const data = new Date(proj.data_prevista).toLocaleDateString('pt-BR');
        mensagem += `   📅 Previsto: ${data}\n`;
      }
      mensagem += `\n`;
    });

    mensagem += `_Digite o número para ver detalhes completos_\n`;
    mensagem += `_Ou "menu" para voltar_`;

    this.state.availableAtribuicoes = atribuicoes;
    this.state.step = 'escolher_projeto_viz';

    return { mensagem, finalizado: false };
  }

  /**
   * STEP: Escolher Projeto para Visualização
   * Permite escolher um projeto para ver detalhes completos
   */
  private async stepEscolherProjetoViz(msg: string): Promise<FlowResult> {
    const escolha = parseInt(msg.trim()) - 1;

    if (isNaN(escolha) || escolha < 0 || escolha >= (this.state.availableAtribuicoes?.length || 0)) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.state.availableAtribuicoes?.length || 0}`,
        finalizado: false
      };
    }

    const atribuicao = this.state.availableAtribuicoes![escolha];
    return await this.mostrarDetalhesProjeto(atribuicao);
  }

  /**
   * Mostra detalhes completos de um projeto
   */
  private async mostrarDetalhesProjeto(atribuicao: any): Promise<FlowResult> {
    let msg = `📊 *Detalhes do Projeto*\n\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📋 *Projeto:* ${atribuicao.codigo}\n`;
    msg += `👤 *Cliente:* ${atribuicao.cliente}\n`;
    msg += `📦 *Área:* ${atribuicao.area}\n\n`;

    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📈 *Status Atual*\n\n`;
    msg += `📊 Status: ${atribuicao.status}\n`;
    msg += `⚡ Andamento: ${atribuicao.percentual || 0}%\n\n`;

    if (atribuicao.data_inicio || atribuicao.data_prevista || atribuicao.data_conclusao) {
      msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `📅 *Datas*\n\n`;

      if (atribuicao.data_inicio) {
        const data = new Date(atribuicao.data_inicio).toLocaleDateString('pt-BR');
        msg += `📅 Início: ${data}\n`;
      }
      if (atribuicao.data_prevista) {
        const data = new Date(atribuicao.data_prevista).toLocaleDateString('pt-BR');
        msg += `⏰ Prazo: ${data}\n`;
      }
      if (atribuicao.data_conclusao) {
        const data = new Date(atribuicao.data_conclusao).toLocaleDateString('pt-BR');
        msg += `✅ Concluído: ${data}\n`;
      }
      msg += `\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `_Digite "menu" para voltar ao menu principal_`;

    this.state.step = 'mostrar_detalhes_projeto';

    return { mensagem: msg, finalizado: true };
  }

  // =====================================================
  // STEPS: PROGRESSO PONDERADO (MARCAR ETAPAS)
  // =====================================================

  /**
   * STEP: Escolher projeto para marcar etapa concluída
   * Lista projetos que possuem pavimentos configurados
   */
  private async stepProgressoEscolherProjeto(msg: string): Promise<FlowResult> {
    // Primeira chamada (msg vazio): listar projetos
    if (!msg) {
      const atribuicoes = await this.buscarAtribuicoesEngenheiro();

      if (atribuicoes.length === 0) {
        return {
          mensagem: '📭 Você não tem projetos atribuídos no momento.',
          finalizado: true
        };
      }

      // Filtrar projetos únicos (pode ter múltiplas áreas)
      const projetosUnicos = new Map<string, typeof atribuicoes[0]>();
      atribuicoes.forEach(a => {
        if (!projetosUnicos.has(a.projeto_id)) {
          projetosUnicos.set(a.projeto_id, a);
        }
      });

      const projetos = Array.from(projetosUnicos.values());
      this.state.availableAtribuicoes = projetos;

      let mensagem = `📐 *Marcar Etapa Concluída*\n\n`;
      mensagem += `📋 Escolha o projeto:\n\n`;

      projetos.forEach((proj, idx) => {
        mensagem += `${idx + 1}️⃣ *${proj.codigo}* - ${proj.cliente}\n`;
      });

      mensagem += `\n_Digite o número do projeto_`;

      this.state.step = 'progresso_escolher_projeto';
      return { mensagem, finalizado: false };
    }

    // Segunda chamada: processar escolha
    const escolha = parseInt(msg.trim()) - 1;

    if (isNaN(escolha) || escolha < 0 || escolha >= (this.state.availableAtribuicoes?.length || 0)) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.state.availableAtribuicoes?.length || 0}`,
        finalizado: false
      };
    }

    const projeto = this.state.availableAtribuicoes![escolha];
    this.state.selectedProjetoId = projeto.projeto_id;
    this.state.selectedProjetoCodigo = projeto.codigo;

    // Buscar pavimentos do projeto
    const pavimentos = await this.supabase.buscarPavimentosComEtapas(projeto.projeto_id);

    if (pavimentos.length === 0) {
      return {
        mensagem: `⚠️ O projeto *${projeto.codigo}* ainda não tem pavimentos configurados.\n\nPeça ao gestor para configurar os pavimentos e etapas pelo dashboard.\n\n_Digite "menu" para voltar_`,
        finalizado: true
      };
    }

    // Filtrar pavimentos que ainda têm etapas pendentes
    const pavimentosComPendencias = pavimentos.filter(
      (p: any) => p.etapas.some((e: any) => !e.concluida)
    );

    if (pavimentosComPendencias.length === 0) {
      const progresso = await this.supabase.buscarProgressoPonderado(projeto.projeto_id);
      return {
        mensagem: `✅ Todas as etapas do projeto *${projeto.codigo}* já estão concluídas!\n\n📊 Progresso ponderado: ${progresso ?? 0}%\n\n_Digite "menu" para voltar_`,
        finalizado: true
      };
    }

    this.state.pavimentosDisponiveis = pavimentosComPendencias;
    this.state.step = 'progresso_escolher_pavimento';

    let mensagem = `📐 *${projeto.codigo}* - Pavimentos\n\n`;

    pavimentosComPendencias.forEach((pav: any, idx: number) => {
      const totalEtapas = pav.etapas.length;
      const concluidas = pav.etapas.filter((e: any) => e.concluida).length;
      mensagem += `${idx + 1}️⃣ *${pav.nome}* (peso ${pav.peso}%)\n`;
      mensagem += `   ${concluidas}/${totalEtapas} etapas concluídas\n\n`;
    });

    mensagem += `_Digite o número do pavimento_`;

    return { mensagem, finalizado: false };
  }

  /**
   * STEP: Escolher pavimento e listar etapas pendentes
   */
  private async stepProgressoEscolherPavimento(msg: string): Promise<FlowResult> {
    const escolha = parseInt(msg.trim()) - 1;

    if (isNaN(escolha) || escolha < 0 || escolha >= (this.state.pavimentosDisponiveis?.length || 0)) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.state.pavimentosDisponiveis?.length || 0}`,
        finalizado: false
      };
    }

    const pavimento = this.state.pavimentosDisponiveis![escolha];
    this.state.selectedPavimentoId = pavimento.pavimento_id;
    this.state.selectedPavimentoNome = pavimento.nome;

    // Filtrar etapas pendentes
    const etapasPendentes = pavimento.etapas.filter((e: any) => !e.concluida);
    this.state.etapasDisponiveis = etapasPendentes;
    this.state.step = 'progresso_escolher_etapa';

    let mensagem = `📐 *${this.state.selectedProjetoCodigo}* > *${pavimento.nome}*\n\n`;
    mensagem += `📋 Etapas pendentes:\n\n`;

    etapasPendentes.forEach((etapa: any, idx: number) => {
      mensagem += `${idx + 1}️⃣ ${etapa.nome} (peso ${etapa.peso}%)\n`;
    });

    mensagem += `\n_Digite o número da etapa para marcar como concluída_`;

    return { mensagem, finalizado: false };
  }

  /**
   * STEP: Marcar etapa como concluída e mostrar resultado
   */
  private async stepProgressoEscolherEtapa(msg: string): Promise<FlowResult> {
    const escolha = parseInt(msg.trim()) - 1;

    if (isNaN(escolha) || escolha < 0 || escolha >= (this.state.etapasDisponiveis?.length || 0)) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.state.etapasDisponiveis?.length || 0}`,
        finalizado: false
      };
    }

    const etapa = this.state.etapasDisponiveis![escolha];

    // Marcar como concluída
    const sucesso = await this.supabase.marcarEtapaConcluida(etapa.etapa_id, true);

    if (!sucesso) {
      return {
        mensagem: `❌ Erro ao marcar etapa. Tente novamente ou digite "menu".`,
        finalizado: false
      };
    }

    // Buscar progresso atualizado (trigger já recalculou)
    const progresso = await this.supabase.buscarProgressoPonderado(this.state.selectedProjetoId!);

    let mensagem = `✅ Etapa marcada como concluída!\n\n`;
    mensagem += `📐 *${this.state.selectedProjetoCodigo}*\n`;
    mensagem += `🏗️ Pavimento: ${this.state.selectedPavimentoNome}\n`;
    mensagem += `✔️ Etapa: ${etapa.nome}\n\n`;
    mensagem += `📊 *Progresso ponderado: ${progresso ?? 0}%*\n\n`;
    mensagem += `_Digite "menu" para voltar ao menu principal_`;

    this.state.step = 'fim';

    return { mensagem, finalizado: true };
  }
}
