// =====================================================
// FLUXO: Funcionalidades do Dono da Empresa (REFATORADO)
// =====================================================
// Este fluxo gerencia as operações disponíveis para o dono:
// 1. Visualizar informações (por projeto, engenheiro, ou retrabalhos)
// 2. Distribuir projetos (existentes) para engenheiros
// 3. Criar novos projetos
// =====================================================

import { getSupabaseService, SupabaseService } from '../../integrations/supabase/supabaseService.ts';

// Lazy loading para evitar problemas com dotenv
let supabaseServiceInstance: SupabaseService | null = null;
function getSupabase(): SupabaseService {
  if (!supabaseServiceInstance) {
    supabaseServiceInstance = getSupabaseService();
  }
  return supabaseServiceInstance;
}

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface FlowResult {
  mensagem: string;
  finalizado: boolean;
  erro?: string;
}

type StepFunction = (mensagem: string) => Promise<FlowResult>;

type FlowMode = 'visualizar' | 'distribuir' | 'criar';
type VizTipo = 'projeto' | 'engenheiro' | 'retrabalhos';

// =====================================================
// CLASSE: OwnerFlow
// =====================================================

export class OwnerFlow {
  private whatsapp: string;
  private donoId?: string;
  private stepAtual: string;
  
  // Contexto unificado
  private contexto: {
    // Modo atual
    modo?: FlowMode;
    
    // Visualização
    viz_tipo?: VizTipo;
    viz_projeto_id?: string;
    viz_eng_id?: string;
    viz_area_id?: string;
    viz_atribuicao_id?: string;
    
    // Distribuição
    dist_eng_id?: string;
    dist_eng_nome?: string;
    dist_projeto_id?: string;
    dist_codigo_projeto?: string;
    dist_area_codigo?: string;
    dist_area_descricao?: string;
    dist_data_inicio?: string;
    dist_data_inicio_cliente?: string;
    dist_prazo_eng?: string;
    dist_prazo_cliente?: string;
    dist_observacoes?: string;
    
    // Criação
    criar_codigo?: string;
    criar_cliente?: string;
    criar_descricao?: string;
    
    // Listas
    engenheiros?: any[];
    projetos?: any[];
    areas?: any[];
    retrabalhos?: any[];
  } = {};

  constructor(whatsapp: string, donoId: string) {
    this.whatsapp = whatsapp;
    this.donoId = donoId;
    this.stepAtual = 'inicio';
  }

  // =====================================================
  // PROCESSAMENTO PRINCIPAL
  // =====================================================

  async processarMensagem(mensagem: string): Promise<FlowResult> {
    console.log(`\n🔷 OwnerFlow [${this.stepAtual}]: "${mensagem}"`);

    const steps: Record<string, StepFunction> = {
      inicio: this.stepInicio.bind(this),
      escolher_acao: this.stepEscolherAcao.bind(this),
      
      // Visualizar
      visualizar_menu: this.stepVisualizarMenu.bind(this),
      viz_listar_projetos: this.stepVizListarProjetos.bind(this),
      viz_escolher_projeto: this.stepVizEscolherProjeto.bind(this),
      viz_escolher_area_proj: this.stepVizEscolherAreaProjeto.bind(this),
      viz_mostrar_info: this.stepVizMostrarInfo.bind(this),
      viz_listar_engenheiros: this.stepVizListarEngenheiros.bind(this),
      viz_escolher_engenheiro: this.stepVizEscolherEngenheiro.bind(this),
      viz_listar_projetos_eng: this.stepVizListarProjetosEng.bind(this),
      viz_escolher_projeto_eng: this.stepVizEscolherProjetoEng.bind(this),
      viz_escolher_area_eng: this.stepVizEscolherAreaEng.bind(this),
      viz_historico_menu: this.stepVizHistoricoMenu.bind(this),
      viz_escolher_filtro_ret: this.stepVizEscolherFiltroRet.bind(this),
      viz_filtrar_ret_projeto: this.stepVizFiltrarRetProjeto.bind(this),
      viz_filtrar_ret_engenheiro: this.stepVizFiltrarRetEngenheiro.bind(this),
      viz_mostrar_retrabalhos: this.stepVizMostrarRetrabalhos.bind(this),
      
      // Distribuir
      dist_escolher_engenheiro: this.stepDistEscolherEngenheiro.bind(this),
      dist_escolher_projeto: this.stepDistEscolherProjeto.bind(this),
      dist_escolher_area: this.stepDistEscolherArea.bind(this),
      dist_data_inicio: this.stepDistDataInicio.bind(this),
      dist_data_inicio_cliente: this.stepDistDataInicioCliente.bind(this),
      dist_prazo_eng: this.stepDistPrazoEng.bind(this),
      dist_prazo_cliente: this.stepDistPrazoCliente.bind(this),
      dist_observacoes: this.stepDistObservacoes.bind(this),
      dist_confirmar: this.stepDistConfirmar.bind(this),
      
      // Criar
      criar_codigo: this.stepCriarCodigo.bind(this),
      criar_cliente: this.stepCriarCliente.bind(this),
      criar_descricao: this.stepCriarDescricao.bind(this),
      criar_confirmar: this.stepCriarConfirmar.bind(this),
    };

    const stepFunction = steps[this.stepAtual];
    
    if (!stepFunction) {
      console.error(`❌ Step "${this.stepAtual}" não encontrado`);
      return {
        mensagem: '❌ Erro interno. Digite "menu" para recomeçar.',
        finalizado: true,
      };
    }

    // Comandos globais
    if (mensagem.toLowerCase().trim() === 'menu') {
      this.stepAtual = 'escolher_acao';
      this.contexto = {};
      return this.stepEscolherAcao('');
    }

    try {
      return await stepFunction(mensagem);
    } catch (error: any) {
      console.error(`❌ Erro no step ${this.stepAtual}:`, error);
      return {
        mensagem: `❌ Erro: ${error.message}\n\nDigite "menu" para recomeçar.`,
        finalizado: true,
        erro: error.message,
      };
    }
  }

