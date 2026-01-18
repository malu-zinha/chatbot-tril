// =====================================================
// FLUXO: Funcionalidades do Dono da Empresa
// =====================================================
// Este fluxo gerencia as operações disponíveis para o dono:
// - Distribuir tarefas para engenheiros
// - Verificar status dos projetos
// - Consultar histórico e relatórios
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

// =====================================================
// CLASSE: OwnerFlow
// =====================================================

export class OwnerFlow {
  private whatsapp: string;
  private donoId?: string;
  private stepAtual: string;
  
  // Contexto de distribuição de tarefa
  private contexto: {
    engenheiro_id?: string;
    engenheiro_nome?: string;
    tipo_projeto_escolha?: 'novo' | 'existente'; // NOVA ESCOLHA
    projeto_id?: string;
    codigo_projeto?: string;
    area_codigo?: string;
    tipo_projeto?: string;
    descricao?: string;
    cliente?: string;
    complexidade?: string;
    data_inicio?: string;
    data_conclusao?: string;
    observacoes?: string;
    // Listas para menus
    engenheiros?: any[];
    projetos?: any[];
    areas?: any[];
    tipos_projeto?: any[];
    complexidades?: any[];
    projetoSelecionado?: any;
  } = {};
  
  // Alias para manter compatibilidade
  private get tempData() {
    return this.contexto;
  }

  constructor(whatsapp: string, donoId: string) {
    this.whatsapp = whatsapp;
    this.donoId = donoId;
    this.stepAtual = 'inicio'; // Começar no início para mostrar menu de boas-vindas
  }

  // =====================================================
  // PROCESSAMENTO PRINCIPAL
  // =====================================================

