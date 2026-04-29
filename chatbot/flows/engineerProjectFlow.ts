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

  // Progresso Ponderado (integrado na noite)
  | 'noite_etapa_pergunta'
  | 'noite_etapa_pavimento'
  | 'noite_etapa_escolher'
  | 'noite_etapa_mais'

  | 'fim';

interface FlowState {
  step: FlowStep;
  stepHistory: FlowStep[];
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
      stepHistory: [],
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
      // COMANDO: VOLTAR
      // ═══════════════════════════════════════════
      if (msg.toLowerCase() === 'voltar' || msg === '0') {
        if (this.state.stepHistory.length > 0) {
          this.state.step = this.state.stepHistory.pop()!;
          return { mensagem: '⬅️ Voltando ao passo anterior...\n\nDigite sua opção:', finalizado: false };
        }
        return this.cancelar();
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
    }
    this.state.step = step;
  }

  private cancelar(): FlowResult {
    return {
      mensagem: '❌ *Fluxo cancelado*\n\nDigite "menu" para voltar ao início.',
      finalizado: true
    };
  }

  // =====================================================
  // STEPS: NOTIFICAÇÃO MATINAL
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
    this.goToStep('escolher_area_manha'); // Avançar step para receber escolha

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
    this.goToStep('status_atual_manha');
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
    this.goToStep('previsao_dia');

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
    this.goToStep('escolher_area_noite'); // Avançar step para receber escolha

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
      mensagem += `_Digite o número do motivo_`;

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
      mensagem += `${idx + 1}️⃣ *${proj.codigo}* - ${proj.cliente}\n`;
      mensagem += `   📦 Área: ${proj.area}\n`;
      mensagem += `   📊 Status: ${proj.status}\n`;
      mensagem += `   ⚡ Andamento: ${proj.percentual || 0}%\n`;
      const ponderado = await this.supabase.buscarProgressoPonderado(proj.projeto_id);
      if (ponderado !== null) {
        mensagem += `   📐 Progresso ponderado: ${ponderado}%\n`;
      }
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
    msg += `📊 Status: ${atribuicao.status}\n`;
    msg += `⚡ Andamento: ${atribuicao.percentual || 0}%\n`;
    const ponderado = await this.supabase.buscarProgressoPonderado(atribuicao.projeto_id);
    if (ponderado !== null) {
      msg += `📐 Progresso ponderado: ${ponderado}%\n`;
    }
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
      const atribuicoes = await this.buscarAtribuicoesEngenheiro();

      if (atribuicoes.length === 0) {
        return {
          mensagem: '📭 Você não tem projetos atribuídos no momento.',
          finalizado: true
        };
      }

      // Guardar todas as atribuições (com áreas) para uso posterior
      (this.state as any).todasAtribuicoes = atribuicoes;

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
    const areasUnicas = Array.from(
      new Map(areasDoProjeto.map(a => [String(a.area_id), a])).values()
    );

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
    mensagem += `\n_Digite o número da área_`;

    return { mensagem, finalizado: false };
  }

  private async stepProgressoEscolherArea(msg: string): Promise<FlowResult> {
    const areas = this.state.areasDisponiveisProjeto || [];
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
      return {
        mensagem: `⚠️ O projeto *${codigo}* ainda não tem pavimentos configurados.\n\nPeça ao gestor para configurar os pavimentos e etapas pelo dashboard.\n\n_Digite "menu" para voltar_`,
        finalizado: true
      };
    }

    // Filtrar pavimentos que ainda têm etapas pendentes
    const pavimentosComPendencias = pavimentos.filter(
      (p: any) => p.etapas.some((e: any) => !e.concluida)
    );

    if (pavimentosComPendencias.length === 0) {
      const progresso = await this.supabase.buscarProgressoPonderado(projetoId);
      return {
        mensagem: `✅ Todas as etapas do projeto *${codigo}* já estão concluídas!\n\n📊 Progresso ponderado: ${progresso ?? 0}%\n\n_Digite "menu" para voltar_`,
        finalizado: true
      };
    }

    this.state.pavimentosDisponiveis = pavimentosComPendencias;
    this.goToStep('progresso_escolher_pavimento');

    let mensagem = `📐 *${codigo}* - Pavimentos\n\n`;

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
    this.goToStep('progresso_escolher_etapa');

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
        ? pavimentoAtual.etapas.filter((e: any) => !e.concluida)
        : [];

      if (etapasPendentes.length === 0) {
        const progresso = await this.supabase.buscarProgressoPonderado(this.state.selectedProjetoId!);
        return {
          mensagem: `✅ Todas as etapas do pavimento *${this.state.selectedPavimentoNome}* já estão concluídas!\n\n📊 *Progresso ponderado: ${progresso ?? 0}%*\n\n_Digite "menu" para voltar ao menu principal_`,
          finalizado: true
        };
      }

      // Atualizar lista de pavimentos disponíveis e etapas pendentes
      this.state.pavimentosDisponiveis = pavimentos.filter(
        (p: any) => p.etapas.some((e: any) => !e.concluida)
      );
      this.state.etapasDisponiveis = etapasPendentes;

      let mensagem = `📐 *${this.state.selectedProjetoCodigo}* > *${this.state.selectedPavimentoNome}*\n\n`;
      mensagem += `Etapas pendentes:\n\n`;

      etapasPendentes.forEach((etapa: any, idx: number) => {
        mensagem += `${idx + 1}️⃣ ${etapa.nome} (peso ${etapa.peso}%)\n`;
      });

      mensagem += `\n_Digite o número da etapa para marcar como concluída_`;

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
      // Sim, concluiu etapa — mostrar pavimentos
      const pavimentos = this.state.pavimentosDisponiveis!;

      let mensagem = `📐 *${this.state.projectCode}* - Pavimentos\n\n`;

      pavimentos.forEach((pav: any, idx: number) => {
        const totalEtapas = pav.etapas.length;
        const concluidas = pav.etapas.filter((e: any) => e.concluida).length;
        mensagem += `${idx + 1}️⃣ *${pav.nome}* (peso ${pav.peso}%)\n`;
        mensagem += `   ${concluidas}/${totalEtapas} etapas concluídas\n\n`;
      });

      mensagem += `_Digite o número do pavimento_`;

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
    const etapasPendentes = pavimento.etapas.filter((e: any) => !e.concluida);
    this.state.etapasDisponiveis = etapasPendentes;
    this.goToStep('noite_etapa_escolher');

    let mensagem = `📐 *${this.state.projectCode}* > *${pavimento.nome}*\n\n`;
    mensagem += `📋 Etapas pendentes:\n\n`;

    etapasPendentes.forEach((etapa: any, idx: number) => {
      mensagem += `${idx + 1}️⃣ ${etapa.nome} (peso ${etapa.peso}%)\n`;
    });

    mensagem += `\n_Digite o número da etapa para marcar como concluída_`;
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
    mensagem += `📊 *Progresso ponderado: ${progresso ?? 0}%*\n\n`;
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
      const pavimentosComPendencias = pavimentos.filter(
        (p: any) => p.etapas.some((e: any) => !e.concluida)
      );

      if (pavimentosComPendencias.length === 0) {
        const progresso = await this.supabase.buscarProgressoPonderado(this.state.selectedProjetoId!);
        return {
          mensagem: `✅ Todas as etapas do projeto estão concluídas!\n\n📊 *Progresso ponderado: ${progresso ?? 0}%*\n\nDescanse bem! 🌙`,
          finalizado: true
        };
      }

      this.state.pavimentosDisponiveis = pavimentosComPendencias;

      let mensagem = `📐 *${this.state.projectCode}* - Pavimentos\n\n`;

      pavimentosComPendencias.forEach((pav: any, idx: number) => {
        const totalEtapas = pav.etapas.length;
        const concluidas = pav.etapas.filter((e: any) => e.concluida).length;
        mensagem += `${idx + 1}️⃣ *${pav.nome}* (peso ${pav.peso}%)\n`;
        mensagem += `   ${concluidas}/${totalEtapas} etapas concluídas\n\n`;
      });

      mensagem += `_Digite o número do pavimento_`;

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