  // =====================================================
  // STEPS PRINCIPAIS
  // =====================================================

  private async stepInicio(mensagem: string): Promise<FlowResult> {
    this.stepAtual = 'escolher_acao';
    
    return {
      mensagem: `👔 *Bem-vindo, Dono!*\n\n` +
                `O que deseja fazer?\n\n` +
                `1️⃣ Visualizar informações\n` +
                `2️⃣ Distribuir projeto para engenheiro\n` +
                `3️⃣ Criar novo projeto\n\n` +
                `_Digite o número da opção desejada_`,
      finalizado: false,
    };
  }

  private async stepEscolherAcao(mensagem: string): Promise<FlowResult> {
    const opcao = mensagem.trim();

    switch (opcao) {
      case '1':
        this.contexto.modo = 'visualizar';
        this.stepAtual = 'visualizar_menu';
        return {
          mensagem: `📊 *Visualizar Informações*\n\n` +
                    `Escolha o tipo de visualização:\n\n` +
                    `a) Por Projeto\n` +
                    `b) Por Engenheiro\n` +
                    `c) Histórico de Retrabalhos\n\n` +
                    `_Digite a letra da opção (a, b ou c)_`,
          finalizado: false,
        };
      
      case '2':
        this.contexto.modo = 'distribuir';
        return await this.iniciarDistribuicao();
      
      case '3':
        this.contexto.modo = 'criar';
        this.stepAtual = 'criar_codigo';
        return {
          mensagem: `🆕 *Criar Novo Projeto*\n\n` +
                    `Digite o código do projeto\n` +
                    `(ex: PRJ-009, RES-2024-15)\n\n` +
                    `_Digite o código_`,
          finalizado: false,
        };
      
      default:
        return {
          mensagem: `❌ Opção inválida.\n\n` +
                    `Digite:\n` +
                    `1️⃣ - Visualizar informações\n` +
                    `2️⃣ - Distribuir projeto\n` +
                    `3️⃣ - Criar novo projeto`,
          finalizado: false,
        };
    }
  }

  // =====================================================
  // FLUXO 1: VISUALIZAR
  // =====================================================

  private async stepVisualizarMenu(mensagem: string): Promise<FlowResult> {
    const opcao = mensagem.toLowerCase().trim();

    switch (opcao) {
      case 'a':
        this.contexto.viz_tipo = 'projeto';
        return await this.listarProjetosParaViz();
      
      case 'b':
        this.contexto.viz_tipo = 'engenheiro';
        return await this.listarEngenheirosParaViz();
      
      case 'c':
        this.contexto.viz_tipo = 'retrabalhos';
        this.stepAtual = 'viz_historico_menu';
        return {
          mensagem: `📋 *Histórico de Retrabalhos*\n\n` +
                    `Como deseja visualizar?\n\n` +
                    `1️⃣ Ver todos os retrabalhos\n` +
                    `2️⃣ Filtrar por projeto\n` +
                    `3️⃣ Filtrar por engenheiro\n\n` +
                    `_Digite o número da opção_`,
          finalizado: false,
        };
      
      default:
        return {
          mensagem: `❌ Opção inválida.\n\n` +
                    `Digite:\n` +
                    `a) Por Projeto\n` +
                    `b) Por Engenheiro\n` +
                    `c) Histórico de Retrabalhos`,
          finalizado: false,
        };
    }
  }

  // 1a) Por Projeto
  private async listarProjetosParaViz(): Promise<FlowResult> {
    const resultado = await getSupabase().listarTodosProjetos();
    
    if (!resultado.success || !resultado.data || resultado.data.length === 0) {
      return {
        mensagem: `📭 Nenhum projeto encontrado.\n\n_Digite "menu" para voltar_`,
        finalizado: true,
      };
    }

    this.contexto.projetos = resultado.data;
    this.stepAtual = 'viz_escolher_projeto';

    let msg = `📋 *Escolha o Projeto:*\n\n`;
    resultado.data.forEach((proj: any, idx: number) => {
      msg += `${idx + 1}️⃣ ${proj.codigo_projeto} - ${proj.cliente}\n`;
    });
    msg += `\n_Digite o número do projeto_`;

    return { mensagem: msg, finalizado: false };
  }

  private async stepVizListarProjetos(mensagem: string): Promise<FlowResult> {
    return await this.listarProjetosParaViz();
  }