  async processarMensagem(mensagem: string): Promise<FlowResult> {
    console.log(`\n🔷 OwnerFlow [${this.stepAtual}]: "${mensagem}"`);
    console.log(`   📦 Contexto atual:`, {
      projetos: this.contexto.projetos?.length,
      tipo_projeto_escolha: this.contexto.tipo_projeto_escolha,
      codigo_projeto: this.contexto.codigo_projeto,
      cliente: this.contexto.cliente,
    });

    const steps: Record<string, StepFunction> = {
      inicio: this.stepInicio.bind(this),
      escolher_acao: this.stepEscolherAcao.bind(this),
      
      // Distribuir tarefa
      escolher_engenheiro: this.stepEscolherEngenheiro.bind(this),
      escolher_tipo_projeto: this.stepEscolherTipoProjeto.bind(this),
      escolher_projeto_existente: this.stepEscolherProjetoExistente.bind(this),
      informar_codigo_projeto: this.stepInformarCodigoProjeto.bind(this),
      informar_cliente: this.stepInformarCliente.bind(this),
      escolher_area: this.stepEscolherArea.bind(this),
      informar_descricao: this.stepInformarDescricao.bind(this),
      escolher_complexidade: this.stepEscolherComplexidade.bind(this),
      informar_data_inicio: this.stepInformarDataInicio.bind(this),
      informar_data_conclusao: this.stepInformarDataConclusao.bind(this),
      informar_observacoes: this.stepInformarObservacoes.bind(this),
      confirmar_distribuicao: this.stepConfirmarDistribuicao.bind(this),
      
      // Verificar projetos
      listar_projetos: this.stepListarProjetos.bind(this),
      escolher_projeto: this.stepEscolherProjeto.bind(this),
      mostrar_detalhes: this.stepMostrarDetalhes.bind(this),
    };

    const stepFunction = steps[this.stepAtual];
    
    if (!stepFunction) {
      console.error(`❌ Step "${this.stepAtual}" não encontrado`);
      return {
        mensagem: '❌ Erro interno. Digite "menu" para recomeçar.',
        finalizado: true,
      };
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
  // STEPS DO FLUXO
  // =====================================================

  private async stepInicio(mensagem: string): Promise<FlowResult> {
    this.stepAtual = 'escolher_acao';
    
    return {
      mensagem: `👔 *Bem-vindo, Dono!*\n\n` +
                `O que deseja fazer?\n\n` +
                `1️⃣ Distribuir nova tarefa\n` +
                `2️⃣ Verificar projetos em andamento\n` +
                `3️⃣ Relatórios e estatísticas\n\n` +
                `_Digite o número da opção desejada_`,
      finalizado: false,
    };
  }

  private async stepEscolherAcao(mensagem: string): Promise<FlowResult> {
    const opcao = mensagem.trim();

    switch (opcao) {
      case '1':
        return await this.iniciarDistribuicaoTarefa();
      
      case '2':
        return await this.iniciarVerificacaoProjetos();
      
      case '3':
        return {
          mensagem: `📊 *Relatórios e Estatísticas*\n\n` +
                    `Esta funcionalidade estará disponível em breve.\n\n` +
                    `Por enquanto, você pode:\n` +
                    `• Visualizar projetos no Google Sheets\n` +
                    `• Consultar status individuais (opção 2)\n\n` +
                    `Digite "menu" para voltar.`,
          finalizado: true,
        };
      
      default:
        return {
          mensagem: `❌ Opção inválida.\n\n` +
                    `Digite:\n` +
                    `1️⃣ - Distribuir tarefa\n` +
                    `2️⃣ - Verificar projetos\n` +
                    `3️⃣ - Relatórios`,
          finalizado: false,
        };
    }
  }

  // =====================================================
  // FLUXO: DISTRIBUIR TAREFA
  // =====================================================

  private async iniciarDistribuicaoTarefa(): Promise<FlowResult> {
    // Buscar lista de engenheiros
    const resultado = await getSupabase().listarEngenheiros();
    
    if (!resultado.success || !resultado.data || resultado.data.length === 0) {
      return {
        mensagem: `❌ Nenhum engenheiro cadastrado no sistema.\n\n` +
                  `Digite "menu" para voltar.`,
        finalizado: true,
      };
    }

    this.contexto.engenheiros = resultado.data;
    this.stepAtual = 'escolher_engenheiro';

    let mensagem = `👨‍💼 *Escolha o engenheiro:*\n\n`;
    resultado.data.forEach((eng: any, idx: number) => {
      mensagem += `${idx + 1}️⃣ ${eng.nome} - ${eng.cargo || 'Engenheiro'}\n`;
    });
    mensagem += `\n_Digite o número do engenheiro_`;

    return {
      mensagem,
      finalizado: false,
    };
  }

  private async stepEscolherEngenheiro(mensagem: string): Promise<FlowResult> {
    const escolha = parseInt(mensagem.trim()) - 1;
    
    if (isNaN(escolha) || escolha < 0 || escolha >= (this.contexto.engenheiros?.length || 0)) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.contexto.engenheiros?.length}`,
        finalizado: false,
      };
    }

    const engenheiroEscolhido = this.contexto.engenheiros![escolha];
    this.contexto.engenheiro_id = engenheiroEscolhido.eng_id;
    this.contexto.engenheiro_nome = engenheiroEscolhido.nome;

    // Próximo step: escolher se é projeto novo ou existente
    this.stepAtual = 'escolher_tipo_projeto';

    return {
      mensagem: `🏗️ *Tipo de Projeto*\n\n` +
                `Esta tarefa é para:\n\n` +
                `1️⃣ Projeto existente (já cadastrado)\n` +
                `2️⃣ Projeto novo (criar agora)\n\n` +
                `_Digite 1 ou 2_`,
      finalizado: false,
    };
  }

  private async stepEscolherTipoProjeto(mensagem: string): Promise<FlowResult> {
    console.log('🔍 [DEBUG stepEscolherTipoProjeto] Escolha:', mensagem.trim());
    const escolha = mensagem.trim();

    if (escolha === '1') {
      console.log('✅ [DEBUG] Usuário escolheu projeto EXISTENTE');
      // Projeto EXISTENTE - listar projetos
      this.contexto.tipo_projeto_escolha = 'existente';
      const resultado = await this.listarProjetosExistentes();
      console.log('🔍 [DEBUG] listarProjetosExistentes retornou:', {
        stepAtual: this.stepAtual,
        projetos: this.contexto.projetos?.length
      });
      return resultado;
    } else if (escolha === '2') {
      // Projeto NOVO - pedir código
      this.contexto.tipo_projeto_escolha = 'novo';
      this.stepAtual = 'informar_codigo_projeto';
      return {
        mensagem: `🔢 *Código do Projeto:*\n\n` +
                  `Digite o código identificador do projeto\n` +
                  `(ex: PROJ-001, RES-2024-05)\n\n` +
                  `_Digite o código_`,
        finalizado: false,
      };
    } else {
      return {
        mensagem: `❌ Opção inválida.\n\n` +
                  `Digite:\n` +
                  `1️⃣ - Projeto existente\n` +
                  `2️⃣ - Projeto novo`,
        finalizado: false,
      };
    }
  }

  private async listarProjetosExistentes(): Promise<FlowResult> {
    console.log('🔍 [DEBUG] listarProjetosExistentes() chamado');
    const resultado = await getSupabase().listarTodosProjetos();
    console.log('🔍 [DEBUG] Resultado:', resultado);
    
    if (!resultado.success || !resultado.data || resultado.data.length === 0) {
      console.log('⚠️ [DEBUG] Nenhum projeto encontrado');
      // Se não houver projetos, forçar criação de novo
      this.contexto.tipo_projeto_escolha = 'novo';
      this.stepAtual = 'informar_codigo_projeto';
      return {
        mensagem: `⚠️ Nenhum projeto cadastrado.\n\n` +
                  `Vamos criar um projeto novo!\n\n` +
                  `🔢 Digite o código do projeto:`,
        finalizado: false,
      };
    }

    console.log(`✅ [DEBUG] ${resultado.data.length} projetos encontrados`);
    this.contexto.projetos = resultado.data;
    this.stepAtual = 'escolher_projeto_existente';

    let mensagemProjetos = `📋 *Escolha o Projeto:*\n\n`;
    resultado.data.forEach((proj: any, idx: number) => {
      const codigo = proj.codigo_projeto || proj.codigo || 'S/C';
      const cliente = proj.cliente || 'Cliente não informado';
      mensagemProjetos += `${idx + 1}️⃣ ${codigo} - ${cliente}\n`;
    });
    mensagemProjetos += `\n_Digite o número do projeto_`;

    return {
      mensagem: mensagemProjetos,
      finalizado: false,
    };
  }

  private async stepEscolherProjetoExistente(mensagem: string): Promise<FlowResult> {
    console.log('🔍 [DEBUG] stepEscolherProjetoExistente() chamado');
    console.log('🔍 [DEBUG] Projetos no contexto:', this.contexto.projetos?.length);
    
    const escolha = parseInt(mensagem.trim()) - 1;
    
    if (isNaN(escolha) || escolha < 0 || escolha >= (this.contexto.projetos?.length || 0)) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.contexto.projetos?.length}`,
        finalizado: false,
      };
    }

