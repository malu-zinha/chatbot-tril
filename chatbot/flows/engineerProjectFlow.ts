// =====================================================
// FLOW: Gestão de Projetos de Engenharia
// =====================================================
// Fluxo conversacional para cadastrar novos projetos
// e atualizar projetos existentes diariamente
// =====================================================

import type { ProjectData, DailyExecutionData, MorningUpdateData, NightUpdateData, Project } from '../../integrations/sheets/engineerSheetService.ts';
import {
  getEngineerSheetService,
} from '../../integrations/sheets/engineerSheetService.ts';
import { getSupabaseService } from '../../integrations/supabase/supabaseService.ts';
import {
  filterEtapasPendentes,
  filterPavimentosPendentes,
  filterAreasPendentes,
  isProjetoTotalmenteConcluido,
} from '../../logic/execucao/filtros.ts';
import { parseMultiSelection, MultiSelectionError } from '../../logic/execucao/parseMultiSelection.ts';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

type FlowStep =
  | 'inicio'
  | 'escolher_acao'

  // Notificacao Manha
  | 'escolher_projeto_manha'
  | 'escolher_area_manha'
  | 'previsao_dia'

  // Notificacao Noite
  | 'escolher_projeto_noite'
  | 'escolher_area_noite'
  | 'feito_dia'
  | 'retrabalho_pergunta'
  | 'retrabalho_motivo'
  | 'observacoes_pergunta'
  | 'observacoes_texto'

  // Confirmacao geral
  | 'confirmacao'

  // Visualizacao
  | 'visualizar_projetos'
  | 'escolher_projeto_viz'
  | 'mostrar_detalhes_projeto'

  // Progresso Ponderado
  | 'progresso_escolher_projeto'
  | 'progresso_escolher_area'
  | 'progresso_escolher_pavimento'
  | 'progresso_escolher_etapa'
  | 'progresso_continuar'

  // Progresso Ponderado — Multi-seleção
  | 'progresso_modo_multiselecao'
  | 'progresso_sem_etapas_concluir'
  | 'progresso_multi_etapas_pavimento'
  | 'progresso_multi_etapas_selecionar'
  | 'progresso_multi_etapa_escolher'
  | 'progresso_multi_etapa_pavimentos'
  | 'progresso_multi_confirmar'

  // Progresso Ponderado (integrado na noite)
  | 'noite_etapa_pergunta'
  | 'noite_etapa_pavimento'
  | 'noite_etapa_escolher'
  | 'noite_etapa_mais'

  | 'fim';

interface StepSnapshot {
  step: FlowStep;
  data: Record<string, any>;
}

interface FlowState {
  step: FlowStep;
  stepHistory: FlowStep[];
  snapshotHistory?: StepSnapshot[];
  mode: 'notif_manha' | 'notif_noite' | 'create' | 'update_morning' | 'update_night' | null;
  periodo?: 'manha' | 'noite';
  projectCode?: string;
  projectData: Partial<ProjectData>;
  availableAtribuicoes?: Array<{
    id: string;  // eng_projeto_id
    codigo: string;
    cliente: string;
    area: string;
    area_id: string | number;  // UUID ou ID numérico da area
    status: string;
    projeto_id: string;  // UUID do projeto
    percentual?: number;
    data_prevista?: string;
  }>;
  selectedAtribuicaoId?: string;  // eng_projeto_id selecionado
  selectedAreaId?: string;  // area_id selecionado
  engineerName?: string;
  // Dados temporarios do progresso ponderado
  selectedProjetoId?: string;
  selectedProjetoCodigo?: string;
  areasDisponiveisProjeto?: Array<{ area_id: string | number; area: string }>;
  pavimentosDisponiveis?: any[];
  etapasDisponiveis?: any[];
  selectedPavimentoId?: string;
  selectedPavimentoNome?: string;
  // Dados temporarios das notificacoes
  statusAtual?: number | null;  // status_id (não usado — status deriva do ponderado)
  previsaoTexto?: string;
  feitoTexto?: string;
  teveRetrabalho?: boolean;
  motivoRetrabalho?: string;
  observacoesTexto?: string;
  // Multi-seleção (Fase 3)
  modoMultiSelecao?: 1 | 2;
  etapasNomesUnicos?: string[];
  etapaNomeSelecionado?: string;
  etapaIdsSelecionados?: string[];
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
      stepHistory: [],
      snapshotHistory: [],
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
    area_id: string | number;
    status: string;
    projeto_id: string;
    percentual?: number;
    data_prevista?: string;
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
            console.log('🔍 [DEBUG] Área:', area?.descricao);
            const status = atrib.status_id ? await this.supabase.buscarStatusPorId(atrib.status_id) : null;
            console.log('🔍 [DEBUG] Status:', status?.descricao);

            // Percentual: ponderado (etapas) se existir, senão andamento (status)
            const ponderado = await this.supabase.buscarProgressoPonderado(atrib.projeto_id);
            const percentualFinal = ponderado ?? atrib.percentual_andamento ?? 0;