  private async stepVizEscolherProjeto(mensagem: string): Promise<FlowResult> {
    const escolha = parseInt(mensagem.trim()) - 1;
    
    if (isNaN(escolha) || escolha < 0 || escolha >= (this.contexto.projetos?.length || 0)) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.contexto.projetos?.length}`,
        finalizado: false,
      };
    }

    const projeto = this.contexto.projetos![escolha];
    this.contexto.viz_projeto_id = projeto.projeto_id;

    // Buscar áreas do projeto
    const resultado = await getSupabase().buscarAreasDoProjeto(projeto.projeto_id);
    
    if (!resultado.success || !resultado.data || resultado.data.length === 0) {
      return {
        mensagem: `⚠️ Este projeto não possui áreas cadastradas.\n\n_Digite "menu" para voltar_`,
        finalizado: true,
      };
    }

    this.contexto.areas = resultado.data;
    this.stepAtual = 'viz_escolher_area_proj';

    let msg = `📦 *Áreas do Projeto ${projeto.codigo_projeto}:*\n\n`;
    resultado.data.forEach((area: any, idx: number) => {
      msg += `${idx + 1}️⃣ ${area.descricao}\n`;
    });
    msg += `\n_Digite o número da área_`;

    return { mensagem: msg, finalizado: false };
  }

  private async stepVizEscolherAreaProjeto(mensagem: string): Promise<FlowResult> {
    const escolha = parseInt(mensagem.trim()) - 1;
    
    if (isNaN(escolha) || escolha < 0 || escolha >= (this.contexto.areas?.length || 0)) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.contexto.areas?.length}`,
        finalizado: false,
      };
    }

    const area = this.contexto.areas![escolha];
    this.contexto.viz_area_id = area.area_id;
    
    return await this.mostrarInformacoesCompletas();
  }

  // 1b) Por Engenheiro
  private async listarEngenheirosParaViz(): Promise<FlowResult> {
    const resultado = await getSupabase().listarEngenheiros();
    
    if (!resultado.success || !resultado.data || resultado.data.length === 0) {
      return {
        mensagem: `📭 Nenhum engenheiro encontrado.\n\n_Digite "menu" para voltar_`,
        finalizado: true,
      };
    }

    this.contexto.engenheiros = resultado.data;
    this.stepAtual = 'viz_escolher_engenheiro';

    let msg = `👨‍💼 *Escolha o Engenheiro:*\n\n`;
    resultado.data.forEach((eng: any, idx: number) => {
      msg += `${idx + 1}️⃣ ${eng.nome}\n`;
    });
    msg += `\n_Digite o número do engenheiro_`;

    return { mensagem: msg, finalizado: false };
  }

  private async stepVizListarEngenheiros(mensagem: string): Promise<FlowResult> {
    return await this.listarEngenheirosParaViz();
  }

  private async stepVizEscolherEngenheiro(mensagem: string): Promise<FlowResult> {
    const escolha = parseInt(mensagem.trim()) - 1;
    
    if (isNaN(escolha) || escolha < 0 || escolha >= (this.contexto.engenheiros?.length || 0)) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.contexto.engenheiros?.length}`,
        finalizado: false,
      };
    }

    const eng = this.contexto.engenheiros![escolha];
    this.contexto.viz_eng_id = eng.eng_id;
    
    // Buscar projetos do engenheiro
    const resultado = await getSupabase().buscarProjetosPorEngenheiro(eng.eng_id);
    
    if (!resultado.success || !resultado.data || resultado.data.length === 0) {
      return {
        mensagem: `📭 ${eng.nome} não possui projetos atribuídos.\n\n_Digite "menu" para voltar_`,
        finalizado: true,
      };
    }

    this.contexto.projetos = resultado.data;
    this.stepAtual = 'viz_escolher_projeto_eng';

    let msg = `📋 *Projetos de ${eng.nome}:*\n\n`;
    resultado.data.forEach((proj: any, idx: number) => {
      msg += `${idx + 1}️⃣ ${proj.codigo_projeto} - ${proj.area_descricao}\n`;
    });
    msg += `\n_Digite o número do projeto_`;

    return { mensagem: msg, finalizado: false };
  }

  private async stepVizListarProjetosEng(mensagem: string): Promise<FlowResult> {
    // Recarrega lista caso necessário
    return { mensagem: 'Recarregando...', finalizado: false };
  }

  private async stepVizEscolherProjetoEng(mensagem: string): Promise<FlowResult> {
    const escolha = parseInt(mensagem.trim()) - 1;
    
    if (isNaN(escolha) || escolha < 0 || escolha >= (this.contexto.projetos?.length || 0)) {
    return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.contexto.projetos?.length}`,
      finalizado: false,
    };
  }

    const proj = this.contexto.projetos![escolha];
    this.contexto.viz_projeto_id = proj.projeto_id;
    this.contexto.viz_area_id = proj.area_id;
    this.contexto.viz_atribuicao_id = proj.atribuicao_id;
    
    return await this.mostrarInformacoesCompletas();
  }

  private async stepVizEscolherAreaEng(mensagem: string): Promise<FlowResult> {
    // Implementar se necessário (quando engenheiro tem múltiplas áreas no mesmo projeto)
    return { mensagem: 'Em implementação', finalizado: true };
  }

  // 1c) Histórico Retrabalhos
  private async stepVizHistoricoMenu(mensagem: string): Promise<FlowResult> {
    const opcao = mensagem.trim();

    switch (opcao) {
      case '1':
        // Ver todos
        return await this.carregarRetrabalhos();
      
      case '2':
        // Filtrar por projeto
        this.stepAtual = 'viz_filtrar_ret_projeto';
        return await this.listarProjetosParaViz();
      
      case '3':
        // Filtrar por engenheiro
        this.stepAtual = 'viz_filtrar_ret_engenheiro';
        return await this.listarEngenheirosParaViz();
      
      default:
        return {
          mensagem: `❌ Opção inválida.\n\nDigite 1, 2 ou 3`,
          finalizado: false,
        };
    }
  }

  private async stepVizEscolherFiltroRet(mensagem: string): Promise<FlowResult> {
    return { mensagem: 'Em processamento', finalizado: false };
  }

  private async stepVizFiltrarRetProjeto(mensagem: string): Promise<FlowResult> {
    const escolha = parseInt(mensagem.trim()) - 1;
    
    if (isNaN(escolha) || escolha < 0 || escolha >= (this.contexto.projetos?.length || 0)) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.contexto.projetos?.length}`,
        finalizado: false,
      };
    }

    const projeto = this.contexto.projetos![escolha];
    return await this.carregarRetrabalhos({ projetoId: projeto.projeto_id });
  }

  private async stepVizFiltrarRetEngenheiro(mensagem: string): Promise<FlowResult> {
    const escolha = parseInt(mensagem.trim()) - 1;
    
    if (isNaN(escolha) || escolha < 0 || escolha >= (this.contexto.engenheiros?.length || 0)) {
    return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.contexto.engenheiros?.length}`,
      finalizado: false,
    };
  }

    const eng = this.contexto.engenheiros![escolha];
    return await this.carregarRetrabalhos({ engId: eng.eng_id });
  }

  private async carregarRetrabalhos(filters?: { engId?: string; projetoId?: string }): Promise<FlowResult> {
    const resultado = await getSupabase().buscarHistoricoRetrabalhos(filters);
    
    if (!resultado.success || !resultado.data || resultado.data.length === 0) {
    return {
        mensagem: `📭 Nenhum retrabalho encontrado.\n\n_Digite "menu" para voltar_`,
        finalizado: true,
      };
    }

    this.contexto.retrabalhos = resultado.data;
    this.stepAtual = 'viz_mostrar_retrabalhos';
    
    let msg = `🔄 *Histórico de Retrabalhos*\n\n`;
    msg += `Total: ${resultado.data.length} retrabalho(s)\n\n`;
    
    resultado.data.slice(0, 10).forEach((ret: any) => {
      msg += `📅 ${ret.data_retrabalho}\n`;
      msg += `👷 ${ret.engenheiro_nome}\n`;
      msg += `📋 ${ret.codigo_projeto} - ${ret.area_descricao}\n`;
      msg += `❗ Motivo: ${ret.motivo_retrabalho}\n`;
      if (ret.tipo_retrabalho) {
        msg += `🔖 Tipo: ${ret.tipo_retrabalho}\n`;
      }
      msg += `\n`;
    });
    
    if (resultado.data.length > 10) {
      msg += `_...e mais ${resultado.data.length - 10} retrabalho(s)_\n\n`;
    }
    
    msg += `_Digite "menu" para voltar ao menu principal_`;
    
    return { mensagem: msg, finalizado: true };
  }

  private async stepVizMostrarRetrabalhos(mensagem: string): Promise<FlowResult> {
    return { mensagem: 'Digite "menu" para voltar', finalizado: true };
  }

  // Mostrar informações completas
  private async stepVizMostrarInfo(mensagem: string): Promise<FlowResult> {
    return await this.mostrarInformacoesCompletas();
  }

  private async mostrarInformacoesCompletas(): Promise<FlowResult> {
    const resultado = await getSupabase().buscarProjetoDetalhado(this.contexto.viz_projeto_id!);
    
    if (!resultado.success || !resultado.data || resultado.data.length === 0) {
      return {
        mensagem: `❌ Erro ao buscar informações do projeto.\n\n_Digite "menu" para voltar_`,
        finalizado: true,
      };
    }

    // Filtrar pela área se especificada
    let dados = resultado.data;
    if (this.contexto.viz_area_id) {
      dados = dados.filter((d: any) => d.area_id == this.contexto.viz_area_id);
    }

    if (dados.length === 0) {
      return {
        mensagem: `⚠️ Nenhuma informação encontrada.\n\n_Digite "menu" para voltar_`,
        finalizado: true,
      };
    }

    const info = dados[0];
    
    // Buscar última atualização noturna do engenheiro
    let ultimaAtualizacao = null;
    if (info.atribuicao_id) {
      const resultadoAtualizacao = await getSupabase().buscarUltimaAtualizacaoNoturna(info.atribuicao_id);
      if (resultadoAtualizacao.success && resultadoAtualizacao.data) {
        ultimaAtualizacao = resultadoAtualizacao.data;
      }
    }
    
    let msg = `📊 *Informações Completas*\n\n`;
    msg += `📋 *Projeto:* ${info.codigo_projeto}\n`;
    msg += `👤 *Cliente:* ${info.cliente}\n`;
    msg += `📦 *Área:* ${info.area_descricao}\n`;
    msg += `👷 *Engenheiro:* ${info.engenheiro_nome}\n\n`;
    
    msg += `📈 *Status:* ${info.status_descricao || 'N/A'}\n`;
    msg += `⚡ *Andamento:* ${info.percentual_andamento}%\n\n`;
    
    msg += `📅 *Data Início:* ${info.data_inicio || 'N/A'}\n`;
    msg += `⏰ *Data Prevista:* ${info.data_prevista || 'N/A'}\n`;
    if (info.data_conclusao) {
      msg += `✅ *Concluído em:* ${info.data_conclusao}\n`;
    }
    msg += `\n`;
    
    if (info.prazo_final_eng || info.prazo_final_cliente) {
      msg += `⏱️ *Prazos:*\n`;
      if (info.prazo_final_eng) {
        msg += `  • Interno: ${info.prazo_final_eng}`;
        if (info.prazo_interno_dias) {
          msg += ` (${info.prazo_interno_dias} dias)`;
        }
        msg += `\n`;
      }
      if (info.prazo_final_cliente) {
        msg += `  • Cliente: ${info.prazo_final_cliente}`;
        if (info.prazo_cliente_dias) {
          msg += ` (${info.prazo_cliente_dias} dias)`;
        }
        msg += `\n`;
      }
      msg += `\n`;
    }
    
    if (info.quantidade_retrabalhos > 0) {
      msg += `🔄 *Retrabalhos:* ${info.quantidade_retrabalhos}\n`;
      msg += `📊 *Taxa:* ${info.percentual_retrabalhos}%\n\n`;
    }
    
    if (info.dias_atraso > 0) {
      msg += `⚠️ *Atraso:* ${info.dias_atraso} dia(s)\n\n`;
    }
    
    // Adicionar última atualização do engenheiro (NOVO!)
    if (ultimaAtualizacao) {
      msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `🌙 *Última Atualização Noturna*\n\n`;
      
      if (ultimaAtualizacao.feito_texto) {
        const dataFormatada = ultimaAtualizacao.data_registro 
          ? new Date(ultimaAtualizacao.data_registro).toLocaleDateString('pt-BR')
          : 'N/A';
        msg += `📅 Data: ${dataFormatada}\n`;
        msg += `✅ *Feito:* ${ultimaAtualizacao.feito_texto}\n\n`;
      }
      
      if (ultimaAtualizacao.observacoes) {
        msg += `💬 *Observações:* ${ultimaAtualizacao.observacoes}\n\n`;
      }
    }
    
    msg += `_Digite "menu" para voltar ao menu principal_`;
    
    this.stepAtual = 'viz_mostrar_info';
    return { mensagem: msg, finalizado: true };
  }

  // =====================================================
  // FLUXO 2: DISTRIBUIR
  // =====================================================

  private async iniciarDistribuicao(): Promise<FlowResult> {
    const resultado = await getSupabase().listarEngenheiros();
    
    if (!resultado.success || !resultado.data || resultado.data.length === 0) {
      return {
        mensagem: `❌ Nenhum engenheiro cadastrado.\n\n_Digite "menu" para voltar_`,
        finalizado: true,
      };
    }

    this.contexto.engenheiros = resultado.data;
    this.stepAtual = 'dist_escolher_engenheiro';

    let msg = `👨‍💼 *Escolha o Engenheiro:*\n\n`;
    resultado.data.forEach((eng: any, idx: number) => {
      msg += `${idx + 1}️⃣ ${eng.nome}\n`;
    });
    msg += `\n_Digite o número do engenheiro_`;

    return { mensagem: msg, finalizado: false };
  }

  private async stepDistEscolherEngenheiro(mensagem: string): Promise<FlowResult> {
    const escolha = parseInt(mensagem.trim()) - 1;
    
    if (isNaN(escolha) || escolha < 0 || escolha >= (this.contexto.engenheiros?.length || 0)) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.contexto.engenheiros?.length}`,
        finalizado: false,
      };
    }

    const eng = this.contexto.engenheiros![escolha];
    this.contexto.dist_eng_id = eng.eng_id;
    this.contexto.dist_eng_nome = eng.nome;
    
    // Listar projetos existentes
    const resultado = await getSupabase().listarTodosProjetos();
    
    if (!resultado.success || !resultado.data || resultado.data.length === 0) {
      return {
        mensagem: `❌ Nenhum projeto cadastrado.\n\n` +
                  `Use a opção "3 - Criar novo projeto" no menu principal.\n\n` +
                  `_Digite "menu" para voltar_`,
        finalizado: true,
      };
    }

    this.contexto.projetos = resultado.data;
    this.stepAtual = 'dist_escolher_projeto';

    let msg = `📋 *Escolha o Projeto:*\n\n`;
    resultado.data.forEach((proj: any, idx: number) => {
      msg += `${idx + 1}️⃣ ${proj.codigo_projeto} - ${proj.cliente}\n`;
    });
    msg += `\n_Digite o número do projeto_`;

    return { mensagem: msg, finalizado: false };
  }

  private async stepDistEscolherProjeto(mensagem: string): Promise<FlowResult> {
    const escolha = parseInt(mensagem.trim()) - 1;
    
    if (isNaN(escolha) || escolha < 0 || escolha >= (this.contexto.projetos?.length || 0)) {
    return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.contexto.projetos?.length}`,
      finalizado: false,
    };
  }

    const projeto = this.contexto.projetos![escolha];
    this.contexto.dist_projeto_id = projeto.projeto_id;
    this.contexto.dist_codigo_projeto = projeto.codigo_projeto;
    
    // Listar áreas disponíveis
    const resultado = await getSupabase().listarAreasDisponiveis();
    
    if (!resultado || resultado.length === 0) {
      return {
        mensagem: `❌ Nenhuma área disponível.\n\n_Digite "menu" para voltar_`,
        finalizado: true,
      };
    }

    this.contexto.areas = resultado;
    this.stepAtual = 'dist_escolher_area';

    let msg = `📦 *Escolha a Área:*\n\n`;
    resultado.forEach((area: any, idx: number) => {
      msg += `${idx + 1}️⃣ ${area.descricao} (${area.tempo_trabalho_dias} dias)\n`;
    });
    msg += `\n_Digite o número da área_`;

    return { mensagem: msg, finalizado: false };
  }

  private async stepDistEscolherArea(mensagem: string): Promise<FlowResult> {
    const escolha = parseInt(mensagem.trim()) - 1;
    
    if (isNaN(escolha) || escolha < 0 || escolha >= (this.contexto.areas?.length || 0)) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.contexto.areas?.length}`,
        finalizado: false,
      };
    }

    const area = this.contexto.areas![escolha];
    this.contexto.dist_area_codigo = area.codigo;
    this.contexto.dist_area_descricao = area.descricao;

    this.stepAtual = 'dist_data_inicio';
    return {
      mensagem: `📅 *Data de Início*\n\n` +
                `Digite a data de início do projeto\n` +
                `Formato: DD/MM/AAAA\n` +
                `Ou digite "hoje" para usar a data atual\n\n` +
                `_Digite a data_`,
      finalizado: false,
    };
  }

  private async stepDistDataInicio(mensagem: string): Promise<FlowResult> {
    const input = mensagem.trim().toLowerCase();
    let data: string;
    
    if (input === 'hoje') {
      data = new Date().toISOString().split('T')[0];
    } else {
      // Validar formato DD/MM/AAAA
      const partes = input.split('/');
      if (partes.length !== 3) {
        return {
          mensagem: `❌ Formato inválido.\n\n` +
                    `Use: DD/MM/AAAA ou digite "hoje"`,
          finalizado: false,
        };
      }
      
      const dia = parseInt(partes[0]);
      const mes = parseInt(partes[1]);
      const ano = parseInt(partes[2]);
      
      if (isNaN(dia) || isNaN(mes) || isNaN(ano) || dia < 1 || dia > 31 || mes < 1 || mes > 12) {
        return {
          mensagem: `❌ Data inválida.\n\n` +
                    `Use: DD/MM/AAAA (ex: 20/01/2026)`,
          finalizado: false,
        };
      }
      
      // Converter para formato ISO (YYYY-MM-DD)
      data = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    }
    
    this.contexto.dist_data_inicio = data;
    this.stepAtual = 'dist_data_inicio_cliente';
    
    return {
      mensagem: `📅 *Data de Início Esperada pelo Cliente* (opcional)\n\n` +
                `Digite a data esperada pelo cliente\n` +
                `Formato: DD/MM/AAAA\n` +
                `Ou digite "pular" para não informar\n\n` +
                `_Digite a data ou "pular"_`,
      finalizado: false,
    };
  }

  private async stepDistDataInicioCliente(mensagem: string): Promise<FlowResult> {
    const input = mensagem.trim().toLowerCase();
      
    if (input !== 'pular') {
      const partes = input.split('/');
      if (partes.length !== 3) {
        return {
          mensagem: `❌ Formato inválido.\n\n` +
                    `Use: DD/MM/AAAA ou digite "pular"`,
          finalizado: false,
        };
      }

      const dia = parseInt(partes[0]);
      const mes = parseInt(partes[1]);
      const ano = parseInt(partes[2]);
      
      if (isNaN(dia) || isNaN(mes) || isNaN(ano) || dia < 1 || dia > 31 || mes < 1 || mes > 12) {
        return {
          mensagem: `❌ Data inválida.\n\n` +
                    `Use: DD/MM/AAAA ou digite "pular"`,
          finalizado: false,
        };
      }

      this.contexto.dist_data_inicio_cliente = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    }

    this.stepAtual = 'dist_prazo_eng';
    return {
      mensagem: `⏰ *Prazo Final Interno (Engenheiro)*\n\n` +
                `Digite o prazo final interno\n` +
                `Formato: DD/MM/AAAA\n\n` +
                `_Digite a data_`,
      finalizado: false,
    };
  }

  private async stepDistPrazoEng(mensagem: string): Promise<FlowResult> {
    const input = mensagem.trim();
    const partes = input.split('/');
    
    if (partes.length !== 3) {
      return {
        mensagem: `❌ Formato inválido.\n\nUse: DD/MM/AAAA`,
        finalizado: false,
      };
    }

    const dia = parseInt(partes[0]);
    const mes = parseInt(partes[1]);
    const ano = parseInt(partes[2]);

    if (isNaN(dia) || isNaN(mes) || isNaN(ano) || dia < 1 || dia > 31 || mes < 1 || mes > 12) {
    return {
        mensagem: `❌ Data inválida.\n\nUse: DD/MM/AAAA (ex: 15/02/2026)`,
      finalizado: false,
    };
  }

    const prazoEng = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

    // Validar: prazo_eng >= data_inicio
    if (prazoEng < this.contexto.dist_data_inicio!) {
      return {
        mensagem: `❌ O prazo interno deve ser maior ou igual à data de início.\n\n` +
                  `Data início: ${this.contexto.dist_data_inicio}\n\n` +
                  `Digite um prazo válido:`,
        finalizado: false,
      };
    }
    
    this.contexto.dist_prazo_eng = prazoEng;
    this.stepAtual = 'dist_prazo_cliente';

    return {
      mensagem: `📆 *Prazo Final para o Cliente*\n\n` +
                `Digite o prazo final para o cliente\n` +
                `Formato: DD/MM/AAAA\n\n` +
                `_Digite a data_`,
      finalizado: false,
    };
  }

  private async stepDistPrazoCliente(mensagem: string): Promise<FlowResult> {
    const input = mensagem.trim();
    const partes = input.split('/');
    
    if (partes.length !== 3) {
      return {
        mensagem: `❌ Formato inválido.\n\nUse: DD/MM/AAAA`,
        finalizado: false,
      };
    }
    
    const dia = parseInt(partes[0]);
    const mes = parseInt(partes[1]);
    const ano = parseInt(partes[2]);
    
    if (isNaN(dia) || isNaN(mes) || isNaN(ano) || dia < 1 || dia > 31 || mes < 1 || mes > 12) {
      return {
        mensagem: `❌ Data inválida.\n\nUse: DD/MM/AAAA (ex: 28/02/2026)`,
        finalizado: false,
      };
    }
    
    const prazoCliente = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    
    // Validar: prazo_cliente >= prazo_eng
    if (prazoCliente < this.contexto.dist_prazo_eng!) {
      return {
        mensagem: `❌ O prazo do cliente deve ser maior ou igual ao prazo interno.\n\n` +
                  `Prazo interno: ${this.contexto.dist_prazo_eng}\n\n` +
                  `Digite um prazo válido:`,
        finalizado: false,
      };
    }
    
    this.contexto.dist_prazo_cliente = prazoCliente;
    this.stepAtual = 'dist_observacoes';
    
    return {
      mensagem: `📝 *Observações* (opcional)\n\n` +
                `Digite observações sobre a distribuição\n` +
                `Ou digite "pular" para não incluir observações\n\n` +
                `_Digite o texto ou "pular"_`,
      finalizado: false,
    };
  }

  private async stepDistObservacoes(mensagem: string): Promise<FlowResult> {
    const input = mensagem.trim();
    
    if (input.toLowerCase() !== 'pular') {
      this.contexto.dist_observacoes = input;
    }
    
    this.stepAtual = 'dist_confirmar';
    
    let resumo = `✅ *Confirmar Distribuição*\n\n`;
    resumo += `👷 *Engenheiro:* ${this.contexto.dist_eng_nome}\n`;
    resumo += `📋 *Projeto:* ${this.contexto.dist_codigo_projeto}\n`;
    resumo += `📦 *Área:* ${this.contexto.dist_area_descricao}\n\n`;
    resumo += `📅 *Data Início:* ${this.contexto.dist_data_inicio}\n`;
    if (this.contexto.dist_data_inicio_cliente) {
      resumo += `📅 *Início Cliente:* ${this.contexto.dist_data_inicio_cliente}\n`;
    }
    resumo += `⏰ *Prazo Interno:* ${this.contexto.dist_prazo_eng}\n`;
    resumo += `📆 *Prazo Cliente:* ${this.contexto.dist_prazo_cliente}\n`;
    if (this.contexto.dist_observacoes) {
      resumo += `📝 *Observações:* ${this.contexto.dist_observacoes}\n`;
    }
    resumo += `\n1️⃣ Confirmar\n`;
    resumo += `2️⃣ Cancelar\n\n`;
    resumo += `_Digite 1 para confirmar ou 2 para cancelar_`;
    
    return { mensagem: resumo, finalizado: false };
  }

  private async stepDistConfirmar(mensagem: string): Promise<FlowResult> {
    const opcao = mensagem.trim();

    if (opcao === '2') {
      this.contexto = {};
      this.stepAtual = 'escolher_acao';
      return {
        mensagem: `❌ Distribuição cancelada.\n\n` +
                  `_Digite "menu" para voltar ao menu principal_`,
        finalizado: true,
      };
    }

    if (opcao !== '1') {
      return {
        mensagem: `❌ Opção inválida.\n\nDigite 1 para confirmar ou 2 para cancelar`,
        finalizado: false,
      };
    }
    
    // Executar distribuição
    const resultado = await getSupabase().distribuirProjetoComPrazos({
      dono_id: this.donoId!,
      eng_id: this.contexto.dist_eng_id!,
      projeto_id: this.contexto.dist_projeto_id!,
      area_codigo: this.contexto.dist_area_codigo!,
      data_inicio: this.contexto.dist_data_inicio!,
      data_inicio_esperada_cliente: this.contexto.dist_data_inicio_cliente,
      prazo_final_eng: this.contexto.dist_prazo_eng!,
      prazo_final_cliente: this.contexto.dist_prazo_cliente!,
      observacoes: this.contexto.dist_observacoes,
    });

    if (!resultado.success) {
      return {
        mensagem: `❌ Erro ao distribuir projeto:\n\n${resultado.error}\n\n` +
                  `_Digite "menu" para voltar_`,
        finalizado: true,
      };
    }
    
    const resposta = resultado.data;
    
    let msg = `✅ ${resposta.mensagem || 'Projeto distribuído com sucesso!'}\n\n`;
    if (resposta.detalhes) {
      msg += `📋 Detalhes:\n`;
      msg += `  • Engenheiro: ${resposta.detalhes.engenheiro}\n`;
      msg += `  • Projeto: ${resposta.detalhes.projeto}\n`;
      msg += `  • Área: ${resposta.detalhes.area}\n`;
      msg += `  • Início: ${resposta.detalhes.data_inicio}\n`;
      msg += `  • Prazo Interno: ${resposta.detalhes.prazo_eng}\n`;
      msg += `  • Prazo Cliente: ${resposta.detalhes.prazo_cliente}\n\n`;
    }
    msg += `📱 Notificação enviada ao engenheiro!\n\n`;
    msg += `_Digite "menu" para voltar ao menu principal_`;
    
    this.contexto = {};
    return { mensagem: msg, finalizado: true };
  }

  // =====================================================
  // FLUXO 3: CRIAR PROJETO
  // =====================================================

  private async stepCriarCodigo(mensagem: string): Promise<FlowResult> {
    const codigo = mensagem.trim().toUpperCase();
    
    if (codigo.length < 3) {
      return {
        mensagem: `❌ Código muito curto.\n\nDigite um código com pelo menos 3 caracteres:`,
        finalizado: false,
      };
    }

    this.contexto.criar_codigo = codigo;
    this.stepAtual = 'criar_cliente';

    return {
      mensagem: `👤 *Nome do Cliente*\n\n` +
                `Digite o nome do cliente\n\n` +
                `_Digite o nome_`,
      finalizado: false,
    };
  }

  private async stepCriarCliente(mensagem: string): Promise<FlowResult> {
    const cliente = mensagem.trim();
    
    if (cliente.length < 2) {
      return {
        mensagem: `❌ Nome muito curto.\n\nDigite um nome válido:`,
        finalizado: false,
      };
    }
    
    this.contexto.criar_cliente = cliente;
    this.stepAtual = 'criar_descricao';
    
    return {
      mensagem: `📝 *Descrição do Projeto*\n\n` +
                `Digite uma descrição para o projeto\n\n` +
                `_Digite a descrição_`,
      finalizado: false,
    };
  }

  private async stepCriarDescricao(mensagem: string): Promise<FlowResult> {
    const descricao = mensagem.trim();
    
    if (descricao.length < 3) {
      return {
        mensagem: `❌ Descrição muito curta.\n\nDigite uma descrição com pelo menos 3 caracteres:`,
        finalizado: false,
      };
    }
    
    this.contexto.criar_descricao = descricao;
    this.stepAtual = 'criar_confirmar';
    
    let resumo = `✅ *Confirmar Criação de Projeto*\n\n`;
    resumo += `🔢 *Código:* ${this.contexto.criar_codigo}\n`;
    resumo += `👤 *Cliente:* ${this.contexto.criar_cliente}\n`;
    resumo += `📝 *Descrição:* ${this.contexto.criar_descricao}\n\n`;
    resumo += `1️⃣ Confirmar\n`;
    resumo += `2️⃣ Cancelar\n\n`;
    resumo += `_Digite 1 para confirmar ou 2 para cancelar_`;
    
    return { mensagem: resumo, finalizado: false };
  }

  private async stepCriarConfirmar(mensagem: string): Promise<FlowResult> {
    const opcao = mensagem.trim();
    
    if (opcao === '2') {
      this.contexto = {};
      this.stepAtual = 'escolher_acao';
      return {
        mensagem: `❌ Criação cancelada.\n\n` +
                  `_Digite "menu" para voltar ao menu principal_`,
      finalizado: true,
    };
  }

    if (opcao !== '1') {
      return {
        mensagem: `❌ Opção inválida.\n\nDigite 1 para confirmar ou 2 para cancelar`,
        finalizado: false,
      };
    }
    
    // Criar projeto
    const resultado = await getSupabase().criarProjetoCompleto({
      codigo: this.contexto.criar_codigo!,
      cliente: this.contexto.criar_cliente!,
      descricao: this.contexto.criar_descricao!,
    });
    
    if (!resultado.success) {
      return {
        mensagem: `❌ Erro ao criar projeto:\n\n${resultado.error}\n\n` +
                  `_Digite "menu" para voltar_`,
        finalizado: true,
      };
    }
    
    const resposta = resultado.data;
    
    let msg = `✅ ${resposta.mensagem || 'Projeto criado com sucesso!'}\n\n`;
    msg += `🔢 *Código:* ${resposta.codigo || this.contexto.criar_codigo}\n`;
    msg += `👤 *Cliente:* ${resposta.cliente || this.contexto.criar_cliente}\n\n`;
    msg += `💡 *Próximo passo:*\n`;
    msg += `Use a opção "2 - Distribuir projeto" no menu principal para atribuir este projeto a um engenheiro.\n\n`;
    msg += `_Digite "menu" para voltar ao menu principal_`;
    
    this.contexto = {};
    return { mensagem: msg, finalizado: true };
  }
}