    const projetoEscolhido = this.contexto.projetos![escolha];
    this.contexto.projeto_id = projetoEscolhido.projeto_id;
    this.contexto.codigo_projeto = projetoEscolhido.codigo_projeto || projetoEscolhido.codigo;
    this.contexto.cliente = projetoEscolhido.cliente;

    // Agora vai para escolher área
    return await this.irParaEscolherArea();
  }

  private async stepInformarCodigoProjeto(mensagem: string): Promise<FlowResult> {
    const codigo = mensagem.trim();

    if (codigo.length < 3) {
      return {
        mensagem: `❌ Código muito curto.\n\n` +
                  `Digite um código com pelo menos 3 caracteres.`,
        finalizado: false,
      };
    }

    this.contexto.codigo_projeto = codigo;
    this.stepAtual = 'informar_cliente';

    return {
      mensagem: `👤 *Nome do cliente:*\n\n` +
                `_Digite o nome do cliente ou empresa_`,
      finalizado: false,
    };
  }

  private async irParaEscolherArea(): Promise<FlowResult> {
    // Buscar áreas disponíveis
    const areas = await getSupabase().listarAreasDisponiveis();
    
    if (!areas || areas.length === 0) {
      return {
        mensagem: `❌ Erro ao carregar áreas.\n\nDigite "menu" para recomeçar.`,
        finalizado: true,
      };
    }

    this.contexto.areas = areas;
    this.stepAtual = 'escolher_area';

    let mensagemArea = `📐 *Escolha a área do projeto:*\n\n`;
    areas.forEach((area: any, idx: number) => {
      mensagemArea += `${idx + 1}️⃣ ${area.descricao}\n`;
    });
    mensagemArea += `\n_Digite o número da área_`;

    return {
      mensagem: mensagemArea,
      finalizado: false,
    };
  }

  private async stepEscolherArea(mensagem: string): Promise<FlowResult> {
    const escolha = parseInt(mensagem.trim()) - 1;
    
    if (isNaN(escolha) || escolha < 0 || escolha >= (this.contexto.areas?.length || 0)) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.contexto.areas?.length}`,
        finalizado: false,
      };
    }

    const areaEscolhida = this.contexto.areas![escolha];
    this.contexto.area_codigo = areaEscolhida.codigo;

    // Ir direto para descrição da tarefa (não tipo de projeto)
    this.stepAtual = 'informar_descricao';
    return {
      mensagem: `📝 *Descreva a tarefa/projeto:*\n\n` +
                `Seja específico sobre o que precisa ser feito.\n\n` +
                `_Digite a descrição_`,
      finalizado: false,
    };
  }

  private async stepInformarDescricao(mensagem: string): Promise<FlowResult> {
    this.contexto.descricao = mensagem.trim();

    // Buscar complexidades
    const resultado = await getSupabase().listarComplexidades();
    
    if (!resultado.success || !resultado.data) {
      // Se não houver complexidades, usar padrão MEDIA
      this.contexto.complexidade = 'MEDIA';
      this.stepAtual = 'informar_data_inicio';
      return {
        mensagem: `📅 *Data de início prevista:*\n\n` +
                  `Formato: DD/MM/AAAA\n\n` +
                  `_Digite a data ou "hoje" para hoje_`,
        finalizado: false,
      };
    }

    this.contexto.complexidades = resultado.data;
    this.stepAtual = 'escolher_complexidade';

    let mensagemComp = `⚙️ *Escolha a complexidade:*\n\n`;
    resultado.data.forEach((comp: any, idx: number) => {
      mensagemComp += `${idx + 1}️⃣ ${comp.descricao}\n`;
    });
    mensagemComp += `\n_Digite o número da complexidade_`;

    return {
      mensagem: mensagemComp,
      finalizado: false,
    };
  }

  private async stepEscolherArea(mensagem: string): Promise<FlowResult> {
    const escolha = parseInt(mensagem.trim()) - 1;
    
    if (isNaN(escolha) || escolha < 0 || escolha >= (this.contexto.areas?.length || 0)) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.contexto.areas?.length}`,
        finalizado: false,
      };
    }

    const areaEscolhida = this.contexto.areas![escolha];
    this.contexto.area_codigo = areaEscolhida.codigo;

    // Buscar tipos de projeto para essa área
    const tiposProjeto = await getSupabase().listarTiposProjetoPorArea(areaEscolhida.codigo);
    
    if (!tiposProjeto || tiposProjeto.length === 0) {
      // Se não houver tipos específicos, pular para descrição
      this.stepAtual = 'informar_descricao';
      return {
        mensagem: `📝 *Descreva a tarefa/projeto:*\n\n` +
                  `Seja específico sobre o que precisa ser feito.\n\n` +
                  `_Digite a descrição_`,
        finalizado: false,
      };
    }

    this.contexto.tipos_projeto = tiposProjeto;
    this.stepAtual = 'escolher_tipo_projeto';

    let mensagemTipo = `🏗️ *Escolha o tipo de projeto:*\n\n`;
    tiposProjeto.forEach((tipo: any, idx: number) => {
      mensagemTipo += `${idx + 1}️⃣ ${tipo.codigo} - ${tipo.descricao}\n`;
    });
    mensagemTipo += `\n_Digite o número do tipo_`;

    return {
      mensagem: mensagemTipo,
      finalizado: false,
    };
  }

  private async stepEscolherTipoDeProjeto(mensagem: string): Promise<FlowResult> {
    const escolha = parseInt(mensagem.trim()) - 1;
    
    if (isNaN(escolha) || escolha < 0 || escolha >= (this.contexto.tipos_projeto?.length || 0)) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.contexto.tipos_projeto?.length}`,
        finalizado: false,
      };
    }

    const tipoEscolhido = this.contexto.tipos_projeto![escolha];
    this.contexto.tipo_projeto = tipoEscolhido.codigo;
    this.contexto.descricao = tipoEscolhido.descricao_automatica || tipoEscolhido.descricao;

    this.stepAtual = 'informar_cliente';
    return {
      mensagem: `👤 *Nome do cliente:*\n\n_Digite o nome do cliente ou empresa_`,
      finalizado: false,
    };
  }

  private async stepInformarDescricao(mensagem: string): Promise<FlowResult> {
    this.contexto.descricao = mensagem.trim();

    // SEMPRE ir para complexidade após descrição
    // (Cliente já foi definido - ou do banco (existente) ou informado antes (novo))
    
    // Buscar complexidades
    const resultado = await getSupabase().listarComplexidades();
    
    if (!resultado.success || !resultado.data) {
      // Se não houver complexidades, usar padrão MEDIA
      this.contexto.complexidade = 'MEDIA';
      this.stepAtual = 'informar_data_inicio';
      return {
        mensagem: `📅 *Data de início prevista:*\n\n` +
                  `Formato: DD/MM/AAAA\n\n` +
                  `_Digite a data ou "hoje" para hoje_`,
        finalizado: false,
      };
    }

    this.contexto.complexidades = resultado.data;
    this.stepAtual = 'escolher_complexidade';

    let mensagemComp = `⚙️ *Escolha a complexidade:*\n\n`;
    resultado.data.forEach((comp: any, idx: number) => {
      mensagemComp += `${idx + 1}️⃣ ${comp.descricao}\n`;
    });
    mensagemComp += `\n_Digite o número da complexidade_`;

    return {
      mensagem: mensagemComp,
      finalizado: false,
    };
  }

  private async stepInformarCliente(mensagem: string): Promise<FlowResult> {
    this.contexto.cliente = mensagem.trim();

    // Cliente informado, agora vai para área
    return await this.irParaEscolherArea();
  }

  private async stepEscolherComplexidade(mensagem: string): Promise<FlowResult> {
    const escolha = parseInt(mensagem.trim()) - 1;
    
    if (isNaN(escolha) || escolha < 0 || escolha >= (this.contexto.complexidades?.length || 0)) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.contexto.complexidades?.length}`,
        finalizado: false,
      };
    }

    const compEscolhida = this.contexto.complexidades![escolha];
    this.contexto.complexidade = compEscolhida.codigo;

    this.stepAtual = 'informar_data_inicio';
    return {
      mensagem: `📅 *Data de início prevista:*\n\n` +
                `Formato: DD/MM/AAAA\n\n` +
                `_Digite a data ou "hoje" para hoje_`,
      finalizado: false,
    };
  }

  private async stepInformarDataInicio(mensagem: string): Promise<FlowResult> {
    const msg = mensagem.trim().toLowerCase();
    
    if (msg === 'hoje') {
      this.contexto.data_inicio = new Date().toISOString().split('T')[0];
    } else {
      // Validar formato DD/MM/AAAA
      const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const match = msg.match(regex);
      
      if (!match) {
        return {
          mensagem: `❌ Formato inválido.\n\n` +
                    `Use: DD/MM/AAAA (exemplo: 17/01/2026)\n` +
                    `Ou digite "hoje" para hoje`,
          finalizado: false,
        };
      }

      const [, dia, mes, ano] = match;
      this.contexto.data_inicio = `${ano}-${mes}-${dia}`;
    }

    this.stepAtual = 'informar_data_conclusao';
    return {
      mensagem: `📅 *Data de conclusão prevista:*\n\n` +
                `Formato: DD/MM/AAAA\n\n` +
                `_Digite a data_`,
      finalizado: false,
    };
  }

  private async stepInformarDataConclusao(mensagem: string): Promise<FlowResult> {
    // Validar formato DD/MM/AAAA
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = mensagem.trim().match(regex);
    
    if (!match) {
      return {
        mensagem: `❌ Formato inválido.\n\n` +
                  `Use: DD/MM/AAAA (exemplo: 30/01/2026)`,
        finalizado: false,
      };
    }

    const [, dia, mes, ano] = match;
    this.contexto.data_conclusao = `${ano}-${mes}-${dia}`;

    this.stepAtual = 'informar_observacoes';
    return {
      mensagem: `📝 *Observações adicionais:*\n\n` +
                `Alguma informação importante para o engenheiro?\n\n` +
                `_Digite as observações ou "não" para pular_`,
      finalizado: false,
    };
  }

  private async stepInformarObservacoes(mensagem: string): Promise<FlowResult> {
    const msg = mensagem.trim().toLowerCase();
    
    if (msg !== 'não' && msg !== 'nao') {
      this.contexto.observacoes = mensagem.trim();
    }

    this.stepAtual = 'confirmar_distribuicao';

    // Gerar preview da tarefa
    const engenheiro = this.contexto.engenheiros?.find(e => e.eng_id === this.contexto.engenheiro_id);
    const area = this.contexto.areas?.find(a => a.codigo === this.contexto.area_codigo);

    let preview = `✅ *Confirme a distribuição da tarefa:*\n\n`;
    preview += `👨‍💼 *Engenheiro:* ${engenheiro?.nome}\n`;
    preview += `📐 *Área:* ${area?.descricao}\n`;
    if (this.contexto.tipo_projeto) preview += `🏗️ *Tipo:* ${this.contexto.tipo_projeto}\n`;
    preview += `📝 *Descrição:* ${this.contexto.descricao}\n`;
    preview += `👤 *Cliente:* ${this.contexto.cliente}\n`;
    if (this.contexto.complexidade) preview += `⚙️ *Complexidade:* ${this.contexto.complexidade}\n`;
    preview += `📅 *Início:* ${this.formatarData(this.contexto.data_inicio!)}\n`;
    preview += `📅 *Conclusão:* ${this.formatarData(this.contexto.data_conclusao!)}\n`;
    if (this.contexto.observacoes) preview += `📝 *Obs:* ${this.contexto.observacoes}\n`;
    preview += `\n1️⃣ Confirmar\n`;
    preview += `2️⃣ Cancelar\n`;
    preview += `\n_Digite 1 para confirmar ou 2 para cancelar_`;

    return {
      mensagem: preview,
      finalizado: false,
    };
  }

  private async stepConfirmarDistribuicao(mensagem: string): Promise<FlowResult> {
    const opcao = mensagem.trim();

    if (opcao !== '1' && opcao !== '2') {
      return {
        mensagem: `❌ Digite 1 para confirmar ou 2 para cancelar`,
        finalizado: false,
      };
    }

    if (opcao === '2') {
      return {
        mensagem: `❌ Distribuição cancelada.\n\nDigite "menu" para voltar.`,
        finalizado: true,
      };
    }

    // Confirmar distribuição - chamar função do Supabase
    const params: any = {
      dono_id: this.donoId!,
      eng_id: this.contexto.engenheiro_id!,
      area_codigo: this.contexto.area_codigo!,
      descricao_task: this.contexto.descricao!,
      complexidade_codigo: this.contexto.complexidade,
      data_inicio_prevista: this.contexto.data_inicio,
      data_conclusao_prevista: this.contexto.data_conclusao,
      observacoes_dono: this.contexto.observacoes,
    };

    // Se é projeto EXISTENTE, passa projeto_id
    if (this.contexto.tipo_projeto_escolha === 'existente' && this.contexto.projeto_id) {
      params.projeto_id = this.contexto.projeto_id;
    } 
    // Se é projeto NOVO, passa codigo_projeto + cliente
    else if (this.contexto.tipo_projeto_escolha === 'novo') {
      params.codigo_projeto = this.contexto.codigo_projeto;
      params.cliente = this.contexto.cliente;
    }

    const resultado = await getSupabase().donoDistribuirTarefa(params);

    if (!resultado.success) {
      return {
        mensagem: `❌ Erro ao distribuir tarefa:\n\n${resultado.error}\n\nDigite "menu" para voltar.`,
        finalizado: true,
        erro: resultado.error,
      };
    }

    const engenheiro = this.contexto.engenheiros?.find(e => e.eng_id === this.contexto.engenheiro_id);
    
    return {
      mensagem: `✅ *Tarefa distribuída com sucesso!*\n\n` +
                `📋 *Código:* ${resultado.data?.codigo_projeto || 'N/A'}\n` +
                `👨‍💼 *Engenheiro:* ${engenheiro?.nome}\n` +
                `👤 *Cliente:* ${this.contexto.cliente}\n\n` +
                `O engenheiro será notificado via WhatsApp.\n\n` +
                `Digite "menu" para voltar.`,
      finalizado: true,
    };
  }

  // =====================================================
  // FLUXO: VERIFICAR PROJETOS
  // =====================================================

  private async iniciarVerificacaoProjetos(): Promise<FlowResult> {
    const resultado = await getSupabase().listarTodosProjetos();
    
    if (!resultado.success || !resultado.data || resultado.data.length === 0) {
      return {
        mensagem: `📭 *Nenhum projeto encontrado.*\n\nDigite "menu" para voltar.`,
        finalizado: true,
      };
    }

    this.stepAtual = 'listar_projetos';

    let mensagem = `📊 *Projetos em Andamento:*\n\n`;
    resultado.data.forEach((proj: any, idx: number) => {
      const status = proj.status_atual || 'N/A';
      const percentual = proj.percentual_andamento || 0;
      mensagem += `${idx + 1}️⃣ *${proj.codigo_projeto}* - ${proj.cliente}\n`;
      mensagem += `   Status: ${status} (${percentual}%)\n\n`;
    });
    mensagem += `_Digite o número do projeto para detalhes_\n`;
    mensagem += `_Ou digite "voltar" para menu principal_`;

    return {
      mensagem,
      finalizado: false,
    };
  }

  private async stepListarProjetos(mensagem: string): Promise<FlowResult> {
    // Permitir voltar
    if (mensagem.toLowerCase().trim() === 'voltar') {
      this.stepAtual = 'escolher_acao';
      return await this.stepEscolherAcao('inicio');
    }
    
    const resultado = await getSupabase().listarTodosProjetos();
    
    if (!resultado.success || !resultado.data || resultado.data.length === 0) {
      return {
        mensagem: `ℹ️ *Nenhum projeto encontrado*\n\n` +
                  `Digite "menu" para voltar.`,
        finalizado: true,
      };
    }
    
    let msg = `📊 *Projetos em Andamento:*\n\n`;
    resultado.data.forEach((proj: any, idx: number) => {
      msg += `${idx + 1}️⃣ *${proj.codigo_projeto}* - ${proj.cliente}\n`;
      msg += `   Status: ${proj.status_atual} (${proj.percentual_andamento}%)\n\n`;
    });
    
    msg += `\n_Digite o número do projeto para detalhes_\n`;
    msg += `_Ou digite "voltar" para menu principal_`;
    
    this.stepAtual = 'escolher_projeto';
    this.tempData.projetos = resultado.data;
    
    return {
      mensagem: msg,
      finalizado: false,
    };
  }

  private async stepEscolherProjeto(mensagem: string): Promise<FlowResult> {
    // Permitir voltar
    if (mensagem.toLowerCase().trim() === 'voltar') {
      this.stepAtual = 'escolher_acao';
      return await this.stepEscolherAcao('inicio');
    }
    
    const opcao = parseInt(mensagem.trim());
    
    if (isNaN(opcao) || opcao < 1 || opcao > this.tempData.projetos!.length) {
      return {
        mensagem: `❌ Opção inválida. Digite um número entre 1 e ${this.tempData.projetos!.length}.`,
        finalizado: false,
      };
    }
    
    const projeto = this.tempData.projetos![opcao - 1];
    this.tempData.projetoSelecionado = projeto;
    this.stepAtual = 'mostrar_detalhes';
    
    return await this.stepMostrarDetalhes(mensagem);
  }

  private async stepMostrarDetalhes(mensagem: string): Promise<FlowResult> {
    const proj = this.tempData.projetoSelecionado;
    
    let msg = `📋 *Detalhes do Projeto*\n\n`;
    msg += `*Código:* ${proj.codigo_projeto}\n`;
    msg += `*Cliente:* ${proj.cliente}\n`;
    msg += `*Status:* ${proj.status_atual}\n`;
    msg += `*Progresso:* ${proj.percentual_andamento}%\n\n`;
    
    if (proj.descricao) {
      msg += `*Descrição:* ${proj.descricao}\n\n`;
    }
    
    msg += `\n💡 Digite "menu" para voltar ao menu principal.`;
    
    return {
      mensagem: msg,
      finalizado: true,
    };
  }

  // =====================================================
  // UTILITÁRIOS
  // =====================================================

  private formatarData(dataISO: string): string {
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  }
}