            atribuicoesEnriquecidas.push({
              id: atrib.id,  // eng_projeto_id
              codigo: projeto?.codigo_projeto || '',
              cliente: projeto?.cliente || '',
              area: area?.descricao || '',
              area_id: atrib.area_id,
              status: status?.descricao || '',
              projeto_id: atrib.projeto_id,
              percentual: percentualFinal,
              data_prevista: atrib.data_prevista,
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
      area_id: '',  // Não temos area_id da planilha
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
      // COMANDOS GLOBAIS: MENU / VOLTAR / CANCELAR
      // ═══════════════════════════════════════════
      const lower = msg.toLowerCase();

      if (lower === 'menu') {
        this.resetToMenu();
        return await this.stepInicio();
      }

      if (lower === 'voltar' || msg === '0') {
        if (this.isTerminalStep(this.state.step)) {
          return {
            mensagem: 'ℹ️ Esta ação já foi registrada. Digite *menu* para voltar ao início.',
            finalizado: false
          };
        }
        if (this.popStep()) {
          // Se voltou à raiz, mostrar o menu do engenheiro inline
          if (this.state.step === 'escolher_acao' || this.state.step === 'inicio') {
            this.resetToMenu();
            this.goToStep('escolher_acao');
            return {
              mensagem: this.renderMenuEngenheiro(),
              finalizado: false
            };
          }
          // Re-renderizar o step anterior chamando seu handler com input vazio.
          // A maioria dos steps navegáveis (progresso_*, noite_etapa_*) já renderizam quando msg=''.
          return await this.processarMensagem('');
        }
        return this.cancelar();
      }

      if (lower === 'cancelar') {
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

        // Confirmacao geral
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
        case 'progresso_escolher_area':
          return await this.stepProgressoEscolherArea(msg);
        case 'progresso_escolher_pavimento':
          return await this.stepProgressoEscolherPavimento(msg);
        case 'progresso_escolher_etapa':
          return await this.stepProgressoEscolherEtapa(msg);
        case 'progresso_continuar':
          return await this.stepProgressoContinuar(msg);

        // Multi-seleção
        case 'progresso_modo_multiselecao':
          return await this.stepProgressoModoMultiselecao(msg);
        case 'progresso_sem_etapas_concluir':
          return await this.stepProgressoSemEtapasConcluir(msg);
        case 'progresso_multi_etapas_pavimento':
          return await this.stepProgressoMultiEtapasPavimento(msg);
        case 'progresso_multi_etapas_selecionar':
          return await this.stepProgressoMultiEtapasSelecionar(msg);
        case 'progresso_multi_etapa_escolher':
          return await this.stepProgressoMultiEtapaEscolher(msg);
        case 'progresso_multi_etapa_pavimentos':
          return await this.stepProgressoMultiEtapaPavimentos(msg);
        case 'progresso_multi_confirmar':
          return await this.stepProgressoMultiConfirmar(msg);

        // Progresso ponderado integrado na noite
        case 'noite_etapa_pergunta':
          return await this.stepNoiteEtapaPergunta(msg);
        case 'noite_etapa_pavimento':
          return await this.stepNoiteEtapaPavimento(msg);
        case 'noite_etapa_escolher':
          return await this.stepNoiteEtapaEscolher(msg);
        case 'noite_etapa_mais':
          return await this.stepNoiteEtapaMais(msg);

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
    this.goToStep('escolher_acao');
    return { mensagem: '', finalizado: false };
  }

  private async stepEscolherAcao(msg: string): Promise<FlowResult> {
    const opcao = msg.trim();

    if (opcao === '1') {
      // Notificacao Matinal
      this.state.mode = 'notif_manha';
      this.state.periodo = 'manha';
      this.goToStep('escolher_projeto_manha');
      return await this.stepEscolherProjetoManha('');

    } else if (opcao === '2') {
      // Notificacao Noturna
      this.state.mode = 'notif_noite';
      this.state.periodo = 'noite';
      this.goToStep('escolher_projeto_noite');
      return await this.stepEscolherProjetoNoite('');

    } else if (opcao === '3') {
      // Visualizar projetos
      this.goToStep('visualizar_projetos');
      return await this.stepVisualizarProjetos();

    } else if (opcao === '4') {
      // Marcar etapa concluída (progresso ponderado)
      this.goToStep('progresso_escolher_projeto');
      return await this.stepProgressoEscolherProjeto('');

    } else {
      return {
        mensagem: '❌ Opção inválida. Digite *1*, *2*, *3* ou *4*.',
        finalizado: false
      };
    }
  }

  // Dead code removed: old sheet-based steps (stepEscolherPeriodo, stepEscolherProjeto,
  // stepCliente, stepContato, stepObra, stepTipoProjeto, stepAreaProjeto, stepDataInicio,
  // stepDataPrevisaoInterna, stepEscolherTipoNotificacao, stepEscolherProjetoNotif,
  // stepDataFinalCliente, stepEscolherAreas, stepDadosArea, stepStatusProjeto,
  // and shadowed duplicates of stepPrevisaoDia, stepFeitoDia, stepRetrabalhoPergunta,
  // stepRetrabalhoMotivo, stepObservacoesPergunta, stepObservacoesTexto)


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
              'hidrossanitário piscina': 'H1',
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
          mensagem += `🏗️ Código: *${this.state.projectCode}*\n`;
          mensagem += `👤 Cliente: ${this.state.projectData['Cliente']}\n`;
          mensagem += `🏗️ Obra: ${this.state.projectData['Obra']}\n`;
          mensagem += `📊 Tipo: ${this.state.projectData['Tipo de Projeto']}\n\n`;
          mensagem += `🏗️ *Áreas atribuídas:*\n`;
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
            mensagem += `🏗️ Código: *${this.state.projectCode}*\n`;
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

            // Buscar status_id numérico a partir do código
            const statusObj = await supabase.buscarStatusPorCodigo(statusCodigo);
            const statusId = statusObj?.status_id ?? 1;

            // FIX BUG-02: argumentos estavam invertidos (texto, código)
            // Assinatura correta: registrarPrevisaoDia(eng_projeto_id, status_id: number, previsao_texto: string)
            const previsao = await supabase.registrarPrevisaoDia(
              this.state.selectedAtribuicaoId,
              statusId,
              morningData['Previsão para o dia']
            );

            if (previsao) {
              salvouSupabase = true;
              mensagem = `✅ *Atualização matinal salva com sucesso!*\n\n`;
              mensagem += `🏗️ Código: *${this.state.projectCode}*\n`;
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
              mensagem += `🏗️ Código: *${this.state.projectCode}*\n`;
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
            mensagem += `🏗️ Código: *${this.state.projectCode}*\n`;
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
  // UTILITÁRIOS
  // =====================================================

  private goToStep(step: FlowStep): void {
    if (this.state.step !== 'inicio') {
      this.state.stepHistory.push(this.state.step);
      // Snapshot: deep clone do state (para conseguir restaurar ao voltar)
      try {
        const snap: StepSnapshot = {
          step: this.state.step,
          data: JSON.parse(JSON.stringify({ ...this.state, snapshotHistory: undefined })),
        };
        if (!this.state.snapshotHistory) this.state.snapshotHistory = [];
        this.state.snapshotHistory.push(snap);
      } catch (e) {
        // se snapshot falhar (ciclo, etc), seguir sem ele
      }
    }
    this.state.step = step;
  }

  /**
   * Volta 1 passo, restaurando snapshot do estado anterior.
   * Retorna true se voltou; false se pilha vazia.
   */
  private popStep(): boolean {
    const hist = this.state.snapshotHistory ?? [];
    if (hist.length === 0) {
      this.state.stepHistory.pop();
      return false;
    }
    const snap = hist.pop()!;
    // Preservar o snapshotHistory atual (não restaurar do snapshot)
    const preservedHist = this.state.snapshotHistory;
    Object.keys(this.state).forEach(k => delete (this.state as any)[k]);
    Object.assign(this.state, snap.data);
    this.state.snapshotHistory = preservedHist;
    this.state.step = snap.step;
    this.state.stepHistory.pop();
    return true;
  }

  /**
   * Reseta o flow para o início, limpando todo o estado.
   */
  private resetToMenu(): void {
    this.state = {
      step: 'inicio',
      stepHistory: [],
      snapshotHistory: [],
      mode: null,
      projectData: {},
      engineerName: this.state.engineerName,
    };
  }

  private isTerminalStep(step: FlowStep): boolean {
    return step === 'fim';
  }

  private renderMenuEngenheiro(): string {
    return `⬅️ *Voltando ao menu principal*

📋 *Menu do Engenheiro*

🔔 *Atualizações Diárias*
1️⃣ Notificação Matinal
2️⃣ Notificação Noturna

📊 *Gestão*
3️⃣ Visualizar Meus Projetos
4️⃣ Marcar Etapa Concluída

_Digite o número da opção desejada_`;
  }

  /**
   * Remove atribuições onde a (projeto, área) já está 100% concluída.
   * Usado nas listagens onde o engenheiro escolhe um projeto para AGIR.
   */
  private async filtrarAtribuicoesPendentes<T extends { projeto_id: string; area_id: string | number }>(
    atribuicoes: T[]
  ): Promise<T[]> {
    const result: T[] = [];
    for (const atrib of atribuicoes) {
      const pavs = await this.supabase.buscarPavimentosComEtapas(atrib.projeto_id, String(atrib.area_id));
      // sem pavimentos configurados → manter (engenheiro precisa ver a mensagem)
      if (pavs.length === 0) {
        result.push(atrib);
        continue;
      }
      // pavimento sem etapas configuradas conta como pendente (não-configurado ≠ concluído)
      const temPavimentoSemEtapas = pavs.some((p: any) =>
        p.ativo !== false && (p.etapas ?? []).filter((e: any) => e.ativo !== false).length === 0
      );
      const temEtapaPendente = pavs.some((p: any) =>
        p.ativo !== false && (p.etapas ?? []).some((e: any) => !e.concluida && e.ativo !== false)
      );
      if (temPavimentoSemEtapas || temEtapaPendente) result.push(atrib);
    }
    return result;
  }

  private cancelar(): FlowResult {
    return {
      mensagem: '❌ *Fluxo cancelado*\n\nDigite "menu" para voltar ao início.',
      finalizado: true
    };
  }

  /**
   * Verifica se uma atribuição (projeto+área) está 100% concluída.
   * Retorna false se não há pavimentos configurados (não-configurado ≠ concluído).
   */
  private async _isAtribuicaoConcluida(
    atrib: { projeto_id: string; area_id: string | number }
  ): Promise<boolean> {
    const pavs = await this.supabase.buscarPavimentosComEtapas(
      atrib.projeto_id, String(atrib.area_id)
    );
    if (pavs.length === 0) return false;
    return isProjetoTotalmenteConcluido(pavs as any);
  }

  // =====================================================
  // STEPS: NOTIFICAÇÃO MATINAL
  // =====================================================

  private async stepEscolherProjetoManha(msg: string): Promise<FlowResult> {
    const todasAtribuicoes = await this.buscarAtribuicoesEngenheiro();

    if (todasAtribuicoes.length === 0) {
      return {
        mensagem: '❌ Você não tem projetos atribuídos.\n\nContate o dono da empresa.',
        finalizado: true
      };
    }

    const atribuicoes = todasAtribuicoes;

    this.state.availableAtribuicoes = atribuicoes;
    this.goToStep('escolher_area_manha'); // Avançar step para receber escolha

    let mensagem = `🌅 *Notificação Matinal*\n\n`;
    mensagem += `📋 Escolha o projeto:\n\n`;

    for (let index = 0; index < atribuicoes.length; index++) {
      const atrib = atribuicoes[index];
      const concluido = await this._isAtribuicaoConcluida(atrib);
      const flag = concluido ? ' ✅' : '';
      mensagem += `${index + 1}️⃣ *${atrib.codigo}* - ${atrib.cliente}${flag}\n`;
      mensagem += `   Área: ${atrib.area}\n`;
      mensagem += `   Status: ${atrib.status || 'N/A'}\n\n`;
    }

    mensagem += `_Digite o número do projeto_\n\n*0.* Voltar | *menu* — início`;
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

    // Bloquear ação se atribuição já está concluída
    if (await this._isAtribuicaoConcluida(atribuicao)) {
      return {
        mensagem: `✅ *${atribuicao.codigo}* (${atribuicao.area}) já está concluída!\n\n⚡ Andamento: ${atribuicao.percentual || 0}%\n\n_Escolha outro projeto ou digite "menu"_`,
        finalizado: false
      };
    }

    this.state.selectedAtribuicaoId = atribuicao.id;
    this.state.projectCode = atribuicao.codigo;
    // Status não é mais escolhido manualmente — deriva do progresso ponderado (etapas)
    this.state.statusAtual = null;

    // Prosseguir direto para a previsão do dia
    this.goToStep('previsao_dia');
    return {
      mensagem: `📝 *O que você pretende fazer hoje?*\n\n_Descreva brevemente a previsão para o dia_\n\n*0.* Voltar | *menu* — início`,
      finalizado: false
    };
  }

  private async stepPrevisaoDia(msg: string): Promise<FlowResult> {
    const previsao = msg.trim();

    // Re-render do prompt quando voltando (msg vazio)
    if (!previsao) {
      return {
        mensagem: `📝 *O que você pretende fazer hoje?*\n\n_Descreva brevemente a previsão para o dia_\n\n*0.* Voltar | *menu* — início`,
        finalizado: false
      };
    }

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
      this.state.statusAtual ?? null,
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
    const todasAtribuicoes = await this.buscarAtribuicoesEngenheiro();

    if (todasAtribuicoes.length === 0) {
      return {
        mensagem: '❌ Você não tem projetos atribuídos.\n\nContate o dono da empresa.',
        finalizado: true
      };
    }

    const atribuicoes = todasAtribuicoes;

    this.state.availableAtribuicoes = atribuicoes;
    this.goToStep('escolher_area_noite'); // Avançar step para receber escolha

    let mensagem = `🌙 *Notificação Noturna*\n\n`;
    mensagem += `📋 Escolha o projeto:\n\n`;

    for (let index = 0; index < atribuicoes.length; index++) {
      const atrib = atribuicoes[index];
      const concluido = await this._isAtribuicaoConcluida(atrib);
      const flag = concluido ? ' ✅' : '';
      mensagem += `${index + 1}️⃣ *${atrib.codigo}* - ${atrib.cliente}${flag}\n`;
      mensagem += `   Área: ${atrib.area}\n`;
      mensagem += `   Status: ${atrib.status || 'N/A'}\n\n`;
    }

    mensagem += `_Digite o número do projeto_\n\n*0.* Voltar | *menu* — início`;
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

    // Bloquear ação se atribuição já está concluída
    if (await this._isAtribuicaoConcluida(atribuicao)) {
      return {
        mensagem: `✅ *${atribuicao.codigo}* (${atribuicao.area}) já está concluída!\n\n⚡ Andamento: ${atribuicao.percentual || 0}%\n\n_Escolha outro projeto ou digite "menu"_`,
        finalizado: false
      };
    }

    this.state.selectedAtribuicaoId = atribuicao.id;
    this.state.projectCode = atribuicao.codigo;
    this.state.selectedProjetoId = atribuicao.projeto_id;
    this.state.selectedProjetoCodigo = atribuicao.codigo;
    this.state.selectedAreaId = String(atribuicao.area_id);

    // Prosseguir para feito do dia
    this.goToStep('feito_dia');

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
    this.goToStep('retrabalho_pergunta');

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
      this.goToStep('retrabalho_motivo');

      let mensagem = `⚠️ *Motivo do Retrabalho*\n\n`;
      mensagem += `1️⃣ Erro de dimensionamento\n`;
      mensagem += `2️⃣ Mudança de requisitos\n`;
      mensagem += `3️⃣ Falta de informações\n`;
      mensagem += `4️⃣ Erro de comunicação\n`;
      mensagem += `5️⃣ Outro\n\n`;
      mensagem += `_Digite o número do motivo_\n\n*0.* Voltar | *menu* — início`;

      return { mensagem, finalizado: false };

    } else if (resposta === '2') {
      // Não teve retrabalho
      this.state.teveRetrabalho = false;

      // Registrar dia SEM retrabalho (importante para calcular a taxa corretamente!)
      await this.supabase.registrarRetrabalho(
        this.state.selectedAtribuicaoId!,
        false, // necessitou_retrabalho = false
        undefined   // sem motivo
      );

      this.goToStep('observacoes_pergunta');

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

    this.goToStep('observacoes_pergunta');

    return {
      mensagem: `✅ Motivo registrado: ${motivos[escolha]}\n\n📝 *Quer adicionar observações?*\n\n1️⃣ Sim\n2️⃣ Não\n\n_Digite 1 ou 2_`,
      finalizado: false
    };
  }

  private async stepObservacoesPergunta(msg: string): Promise<FlowResult> {
    const resposta = msg.trim();

    if (resposta === '1') {
      // Quer adicionar observações
      this.goToStep('observacoes_texto');

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
      this.state.observacoesTexto || undefined  // Apenas as observações, sem repetir o feito
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

    // Verificar se o projeto tem pavimentos com etapas pendentes
    if (this.state.selectedProjetoId) {
      try {
        const pavimentos = await this.supabase.buscarPavimentosComEtapas(
          this.state.selectedProjetoId,
          this.state.selectedAreaId
        );
        const pavimentosComPendencias = pavimentos.filter(
          (p: any) => p.etapas.some((e: any) => !e.concluida)
        );

        if (pavimentosComPendencias.length > 0) {
          this.state.pavimentosDisponiveis = pavimentosComPendencias;
          this.goToStep('noite_etapa_pergunta');

          mensagem += `\n📐 *Alguma etapa foi concluída hoje?*\n\n`;
          mensagem += `1️⃣ Sim\n`;
          mensagem += `2️⃣ Não\n\n`;
          mensagem += `_Digite 1 ou 2_`;

          return { mensagem, finalizado: false };
        }
      } catch (error) {
        console.error('Erro ao verificar pavimentos:', error);
      }
    }

    mensagem += `\nDescanse bem! 🌙`;

    return { mensagem, finalizado: true };
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

    for (let idx = 0; idx < atribuicoes.length; idx++) {
      const proj = atribuicoes[idx];
      const concluido = await this._isAtribuicaoConcluida(proj);
      const flag = concluido ? ' ✅' : '';
      mensagem += `${idx + 1}️⃣ *${proj.codigo}* - ${proj.cliente}${flag}\n`;
      mensagem += `   📦 Área: ${proj.area}\n`;
      mensagem += `   📊 Status: ${proj.status}\n`;
      mensagem += `   ⚡ Andamento: ${proj.percentual || 0}%\n`;
      if (proj.data_prevista) {
        const data = new Date(proj.data_prevista).toLocaleDateString('pt-BR');
        mensagem += `   📅 Previsto: ${data}\n`;
      }
      mensagem += `\n`;
    }

    mensagem += `_Digite o número para ver detalhes completos_\n`;
    mensagem += `_Ou "menu" para voltar_`;

    this.state.availableAtribuicoes = atribuicoes;
    this.goToStep('escolher_projeto_viz');

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
    msg += `📊 *Status Atual*\n\n`;
    msg += `📊 Status da Área: ${atribuicao.status}\n`;
    msg += `⚡ Andamento Global do Projeto: ${atribuicao.percentual || 0}%\n`;
    msg += `\n`;

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

    this.goToStep('mostrar_detalhes_projeto');

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
      const todasAtribuicoes = await this.buscarAtribuicoesEngenheiro();

      if (todasAtribuicoes.length === 0) {
        return {
          mensagem: '📭 Você não tem projetos atribuídos no momento.',
          finalizado: true
        };
      }

      // Guardar todas as atribuições (com áreas) para uso posterior
      (this.state as any).todasAtribuicoes = todasAtribuicoes;

      // Filtrar projetos únicos (pode ter múltiplas áreas)
      const projetosUnicos = new Map<string, typeof todasAtribuicoes[0]>();
      todasAtribuicoes.forEach(a => {
        if (!projetosUnicos.has(a.projeto_id)) {
          projetosUnicos.set(a.projeto_id, a);
        }
      });

      const projetos = Array.from(projetosUnicos.values());
      this.state.availableAtribuicoes = projetos;

      let mensagem = `📐 *Marcar Etapa Concluída*\n\n`;
      mensagem += `📋 Escolha o projeto:\n\n`;

      for (let idx = 0; idx < projetos.length; idx++) {
        const proj = projetos[idx];
        const concluido = await this._isAtribuicaoConcluida(proj);
        const flag = concluido ? ' ✅' : '';
        mensagem += `${idx + 1}️⃣ *${proj.codigo}* - ${proj.cliente}${flag}\n`;
      }

      mensagem += `\n_Digite o número do projeto_\n\n*0.* Voltar | *menu* — início`;

      this.goToStep('progresso_escolher_projeto');
      return { mensagem, finalizado: false };
    }

    // Segunda chamada: processar escolha do projeto
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

    // Filtrar áreas do engenheiro neste projeto
    const todas = ((this.state as any).todasAtribuicoes || []) as Array<{ projeto_id: string; area_id: string | number; area: string }>;
    const areasDoProjeto = todas
      .filter(a => a.projeto_id === projeto.projeto_id)
      .map(a => ({ area_id: a.area_id, area: a.area }));

    // Deduplicar áreas (caso haja duplicatas)
    const areasUnicasTodas = Array.from(
      new Map(areasDoProjeto.map(a => [String(a.area_id), a])).values()
    );

    // Filtrar áreas que ainda têm pavimentos/etapas pendentes
    const todosPavsDoProjeto = await this.supabase.buscarPavimentosComEtapas(projeto.projeto_id);
    const areasUnicas = filterAreasPendentes(areasUnicasTodas, todosPavsDoProjeto as any);

    if (areasUnicas.length === 0) {
      return {
        mensagem: `🎉 Todas as disciplinas do projeto *${projeto.codigo}* já foram concluídas!\n\n⚡ Andamento: ${projeto.percentual ?? 0}%\n\n_Digite "menu" para voltar_`,
        finalizado: true
      };
    }

    // Se só tem uma área, pular seleção e ir direto pra pavimentos
    if (areasUnicas.length <= 1) {
      this.state.selectedAreaId = areasUnicas[0]?.area_id ? String(areasUnicas[0].area_id) : undefined;
      return await this.carregarPavimentosDoProjeto();
    }

    // Múltiplas áreas: pedir escolha
    this.state.areasDisponiveisProjeto = areasUnicas;
    this.goToStep('progresso_escolher_area');

    let mensagem = `📦 *Áreas do Projeto ${projeto.codigo}:*\n\n`;
    areasUnicas.forEach((a, idx) => {
      mensagem += `${idx + 1}️⃣ ${a.area}\n`;
    });
    mensagem += `\n_Digite o número da área_\n\n*0.* Voltar | *menu* — início`;

    return { mensagem, finalizado: false };
  }

  private async stepProgressoEscolherArea(msg: string): Promise<FlowResult> {
    const areas = this.state.areasDisponiveisProjeto || [];

    // Re-render quando voltando (msg vazio)
    if (!msg.trim()) {
      let mensagem = `📦 *Áreas do Projeto ${this.state.selectedProjetoCodigo ?? ''}:*\n\n`;
      areas.forEach((a: any, idx: number) => {
        mensagem += `${idx + 1}️⃣ ${a.area}\n`;
      });
      mensagem += `\n_Digite o número da área_\n\n*0.* Voltar | *menu* — início`;
      return { mensagem, finalizado: false };
    }

    const escolha = parseInt(msg.trim()) - 1;

    if (isNaN(escolha) || escolha < 0 || escolha >= areas.length) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${areas.length}`,
        finalizado: false
      };
    }

    const area = areas[escolha];
    this.state.selectedAreaId = String(area.area_id);

    return await this.carregarPavimentosDoProjeto();
  }

  private async carregarPavimentosDoProjeto(): Promise<FlowResult> {
    const projetoId = this.state.selectedProjetoId!;
    const codigo = this.state.selectedProjetoCodigo!;

    const pavimentos = await this.supabase.buscarPavimentosComEtapas(
      projetoId,
      this.state.selectedAreaId
    );

    if (pavimentos.length === 0) {
      // Projeto sem etapas configuradas: permitir marcar/desmarcar concluído manualmente
      this.goToStep('progresso_sem_etapas_concluir');
      return await this.renderProgressoSemEtapasConcluir();
    }

    // Filtrar pavimentos que ainda têm etapas pendentes (helper centralizado)
    const pavimentosComPendencias = filterPavimentosPendentes(pavimentos as any);

    if (pavimentosComPendencias.length === 0) {
      const progresso = await this.supabase.buscarProgressoPonderado(projetoId);
      return {
        mensagem: `✅ Todas as etapas do projeto *${codigo}* já estão concluídas!\n\n⚡ Andamento: ${progresso ?? 0}%\n\n_Digite "menu" para voltar_`,
        finalizado: true
      };
    }

    this.state.pavimentosDisponiveis = pavimentosComPendencias;
    // Em vez de listar pavimentos direto, perguntar qual modo de marcação
    this.goToStep('progresso_modo_multiselecao');
    return await this.renderProgressoModoMultiselecao();
  }

  // =====================================================
  // STEP: PROJETO SEM ETAPAS — MARCAR/DESMARCAR CONCLUÍDO
  // =====================================================

  private async renderProgressoSemEtapasConcluir(): Promise<FlowResult> {
    const projetoId = this.state.selectedProjetoId!;
    const codigo = this.state.selectedProjetoCodigo!;
    const pct = (await this.supabase.buscarProgressoPonderado(projetoId)) ?? 0;
    const jaConcluido = pct >= 100;

    return {
      mensagem:
        `ℹ️ O projeto *${codigo}* não possui etapas cadastradas.\n\n` +
        `⚡ Andamento atual: ${pct}%\n\n` +
        (jaConcluido
          ? `1️⃣ Reabrir projeto (volta para 0% / Aguardando Início)\n`
          : `1️⃣ Marcar Projeto Concluído (100%)\n`) +
        `\n*0.* Voltar | *menu* — início`,
      finalizado: false
    };
  }

  private async stepProgressoSemEtapasConcluir(msg: string): Promise<FlowResult> {
    if (!msg.trim()) return await this.renderProgressoSemEtapasConcluir();

    if (msg.trim() !== '1') {
      return {
        mensagem: '❌ Opção inválida. Digite *1* para confirmar ou *0* para voltar.',
        finalizado: false
      };
    }

    const projetoId = this.state.selectedProjetoId!;
    const codigo = this.state.selectedProjetoCodigo!;
    const jaConcluido = ((await this.supabase.buscarProgressoPonderado(projetoId)) ?? 0) >= 100;
    const novoValor = await this.supabase.marcarProjetoConcluido(projetoId, !jaConcluido);

    if (novoValor === null) {
      return {
        mensagem: '❌ Erro ao atualizar o projeto. Tente novamente ou digite "menu".',
        finalizado: false
      };
    }

    return {
      mensagem: jaConcluido
        ? `🔄 Projeto *${codigo}* reaberto.\n\n⚡ Andamento: ${novoValor}% — *Aguardando Início*\n\n_Digite "menu" para voltar_`
        : `✅ Projeto *${codigo}* marcado como *Concluído*!\n\n⚡ Andamento: ${novoValor}%\n\n_Digite "menu" para voltar_`,
      finalizado: true
    };
  }

  // =====================================================
  // STEPS: MULTI-SELEÇÃO DE ETAPAS (Fase 3)
  // =====================================================

  private async renderProgressoModoMultiselecao(): Promise<FlowResult> {
    return {
      mensagem:
        `📋 *Como você quer marcar as etapas?*\n\n` +
        `1️⃣ Várias etapas no mesmo pavimento\n` +
        `2️⃣ Mesma etapa em vários pavimentos\n\n` +
        `*0.* Voltar | *menu* — início`,
      finalizado: false
    };
  }

  private async stepProgressoModoMultiselecao(msg: string): Promise<FlowResult> {
    if (!msg.trim()) return await this.renderProgressoModoMultiselecao();
    const opcao = msg.trim();
    if (opcao === '1') {
      this.state.modoMultiSelecao = 1;
      this.goToStep('progresso_multi_etapas_pavimento');
      return await this.renderProgressoMultiEtapasPavimento();
    }
    if (opcao === '2') {
      this.state.modoMultiSelecao = 2;
      this.goToStep('progresso_multi_etapa_escolher');
      return await this.renderProgressoMultiEtapaEscolher();
    }
    return { mensagem: '❌ Opção inválida. Digite *1* ou *2*.', finalizado: false };
  }

  // ---------------- MODO 1: várias etapas, mesmo pavimento ----------------

  private async renderProgressoMultiEtapasPavimento(): Promise<FlowResult> {
    const pavs = this.state.pavimentosDisponiveis ?? [];
    let mensagem = `🏗️ *${this.state.selectedProjetoCodigo}* - Pavimentos\n\n`;
    pavs.forEach((p: any, i: number) => {
      mensagem += `${i + 1}️⃣ *${p.nome}* (${p.etapas.length} etapa(s) pendente(s))\n`;
    });
    mensagem += `\n_Digite o número do pavimento_\n\n*0.* Voltar | *menu* — início`;
    return { mensagem, finalizado: false };
  }

  private async stepProgressoMultiEtapasPavimento(msg: string): Promise<FlowResult> {
    if (!msg.trim()) return await this.renderProgressoMultiEtapasPavimento();
    const pavs = this.state.pavimentosDisponiveis ?? [];
    const idx = parseInt(msg.trim(), 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= pavs.length) {
      return { mensagem: `❌ Digite um número entre 1 e ${pavs.length}`, finalizado: false };
    }
    const pav = pavs[idx];
    this.state.selectedPavimentoId = pav.pavimento_id;
    this.state.selectedPavimentoNome = pav.nome;
    this.state.etapasDisponiveis = pav.etapas;
    this.goToStep('progresso_multi_etapas_selecionar');
    return await this.renderProgressoMultiEtapasSelecionar();
  }

  private async renderProgressoMultiEtapasSelecionar(): Promise<FlowResult> {
    const etapas = this.state.etapasDisponiveis ?? [];
    let mensagem = `📋 *${this.state.selectedPavimentoNome}* — etapas pendentes\n\n`;
    etapas.forEach((e: any, i: number) => {
      mensagem += `${i + 1}. ${e.nome} (peso ${e.peso ?? 0}%)\n`;
    });
    mensagem += `\n📝 *Como selecionar:*\n`;
    mensagem += `• Uma: \`3\`\n`;
    mensagem += `• Várias: \`1,3,5\`\n`;
    mensagem += `• Intervalo: \`2-4\`\n`;
    mensagem += `• Misto: \`1,3-5\`\n`;
    mensagem += `• Todas: \`todas\`\n\n`;
    mensagem += `*0.* Voltar | *menu* — início`;
    return { mensagem, finalizado: false };
  }

  private async stepProgressoMultiEtapasSelecionar(msg: string): Promise<FlowResult> {
    if (!msg.trim()) return await this.renderProgressoMultiEtapasSelecionar();
    const etapas = this.state.etapasDisponiveis ?? [];
    try {
      const indices = parseMultiSelection(msg, etapas.length);
      this.state.etapaIdsSelecionados = indices.map(i => etapas[i].etapa_id);
      this.goToStep('progresso_multi_confirmar');
      return await this.renderProgressoMultiConfirmar();
    } catch (e: any) {
      if (e instanceof MultiSelectionError) return { mensagem: e.userMessage, finalizado: false };
      throw e;
    }
  }

  // ---------------- MODO 2: mesma etapa, vários pavimentos ----------------

  private async renderProgressoMultiEtapaEscolher(): Promise<FlowResult> {
    const pavs = this.state.pavimentosDisponiveis ?? [];
    // Coletar nomes únicos de etapas pendentes (preservando ordem da primeira ocorrência)
    const nomesUnicos: string[] = [];
    for (const p of pavs) {
      for (const e of (p.etapas ?? [])) {
        if (!nomesUnicos.includes(e.nome)) nomesUnicos.push(e.nome);
      }
    }
    this.state.etapasNomesUnicos = nomesUnicos;

    if (nomesUnicos.length === 0) {
      return {
        mensagem: '🎉 Não há etapas pendentes nesta disciplina.\n\n_Digite "menu"_',
        finalizado: true
      };
    }

    let mensagem = `📋 *Escolha a etapa* (em qualquer pavimento desta disciplina)\n\n`;
    nomesUnicos.forEach((nome, i) => {
      mensagem += `${i + 1}️⃣ ${nome}\n`;
    });
    mensagem += `\n_Digite o número da etapa_\n\n*0.* Voltar | *menu* — início`;
    return { mensagem, finalizado: false };
  }

  private async stepProgressoMultiEtapaEscolher(msg: string): Promise<FlowResult> {
    if (!msg.trim()) return await this.renderProgressoMultiEtapaEscolher();
    const nomes = this.state.etapasNomesUnicos ?? [];
    const idx = parseInt(msg.trim(), 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= nomes.length) {
      return { mensagem: `❌ Digite um número entre 1 e ${nomes.length}`, finalizado: false };
    }
    this.state.etapaNomeSelecionado = nomes[idx];
    this.goToStep('progresso_multi_etapa_pavimentos');
    return await this.renderProgressoMultiEtapaPavimentos();
  }

  private async renderProgressoMultiEtapaPavimentos(): Promise<FlowResult> {
    const todosPavs = this.state.pavimentosDisponiveis ?? [];
    const nomeEtapa = this.state.etapaNomeSelecionado!;
    // Filtrar pavimentos que têm essa etapa pendente; cada item carrega só essa etapa
    const pavsComEtapa = todosPavs
      .map((p: any) => ({ ...p, etapas: (p.etapas ?? []).filter((e: any) => e.nome === nomeEtapa) }))
      .filter((p: any) => p.etapas.length > 0);

    // Sobrescrever em state para uso na confirmação (usado ao montar etapaIdsSelecionados)
    (this.state as any).pavimentosComEtapaSelecionada = pavsComEtapa;

    if (pavsComEtapa.length === 0) {
      return {
        mensagem: `🎉 A etapa "${nomeEtapa}" já está concluída em todos os pavimentos.\n\n_Digite "menu"_`,
        finalizado: true
      };
    }

    let mensagem = `🏗️ *Pavimentos com "${nomeEtapa}" pendente*\n\n`;
    pavsComEtapa.forEach((p: any, i: number) => {
      mensagem += `${i + 1}. ${p.nome}\n`;
    });
    mensagem += `\n📝 *Como selecionar:*\n`;
    mensagem += `• Um: \`2\`\n`;
    mensagem += `• Vários: \`1,3,5\`\n`;
    mensagem += `• Intervalo: \`2-4\`\n`;
    mensagem += `• Misto: \`1,3-5\`\n`;
    mensagem += `• Todos: \`todos\`\n\n`;
    mensagem += `*0.* Voltar | *menu* — início`;
    return { mensagem, finalizado: false };
  }

  private async stepProgressoMultiEtapaPavimentos(msg: string): Promise<FlowResult> {
    if (!msg.trim()) return await this.renderProgressoMultiEtapaPavimentos();
    const pavs = ((this.state as any).pavimentosComEtapaSelecionada ?? []) as any[];
    try {
      const indices = parseMultiSelection(msg, pavs.length);
      // cada pav tem exatamente 1 etapa filtrada (a selecionada)
      this.state.etapaIdsSelecionados = indices.map(i => pavs[i].etapas[0].etapa_id);
      this.goToStep('progresso_multi_confirmar');
      return await this.renderProgressoMultiConfirmar();
    } catch (e: any) {
      if (e instanceof MultiSelectionError) return { mensagem: e.userMessage, finalizado: false };
      throw e;
    }
  }

  // ---------------- CONFIRMAÇÃO + GRAVAÇÃO BATCH ----------------

  private async renderProgressoMultiConfirmar(): Promise<FlowResult> {
    const ids = this.state.etapaIdsSelecionados ?? [];
    const pavs = this.state.pavimentosDisponiveis ?? [];
    const labels: string[] = [];
    for (const p of pavs) {
      for (const e of (p.etapas ?? [])) {
        if (ids.includes(e.etapa_id)) {
          labels.push(this.state.modoMultiSelecao === 1 ? e.nome : `${p.nome} → ${e.nome}`);
        }
      }
    }
    let mensagem = `🔎 *Confirme a marcação:*\n\n`;
    labels.forEach(l => mensagem += `✅ ${l}\n`);
    mensagem += `\n1️⃣ Confirmar e gravar\n2️⃣ Refazer seleção\n\n*0.* Voltar | *menu* — início`;
    return { mensagem, finalizado: false };
  }

  private async stepProgressoMultiConfirmar(msg: string): Promise<FlowResult> {
    if (!msg.trim()) return await this.renderProgressoMultiConfirmar();
    const opcao = msg.trim();
    if (opcao === '1') {
      const ids = this.state.etapaIdsSelecionados ?? [];
      const result = await this.supabase.marcarEtapasBatch(ids, true);
      const progresso = await this.supabase.buscarProgressoPonderado(this.state.selectedProjetoId!);

      let mensagem = `✅ *${result.ok} etapa(s) marcada(s) como concluída(s)!*\n\n`;
      if (result.falhas.length > 0) {
        mensagem += `⚠️ ${result.falhas.length} falharam ao gravar.\n\n`;
      }
      mensagem += `⚡ Andamento: *${progresso ?? 0}%*\n\n`;
      mensagem += `_Digite "menu" para voltar ao menu principal_`;

      // Limpar pilha — não permite voltar a algo já gravado
      this.state.snapshotHistory = [];
      this.state.stepHistory = [];
      this.goToStep('fim');
      return { mensagem, finalizado: true };
    }
    if (opcao === '2') {
      // Refazer = voltar 1 passo na pilha (volta para a tela de seleção)
      if (this.popStep()) {
        return await this.processarMensagem('');
      }
      return this.cancelar();
    }
    return { mensagem: '❌ Digite *1* para confirmar ou *2* para refazer.', finalizado: false };
  }

  /**
   * STEP: Escolher pavimento e listar etapas pendentes
   */
  private async stepProgressoEscolherPavimento(msg: string): Promise<FlowResult> {
    // Re-render quando voltando (msg vazio): re-listar pavimentos
    if (!msg.trim()) {
      return await this.carregarPavimentosDoProjeto();
    }

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
    const etapasPendentes = filterEtapasPendentes(pavimento.etapas as any);
    this.state.etapasDisponiveis = etapasPendentes;
    this.goToStep('progresso_escolher_etapa');

    let mensagem = `📐 *${this.state.selectedProjetoCodigo}* > *${pavimento.nome}*\n\n`;
    mensagem += `📋 Etapas pendentes:\n\n`;

    etapasPendentes.forEach((etapa: any, idx: number) => {
      mensagem += `${idx + 1}️⃣ ${etapa.nome} (peso ${etapa.peso}%)\n`;
    });

    mensagem += `\n_Digite o número da etapa para marcar como concluída_\n\n*0.* Voltar | *menu* — início`;

    return { mensagem, finalizado: false };
  }

  /**
   * STEP: Marcar etapa como concluída e mostrar resultado
   */
  private async stepProgressoEscolherEtapa(msg: string): Promise<FlowResult> {
    // Re-render quando voltando (msg vazio)
    if (!msg.trim()) {
      const etapas = this.state.etapasDisponiveis ?? [];
      let mensagem = `📐 *${this.state.selectedProjetoCodigo}* > *${this.state.selectedPavimentoNome}*\n\n`;
      mensagem += `📋 Etapas pendentes:\n\n`;
      etapas.forEach((etapa: any, idx: number) => {
        mensagem += `${idx + 1}️⃣ ${etapa.nome} (peso ${etapa.peso}%)\n`;
      });
      mensagem += `\n_Digite o número da etapa para marcar como concluída_\n\n*0.* Voltar | *menu* — início`;
      return { mensagem, finalizado: false };
    }

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
    mensagem += `⚡ *Andamento: ${progresso ?? 0}%*\n\n`;
    mensagem += `Deseja marcar outra etapa neste mesmo pavimento?\n\n`;
    mensagem += `1️⃣ Sim\n`;
    mensagem += `2️⃣ Não, voltar ao menu\n\n`;
    mensagem += `_Digite 1 ou 2_`;

    this.goToStep('progresso_continuar');

    return { mensagem, finalizado: false };
  }

  /**
   * STEP: Pergunta se quer continuar marcando etapas no mesmo pavimento
   */
  private async stepProgressoContinuar(msg: string): Promise<FlowResult> {
    const resposta = msg.trim();

    if (resposta === '1') {
      // Recarregar pavimentos com etapas pendentes atualizadas
      const pavimentos = await this.supabase.buscarPavimentosComEtapas(
        this.state.selectedProjetoId!,
        this.state.selectedAreaId
      );

      const pavimentoAtual = pavimentos.find(
        (p: any) => p.pavimento_id === this.state.selectedPavimentoId
      );

      const etapasPendentes = pavimentoAtual
        ? filterEtapasPendentes(pavimentoAtual.etapas as any)
        : [];

      if (etapasPendentes.length === 0) {
        const progresso = await this.supabase.buscarProgressoPonderado(this.state.selectedProjetoId!);
        return {
          mensagem: `✅ Todas as etapas do pavimento *${this.state.selectedPavimentoNome}* já estão concluídas!\n\n⚡ *Andamento: ${progresso ?? 0}%*\n\n_Digite "menu" para voltar ao menu principal_`,
          finalizado: true
        };
      }

      // Atualizar lista de pavimentos disponíveis e etapas pendentes
      this.state.pavimentosDisponiveis = filterPavimentosPendentes(pavimentos as any);
      this.state.etapasDisponiveis = etapasPendentes;

      let mensagem = `📐 *${this.state.selectedProjetoCodigo}* > *${this.state.selectedPavimentoNome}*\n\n`;
      mensagem += `Etapas pendentes:\n\n`;

      etapasPendentes.forEach((etapa: any, idx: number) => {
        mensagem += `${idx + 1}️⃣ ${etapa.nome} (peso ${etapa.peso}%)\n`;
      });

      mensagem += `\n_Digite o número da etapa para marcar como concluída_\n\n*0.* Voltar | *menu* — início`;

      this.goToStep('progresso_escolher_etapa');
      return { mensagem, finalizado: false };

    } else if (resposta === '2') {
      this.goToStep('fim');
      return {
        mensagem: '_Digite "menu" para voltar ao menu principal_',
        finalizado: true
      };

    } else {
      return {
        mensagem: '❌ Opção inválida. Digite *1* para Sim ou *2* para Não.',
        finalizado: false
      };
    }
  }

  // =====================================================
  // STEPS: PROGRESSO PONDERADO INTEGRADO NA NOITE
  // =====================================================

  private async stepNoiteEtapaPergunta(msg: string): Promise<FlowResult> {
    const resposta = msg.trim();

    if (resposta === '1') {
      // Sim, concluiu etapa — mostrar pavimentos pendentes
      const pavimentosTodos = this.state.pavimentosDisponiveis ?? [];
      const pavimentos = filterPavimentosPendentes(pavimentosTodos as any);
      this.state.pavimentosDisponiveis = pavimentos;

      if (pavimentos.length === 0) {
        return {
          mensagem: '🎉 Todas as etapas desta disciplina já estão concluídas!\n\nDescanse bem! 🌙',
          finalizado: true
        };
      }

      let mensagem = `📐 *${this.state.projectCode}* - Pavimentos\n\n`;

      pavimentos.forEach((pav: any, idx: number) => {
        mensagem += `${idx + 1}️⃣ *${pav.nome}* (peso ${pav.peso}%)\n`;
        mensagem += `   ${pav.etapas.length} etapa(s) pendente(s)\n\n`;
      });

      mensagem += `_Digite o número do pavimento_\n\n*0.* Voltar | *menu* — início`;

      this.goToStep('noite_etapa_pavimento');
      return { mensagem, finalizado: false };

    } else if (resposta === '2') {
      // Não concluiu etapa — finalizar
      return {
        mensagem: 'Descanse bem! 🌙',
        finalizado: true
      };

    } else {
      return {
        mensagem: '❌ Opção inválida. Digite *1* para Sim ou *2* para Não.',
        finalizado: false
      };
    }
  }

  private async stepNoiteEtapaPavimento(msg: string): Promise<FlowResult> {
    const escolha = parseInt(msg.trim()) - 1;

    if (isNaN(escolha) || escolha < 0 || escolha >= (this.state.pavimentosDisponiveis?.length || 0)) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.state.pavimentosDisponiveis?.length || 0}.`,
        finalizado: false
      };
    }

    const pavimento = this.state.pavimentosDisponiveis![escolha];
    this.state.selectedPavimentoId = pavimento.pavimento_id;
    this.state.selectedPavimentoNome = pavimento.nome;

    // Filtrar etapas pendentes
    const etapasPendentes = filterEtapasPendentes(pavimento.etapas as any);
    this.state.etapasDisponiveis = etapasPendentes;
    this.goToStep('noite_etapa_escolher');

    let mensagem = `📐 *${this.state.projectCode}* > *${pavimento.nome}*\n\n`;
    mensagem += `📋 Etapas pendentes:\n\n`;

    etapasPendentes.forEach((etapa: any, idx: number) => {
      mensagem += `${idx + 1}️⃣ ${etapa.nome} (peso ${etapa.peso}%)\n`;
    });

    mensagem += `\n_Digite o número da etapa para marcar como concluída_\n\n*0.* Voltar | *menu* — início`;
    return { mensagem, finalizado: false };
  }

  private async stepNoiteEtapaEscolher(msg: string): Promise<FlowResult> {
    const escolha = parseInt(msg.trim()) - 1;

    if (isNaN(escolha) || escolha < 0 || escolha >= (this.state.etapasDisponiveis?.length || 0)) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.state.etapasDisponiveis?.length || 0}.`,
        finalizado: false
      };
    }

    const etapa = this.state.etapasDisponiveis![escolha];

    // Marcar etapa como concluída
    const sucesso = await this.supabase.marcarEtapaConcluida(etapa.etapa_id, true);

    if (!sucesso) {
      return {
        mensagem: '❌ Erro ao marcar etapa. Tente novamente ou digite "menu".',
        finalizado: false
      };
    }

    // Buscar progresso atualizado (trigger já recalculou)
    const progresso = await this.supabase.buscarProgressoPonderado(this.state.selectedProjetoId!);

    let mensagem = `✅ Etapa marcada como concluída!\n\n`;
    mensagem += `🏗️ Pavimento: ${this.state.selectedPavimentoNome}\n`;
    mensagem += `✔️ Etapa: ${etapa.nome}\n`;
    mensagem += `⚡ *Andamento: ${progresso ?? 0}%*\n\n`;
    mensagem += `Deseja marcar outra etapa?\n\n`;
    mensagem += `1️⃣ Sim\n`;
    mensagem += `2️⃣ Não\n\n`;
    mensagem += `_Digite 1 ou 2_`;

    this.goToStep('noite_etapa_mais');
    return { mensagem, finalizado: false };
  }

  private async stepNoiteEtapaMais(msg: string): Promise<FlowResult> {
    const resposta = msg.trim();

    if (resposta === '1') {
      // Recarregar pavimentos com etapas pendentes atualizadas
      const pavimentos = await this.supabase.buscarPavimentosComEtapas(
        this.state.selectedProjetoId!,
        this.state.selectedAreaId
      );
      const pavimentosComPendencias = filterPavimentosPendentes(pavimentos as any);

      if (pavimentosComPendencias.length === 0) {
        const progresso = await this.supabase.buscarProgressoPonderado(this.state.selectedProjetoId!);
        return {
          mensagem: `✅ Todas as etapas do projeto estão concluídas!\n\n⚡ *Andamento: ${progresso ?? 0}%*\n\nDescanse bem! 🌙`,
          finalizado: true
        };
      }

      this.state.pavimentosDisponiveis = pavimentosComPendencias;

      let mensagem = `📐 *${this.state.projectCode}* - Pavimentos\n\n`;

      pavimentosComPendencias.forEach((pav: any, idx: number) => {
        mensagem += `${idx + 1}️⃣ *${pav.nome}* (peso ${pav.peso}%)\n`;
        mensagem += `   ${pav.etapas.length} etapa(s) pendente(s)\n\n`;
      });

      mensagem += `_Digite o número do pavimento_\n\n*0.* Voltar | *menu* — início`;

      this.goToStep('noite_etapa_pavimento');
      return { mensagem, finalizado: false };

    } else if (resposta === '2') {
      return {
        mensagem: 'Descanse bem! 🌙',
        finalizado: true
      };

    } else {
      return {
        mensagem: '❌ Opção inválida. Digite *1* para Sim ou *2* para Não.',
        finalizado: false
      };
    }
  }
}
