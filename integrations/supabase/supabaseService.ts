// =====================================================
// SERVIÇO: Conexão e Operações com Supabase
// =====================================================
// Responsabilidade: Gerenciar todas as operações com o banco de dados
// Usado por: EngineerProjectFlow, NotificationFlows
// Schema: Novo schema N:N (engenheiros_projetos)
// =====================================================

console.log('🔍 [SUPABASE] Arquivo supabaseService.ts sendo importado...');

import { createClient } from '@supabase/supabase-js';

console.log('🔍 [SUPABASE] createClient importado do @supabase/supabase-js');

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface Engenheiro {
  eng_id: string;
  nome: string;
  telefone?: string;
  exclusivo: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface DonoEmpresa {
  dono_id: string;
  nome: string;
  email?: string;
  telefone?: string;
  ativo: boolean;
  created_at: string;
}

export interface TipoObra {
  codigo: string;
  descricao: string;
}

export interface MotivoRetrabalho {
  codigo: string;
  descricao: string;
}

export interface TipoProjeto {
  codigo: string;
  area_codigo: string;
  descricao: string;
  tempo_dias: number;
}

export interface Complexidade {
  codigo: string;
  descricao: string;
  dias_estimados: number;
}

export interface Area {
  area_id: number;
  codigo: string;
  descricao: string;
  tempo_trabalho_dias: number;
  ativo: boolean;
}

export interface StatusCode {
  status_id: number;
  codigo: string;
  descricao: string;
  ordem: number;
  percentual_base: number;
  ativo: boolean;
}

export interface Projeto {
  projeto_id: string;
  codigo_projeto: string;
  cliente: string;
  descricao?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Atribuicao {
  id: string;
  eng_id: string;
  projeto_id: string;
  area_id: number;
  data_inicio?: string;
  data_prevista?: string;
  data_conclusao?: string;
  status_id?: number;
  percentual_andamento: number;
  tempo_trabalho_dias?: number;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Previsao {
  id: string;
  eng_projeto_id: string;
  projeto_id: string;
  eng_id: string;
  data_registro: string;
  previsao_texto: string;
  feito_texto?: string;
  status_id?: number;
  nova_data_prevista?: string;
  editavel: boolean;
  created_at: string;
  updated_at: string;
}

export interface Retrabalho {
  id: string;
  eng_projeto_id: string;
  projeto_id: string;
  eng_id: string;
  necessitou_retrabalho: boolean;
  data_retrabalho: string;
  motivo_retrabalho?: string;
  descricao?: string;
  tipo_retrabalho?: string;
  status_id?: number;
  created_at: string;
}

// Interface de compatibilidade (para código antigo)
export interface ProjetoLegacy {
  id: string;
  codigo: string;
  nome?: string;
  cliente: string;
  engenheiro_id: string;
  area?: string;
  status: string;
  percentual_total: number;
  data_inicio?: string;
  data_previsao_termino?: string;
  ativo: boolean;
}

// =====================================================
// SERVIÇO PRINCIPAL
// =====================================================

export class SupabaseService {
  private supabase: any;
  private connected: boolean = false;

  constructor() {
    console.log('🔍 [SUPABASE] Construtor chamado...');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('🔍 [SUPABASE] URL:', supabaseUrl ? 'OK' : 'FALTA');
    console.log('🔍 [SUPABASE] KEY:', supabaseKey ? 'OK' : 'FALTA');

    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️  SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados');
      console.warn('   Sistema funcionará apenas com Google Sheets');
      this.supabase = null as any;
      console.log('🔍 [SUPABASE] Construtor finalizado (sem config)');
      return;
    }

    try {
      console.log('🔍 [SUPABASE] Chamando createClient()...');
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('🔍 [SUPABASE] createClient() retornou!');
      this.connected = true;
      console.log('✅ Supabase conectado (Schema N:N)');
    } catch (error: any) {
      console.error('❌ Erro ao conectar Supabase:', error.message);
      this.supabase = null as any;
    }
    console.log('🔍 [SUPABASE] Construtor finalizado');
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Retorna o cliente Supabase para queries diretas
   */
  getClient() {
    return this.supabase;
  }

  // =====================================================
  // AUTENTICAÇÃO VIA WHATSAPP
  // =====================================================

  /**
   * Busca engenheiro por WhatsApp (via campo telefone)
   */
  async buscarEngenheiroPorWhatsapp(whatsapp: string): Promise<Engenheiro | null> {
    return await this.buscarEngenheiroPorTelefone(whatsapp);
  }

  /**
   * Cria engenheiro com telefone/WhatsApp
   */
  async criarEngenheiroComAuth(
    nome: string,
    whatsapp: string,
    exclusivo: boolean = false
  ): Promise<Engenheiro | null> {
    if (!this.connected) return null;

    try {
      const whatsappNormalizado = whatsapp.replace(/[^\d+]/g, '');

      // Criar engenheiro com telefone
      const { data: engenheiro, error: engError } = await this.supabase
        .from('engenheiros')
        .insert({
          nome,
          telefone: whatsappNormalizado,
          exclusivo,
          ativo: true,
        })
        .select()
        .single();

      if (engError || !engenheiro) {
        console.error('❌ Erro ao criar engenheiro:', engError);
        return null;
      }

      console.log(`✅ Engenheiro criado: ${nome} (${whatsappNormalizado})`);
      return engenheiro;
    } catch (error: any) {
      console.error('❌ Erro ao criar engenheiro:', error.message);
      return null;
    }
  }

  /**
   * Busca ou cria engenheiro pelo WhatsApp (compatibilidade)
   */
  async criarOuBuscarEngenheiro(whatsapp: string, nome: string): Promise<Engenheiro | null> {
    if (!this.connected) return null;

    // Tentar buscar existente
    const existente = await this.buscarEngenheiroPorWhatsapp(whatsapp);
    if (existente) {
      console.log(`✅ Engenheiro encontrado: ${existente.nome}`);
      return existente;
    }

    // Criar novo
    return await this.criarEngenheiroComAuth(nome, whatsapp, false);
  }

  /**
   * Busca engenheiro por ID
   */
  async buscarEngenheiroPorId(eng_id: string): Promise<Engenheiro | null> {
    if (!this.connected) return null;

    try {
      const { data, error } = await this.supabase
        .from('engenheiros')
        .select('*')
        .eq('eng_id', eng_id)
        .eq('ativo', true)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error: any) {
      console.error('❌ Erro ao buscar engenheiro:', error.message);
      return null;
    }
  }

  // =====================================================
  // ÁREAS E STATUS
  // =====================================================

  /**
   * Lista todas as áreas disponíveis usando SQL function
   */
  async listarAreasDisponiveis(): Promise<Area[]> {
    if (!this.connected) return [];

    try {
      const { data, error } = await this.supabase.rpc('listar_areas_disponiveis');

      if (error) {
        console.error('❌ Erro ao listar áreas:', error);
        return [];
      }

      return data || [];
    } catch (error: any) {
      console.error('❌ Erro ao listar áreas:', error.message);
      return [];
    }
  }

  /**
   * Busca área por código
   */
  async buscarAreaPorCodigo(codigo: string): Promise<Area | null> {
    if (!this.connected) return null;

    try {
      const { data, error } = await this.supabase
        .from('areas')
        .select('*')
        .eq('codigo', codigo.toUpperCase())
        .eq('ativo', true)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error: any) {
      console.error('❌ Erro ao buscar área:', error.message);
      return null;
    }
  }

  /**
   * Busca área por ID
   */
  async buscarAreaPorId(area_id: number): Promise<Area | null> {
    if (!this.connected) return null;

    try {
      const { data, error } = await this.supabase
        .from('areas')
        .select('*')
        .eq('area_id', area_id)
        .eq('ativo', true)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error: any) {
      console.error('❌ Erro ao buscar área por ID:', error.message);
      return null;
    }
  }

  /**
   * Lista todos os status disponíveis usando SQL function
   */
  async listarStatusDisponiveis(): Promise<StatusCode[]> {
    if (!this.connected) return [];

    try {
      const { data, error } = await this.supabase.rpc('listar_status_disponiveis');

      if (error) {
        console.error('❌ Erro ao listar status:', error);
        return [];
      }

      return data || [];
    } catch (error: any) {
      console.error('❌ Erro ao listar status:', error.message);
      return [];
    }
  }

  /**
   * Busca status por código
   */
  async buscarStatusPorCodigo(codigo: string): Promise<StatusCode | null> {
    if (!this.connected) return null;

    try {
      const { data, error } = await this.supabase
        .from('status_codes')
        .select('*')
        .eq('codigo', codigo.toUpperCase())
        .eq('ativo', true)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error: any) {
      console.error('❌ Erro ao buscar status:', error.message);
      return null;
    }
  }

  /**
   * Busca status por ID
   */
  async buscarStatusPorId(status_id: number): Promise<StatusCode | null> {
    if (!this.connected) return null;

    try {
      const { data, error } = await this.supabase
        .from('status_codes')
        .select('*')
        .eq('status_id', status_id)
        .eq('ativo', true)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error: any) {
      console.error('❌ Erro ao buscar status por ID:', error.message);
      return null;
    }
  }

  // =====================================================
  // PROJETOS
  // =====================================================

  /**
   * Cria um novo projeto usando SQL function
   */
  async criarProjeto(
    codigo: string,
    cliente: string,
    descricao?: string
  ): Promise<Projeto | null> {
    if (!this.connected) return null;

    try {
      const { data, error } = await this.supabase.rpc('criar_projeto', {
        p_codigo: codigo,
        p_cliente: cliente,
        p_descricao: descricao || null,
      });

      if (error) {
        console.error('❌ Erro ao criar projeto:', error);
        return null;
      }

      if (!data || !data.sucesso) {
        console.error('❌ Erro ao criar projeto:', data?.mensagem);
        return null;
      }

      console.log(`✅ Projeto criado: ${codigo}`);

      // Retornar projeto criado
      return await this.buscarProjetoPorId(data.projeto_id);
    } catch (error: any) {
      console.error('❌ Erro ao criar projeto:', error.message);
      return null;
    }
  }

  /**
   * Busca projeto por código
   */
  async buscarProjetoPorCodigo(codigo: string): Promise<Projeto | null> {
    if (!this.connected) return null;

    try {
      const { data, error } = await this.supabase
        .from('projetos')
        .select('*')
        .eq('codigo_projeto', codigo)
        .eq('ativo', true)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error: any) {
      console.error('❌ Erro ao buscar projeto:', error.message);
      return null;
    }
  }

  /**
   * Busca projeto por ID (UUID)
   */
  async buscarProjetoPorId(projeto_id: string): Promise<Projeto | null> {
    if (!this.connected) return null;

    try {
      const { data, error } = await this.supabase
        .from('projetos')
        .select('*')
        .eq('projeto_id', projeto_id)
        .eq('ativo', true)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error: any) {
      console.error('❌ Erro ao buscar projeto por ID:', error.message);
      return null;
    }
  }

  /**
   * Gera próximo código de projeto automaticamente
   */
  async getUltimoCodigoProjeto(): Promise<string | null> {
    if (!this.connected) return null;

    try {
      const { data, error } = await this.supabase.rpc('gerar_proximo_codigo_projeto');

      if (error) {
        console.error('❌ Erro ao gerar código:', error);
        return null;
      }

      return data;
    } catch (error: any) {
      console.error('❌ Erro ao gerar código:', error.message);
      return null;
    }
  }

  /**
   * Gera próximo código de projeto (alias)
   */
  async gerarProximoCodigoProjeto(): Promise<string> {
    const codigo = await this.getUltimoCodigoProjeto();
    return codigo || 'PRJ-001';
  }

  // =====================================================
  // ATRIBUIÇÕES (engenheiros_projetos)
  // =====================================================

  /**
   * Atribui engenheiro a uma área de um projeto usando SQL function
   */
  async atribuirAreaProjeto(
    eng_id: string,
    projeto_id: string,
    area_codigo: string,
    data_inicio?: string,
    data_prevista?: string,
    status_codigo?: string
  ): Promise<Atribuicao | null> {
    if (!this.connected) return null;

    try {
      const dataInicioFormatada = data_inicio ? this.formatarDataParaDB(data_inicio) : null;
      const dataPrevistaFormatada = data_prevista ? this.formatarDataParaDB(data_prevista) : null;

      const { data, error } = await this.supabase.rpc('atribuir_area_projeto', {
        p_eng_id: eng_id,
        p_projeto_id: projeto_id,
        p_area_codigo: area_codigo.toUpperCase(),
        p_data_inicio: dataInicioFormatada,
        p_data_prevista: dataPrevistaFormatada,
        p_status_codigo: status_codigo || 'AGUARDANDO_INICIO',
      });

      if (error) {
        console.error('❌ Erro ao atribuir área:', error);
        return null;
      }

      if (!data || !data.sucesso) {
        console.error('❌ Erro ao atribuir área:', data?.mensagem);
        return null;
      }

      console.log(`✅ Área ${area_codigo} atribuída ao projeto`);
      console.log(`   Tempo de trabalho: ${data.tempo_trabalho_dias} dias`);
      console.log(`   Percentual: ${data.percentual_andamento}%`);

      // Retornar atribuição criada
      return await this.buscarAtribuicaoPorId(data.atribuicao_id);
    } catch (error: any) {
      console.error('❌ Erro ao atribuir área:', error.message);
      return null;
    }
  }

  /**
   * Lista todas as atribuições de um engenheiro
   */
  async listarAtribuicoesEngenheiro(eng_id: string): Promise<Atribuicao[]> {
    if (!this.connected) return [];

    try {
      const { data, error } = await this.supabase
        .from('engenheiros_projetos')
        .select('*')
        .eq('eng_id', eng_id)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao listar atribuições:', error);
        return [];
      }

      return data || [];
    } catch (error: any) {
      console.error('❌ Erro ao listar atribuições:', error.message);
      return [];
    }
  }

  /**
   * Busca atribuição por ID
   */
  async buscarAtribuicaoPorId(atribuicao_id: string): Promise<Atribuicao | null> {
    if (!this.connected) return null;

    try {
      const { data, error } = await this.supabase
        .from('engenheiros_projetos')
        .select('*')
        .eq('id', atribuicao_id)
        .eq('ativo', true)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error: any) {
      console.error('❌ Erro ao buscar atribuição:', error.message);
      return null;
    }
  }

  /**
   * Atualiza status de uma atribuição usando SQL function
   */
  async atualizarStatusAtribuicao(
    atribuicao_id: string,
    status_codigo: string
  ): Promise<boolean> {
    if (!this.connected) return false;

    try {
      const { data, error } = await this.supabase.rpc('atualizar_status_projeto', {
        p_atribuicao_id: atribuicao_id,
        p_status_codigo: status_codigo.toUpperCase(),
      });

      if (error) {
        console.error('❌ Erro ao atualizar status:', error);
        return false;
      }

      if (!data || !data.sucesso) {
        console.error('❌ Erro ao atualizar status:', data?.mensagem);
        return false;
      }

      console.log(`✅ Status atualizado: ${status_codigo}`);
      console.log(`   Percentual calculado: ${data.percentual_andamento}%`);
      return true;
    } catch (error: any) {
      console.error('❌ Erro ao atualizar status:', error.message);
      return false;
    }
  }

  /**
   * Atualiza previsão de uma atribuição
   */
  async atualizarPrevisaoAtribuicao(
    atribuicao_id: string,
    nova_data: string
  ): Promise<boolean> {
    if (!this.connected) return false;

    try {
      const dataFormatada = this.formatarDataParaDB(nova_data);
      if (!dataFormatada) {
        console.error('❌ Data inválida:', nova_data);
        return false;
      }

      const { error } = await this.supabase
        .from('engenheiros_projetos')
        .update({ data_prevista: dataFormatada })
        .eq('id', atribuicao_id);

      if (error) {
        console.error('❌ Erro ao atualizar previsão:', error);
        return false;
      }

      console.log(`✅ Previsão atualizada: ${nova_data}`);
      return true;
    } catch (error: any) {
      console.error('❌ Erro ao atualizar previsão:', error.message);
      return false;
    }
  }

  // =====================================================
  // PREVISÕES E RETRABALHOS
  // =====================================================

  /**
   * Registra feito do dia (noite) usando SQL function
   */
  async registrarFeitoDia(
    eng_projeto_id: string,
    feito_texto: string,
    necessitou_retrabalho: boolean = false,
    motivo?: string,
    nova_data_prevista?: string
  ): Promise<Previsao | null> {
    if (!this.connected) return null;

    try {
      const dataPrevistaFormatada = nova_data_prevista ? this.formatarDataParaDB(nova_data_prevista) : null;

      const { data, error } = await this.supabase.rpc('atualizar_feito_dia', {
        p_atribuicao_id: eng_projeto_id,
        p_feito_texto: feito_texto,
        p_nova_data_prevista: dataPrevistaFormatada,
      });

      if (error) {
        console.error('❌ Erro ao registrar feito:', error);
        return null;
      }

      if (!data || !data.sucesso) {
        console.error('❌ Erro ao registrar feito:', data?.mensagem);
        return null;
      }

      console.log(`✅ Feito registrado - registro agora é imutável`);

      // Se teve retrabalho, registrar
      if (necessitou_retrabalho) {
        await this.registrarRetrabalho(eng_projeto_id, necessitou_retrabalho, motivo);
      }

      // Retornar previsão atualizada
      return await this.buscarUltimaPrevisao(eng_projeto_id);
    } catch (error: any) {
      console.error('❌ Erro ao registrar feito:', error.message);
      return null;
    }
  }

  /**
   * Busca última previsão de uma atribuição
   */
  async buscarUltimaPrevisao(eng_projeto_id: string): Promise<Previsao | null> {
    if (!this.connected) return null;

    try {
      const { data, error } = await this.supabase
        .from('projetos_previsao')
        .select('*')
        .eq('eng_projeto_id', eng_projeto_id)
        .order('data_registro', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error: any) {
      return null;
    }
  }

  /**
   * Busca último retrabalho de uma atribuição
   */
  async buscarUltimoRetrabalho(eng_projeto_id: string): Promise<Retrabalho | null> {
    if (!this.connected) return null;

    try {
      const { data, error } = await this.supabase
        .from('retrabalho_projetos')
        .select('*')
        .eq('eng_projeto_id', eng_projeto_id)
        .eq('necessitou_retrabalho', true)
        .order('data_retrabalho', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error: any) {
      return null;
    }
  }

  /**
   * Busca prazos de uma atribuição
   */
  async buscarPrazos(eng_projeto_id: string): Promise<any | null> {
    if (!this.connected) return null;

    try {
      const { data, error } = await this.supabase
        .from('prazos')
        .select('*')
        .eq('eng_projeto_id', eng_projeto_id)
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error: any) {
      return null;
    }
  }

  /**
   * Lista todas as atribuições (para sincronização)
   */
  async listarTodasAtribuicoes(): Promise<Atribuicao[]> {
    if (!this.connected) return [];

    try {
      const { data, error } = await this.supabase
        .from('engenheiros_projetos')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao listar todas atribuições:', error);
        return [];
      }

      return data || [];
    } catch (error: any) {
      console.error('❌ Erro ao listar todas atribuições:', error.message);
      return [];
    }
  }

  /**
   * Registra retrabalho usando SQL function
   */
  async registrarRetrabalho(
    eng_projeto_id: string,
    necessitou_retrabalho: boolean,
    motivo?: string,
    tipo?: string,
    descricao?: string
  ): Promise<Retrabalho | null> {
    if (!this.connected) return null;

    try {
      const { data, error } = await this.supabase.rpc('registrar_retrabalho_dia', {
        p_atribuicao_id: eng_projeto_id,
        p_necessitou_retrabalho: necessitou_retrabalho,
        p_motivo_retrabalho: motivo || null,
        p_tipo_retrabalho: tipo || null,
        p_descricao: descricao || null,
      });

      if (error) {
        console.error('❌ Erro ao registrar retrabalho:', error);
        return null;
      }

      if (!data || !data.sucesso) {
        console.error('❌ Erro ao registrar retrabalho:', data?.mensagem);
        return null;
      }

      console.log(`✅ ${data.mensagem}`);
      console.log(`   Total de retrabalhos: ${data.quantidade_total_retrabalhos}`);

      // Retornar último retrabalho
      return await this.buscarUltimoRetrabalho(eng_projeto_id);
    } catch (error: any) {
      console.error('❌ Erro ao registrar retrabalho:', error.message);
      return null;
    }
  }

  // =====================================================
  // COMPATIBILIDADE (métodos antigos)
  // =====================================================

  /**
   * Lista projetos de engenheiro (compatibilidade - retorna atribuições)
   */
  async listarProjetosEngenheiro(engenheiroId: string): Promise<ProjetoLegacy[]> {
    const atribuicoes = await this.listarAtribuicoesEngenheiro(engenheiroId);

    // Agrupar por projeto e converter para formato legado
    const projetosMap = new Map<string, ProjetoLegacy>();

    for (const atrib of atribuicoes) {
      const projeto = await this.buscarProjetoPorCodigo(atrib.projeto_id);
      if (!projeto) continue;

      const area = await this.buscarAreaPorCodigo(atrib.area_id.toString());
      const status = atrib.status_id ? await this.supabase
        .from('status_codes')
        .select('*')
        .eq('status_id', atrib.status_id)
        .single() : null;

      const key = projeto.projeto_id;
      if (!projetosMap.has(key)) {
        projetosMap.set(key, {
          id: projeto.projeto_id,
          codigo: projeto.codigo_projeto,
          cliente: projeto.cliente,
          engenheiro_id: atrib.eng_id,
          area: area?.descricao || '',
          status: status?.data?.descricao || '',
          percentual_total: atrib.percentual_andamento,
          data_inicio: atrib.data_inicio || undefined,
          data_previsao_termino: atrib.data_prevista || undefined,
          ativo: atrib.ativo,
        });
      }
    }

    return Array.from(projetosMap.values());
  }

  /**
   * Busca projeto por código (compatibilidade)
   */
  async buscarProjetoPorCodigoLegacy(codigo: string): Promise<ProjetoLegacy | null> {
    const projeto = await this.buscarProjetoPorCodigo(codigo);
    if (!projeto) return null;

    // Buscar primeira atribuição para preencher dados
    const { data: atribuicao } = await this.supabase
      .from('engenheiros_projetos')
      .select('*')
      .eq('projeto_id', projeto.projeto_id)
      .eq('ativo', true)
      .limit(1)
      .single();

    if (!atribuicao) {
      return {
        id: projeto.projeto_id,
        codigo: projeto.codigo_projeto,
        cliente: projeto.cliente,
        engenheiro_id: '',
        area: '',
        status: '',
        percentual_total: 0,
        ativo: projeto.ativo,
      };
    }

    const area = await this.buscarAreaPorCodigo(atribuicao.area_id.toString());
    const status = atribuicao.status_id ? await this.supabase
      .from('status_codes')
      .select('*')
      .eq('status_id', atribuicao.status_id)
      .single() : null;

    return {
      id: projeto.projeto_id,
      codigo: projeto.codigo_projeto,
      cliente: projeto.cliente,
      engenheiro_id: atribuicao.eng_id,
      area: area?.descricao || '',
      status: status?.data?.descricao || '',
      percentual_total: atribuicao.percentual_andamento,
      data_inicio: atribuicao.data_inicio || undefined,
      data_previsao_termino: atribuicao.data_prevista || undefined,
      ativo: projeto.ativo,
    };
  }

  // =====================================================
  // NOVOS MÉTODOS - MENUS E OPÇÕES DO CHATBOT
  // =====================================================

  /**
   * Lista tipos de obra disponíveis
   */
  async listarTiposObra(): Promise<any[]> {
    if (!this.connected) return [];

    try {
      const { data, error } = await this.supabase.rpc('listar_tipos_obra');

      if (error) {
        console.error('❌ Erro ao listar tipos de obra:', error);
        return [];
      }

      return data || [];
    } catch (error: any) {
      console.error('❌ Erro ao listar tipos de obra:', error.message);
      return [];
    }
  }

  /**
   * Lista motivos de retrabalho disponíveis
   */
  async listarMotivosRetrabalho(): Promise<any[]> {
    if (!this.connected) return [];

    try {
      const { data, error } = await this.supabase.rpc('listar_motivos_retrabalho');

      if (error) {
        console.error('❌ Erro ao listar motivos de retrabalho:', error);
        return [];
      }

      return data || [];
    } catch (error: any) {
      console.error('❌ Erro ao listar motivos de retrabalho:', error.message);
      return [];
    }
  }

  /**
   * Lista tipos de projeto por área genérica
   */
  async listarTiposProjetoPorArea(area_codigo: string): Promise<any[]> {
    if (!this.connected) return [];

    try {
      const { data, error } = await this.supabase.rpc('listar_tipos_projeto_por_area', {
        p_area_codigo: area_codigo.toUpperCase(),
      });

      if (error) {
        console.error('❌ Erro ao listar tipos de projeto:', error);
        return [];
      }

      return data || [];
    } catch (error: any) {
      console.error('❌ Erro ao listar tipos de projeto:', error.message);
      return [];
    }
  }

  /**
   * Lista todos os tipos de projeto
   */
  async listarTodosTiposProjeto(): Promise<any[]> {
    if (!this.connected) return [];

    try {
      const { data, error } = await this.supabase.rpc('listar_tipos_projeto');

      if (error) {
        console.error('❌ Erro ao listar todos os tipos de projeto:', error);
        return [];
      }

      return data || [];
    } catch (error: any) {
      console.error('❌ Erro ao listar todos os tipos de projeto:', error.message);
      return [];
    }
  }

  /**
   * Busca sugestões de previsão por status (se status_detalhamento existir)
   */
  async buscarSugestoesPrevisao(status_codigo: string): Promise<any[]> {
    if (!this.connected) return [];

    try {
      const { data, error } = await this.supabase.rpc('buscar_sugestoes_previsao', {
        p_status_codigo: status_codigo.toUpperCase(),
      });

      if (error) {
        return [];
      }

      return data || [];
    } catch (error: any) {
      return [];
    }
  }

  /**
   * Busca sugestões de feito por status (se status_detalhamento existir)
   */
  async buscarSugestoesFeito(status_codigo: string): Promise<any[]> {
    if (!this.connected) return [];

    try {
      const { data, error } = await this.supabase.rpc('buscar_sugestoes_feito', {
        p_status_codigo: status_codigo.toUpperCase(),
      });

      if (error) {
        return [];
      }

      return data || [];
    } catch (error: any) {
      return [];
    }
  }

  /**
   * Cria ou atualiza prazos do projeto
   */
  async criarOuAtualizarPrazos(
    atribuicao_id: string,
    data_inicio_projeto: string,
    prazo_final_eng: string,
    prazo_final_cliente: string,
    data_inicio_esperada_cliente?: string,
    observacoes?: string
  ): Promise<boolean> {
    if (!this.connected) return false;

    try {
      const { data, error } = await this.supabase.rpc('criar_atualizar_prazos', {
        p_atribuicao_id: atribuicao_id,
        p_data_inicio_projeto: this.formatarDataParaDB(data_inicio_projeto),
        p_prazo_final_eng: this.formatarDataParaDB(prazo_final_eng),
        p_prazo_final_cliente: this.formatarDataParaDB(prazo_final_cliente),
        p_data_inicio_esperada_cliente: data_inicio_esperada_cliente
          ? this.formatarDataParaDB(data_inicio_esperada_cliente)
          : null,
        p_observacoes: observacoes || null,
      });

      if (error) {
        console.error('❌ Erro ao criar/atualizar prazos:', error);
        return false;
      }

      if (!data || !data.sucesso) {
        console.error('❌ Erro ao criar/atualizar prazos:', data?.mensagem);
        return false;
      }

      console.log(`✅ ${data.mensagem}`);
      return true;
    } catch (error: any) {
      console.error('❌ Erro ao criar/atualizar prazos:', error.message);
      return false;
    }
  }

  /**
   * Busca meus projetos (view consolidada)
   */
  async buscarMeusProjetos(eng_id: string): Promise<any[]> {
    if (!this.connected) return [];

    try {
      const { data, error } = await this.supabase.rpc('buscar_meus_projetos', {
        p_eng_id: eng_id,
      });

      if (error) {
        console.error('❌ Erro ao buscar meus projetos:', error);
        return [];
      }

      return data || [];
    } catch (error: any) {
      console.error('❌ Erro ao buscar meus projetos:', error.message);
      return [];
    }
  }

  // =====================================================
  // AUTENTICAÇÃO - TELEFONE
  // =====================================================

  // =====================================================
  // AUTENTICAÇÃO - TELEFONE
  // =====================================================

  /**
   * Busca engenheiro por telefone (campo telefone direto na tabela engenheiros)
   */
  async buscarEngenheiroPorTelefone(telefone: string): Promise<Engenheiro | null> {
    console.log(`      🔍 [SUPABASE] buscarEngenheiroPorTelefone("${telefone}")`);
    if (!this.connected) {
      console.log(`      ❌ [SUPABASE] Não conectado`);
      return null;
    }

    try {
      const telefoneNormalizado = telefone.replace(/[^\d+]/g, '');
      console.log(`      🔍 [SUPABASE] Telefone normalizado: "${telefoneNormalizado}"`);
      console.log(`      🔍 [SUPABASE] Executando query...`);

      const { data, error } = await this.supabase
        .from('engenheiros')
        .select('*')
        .eq('telefone', telefoneNormalizado)
        .eq('ativo', true)
        .single();

      console.log(`      🔍 [SUPABASE] Query concluída!`);

      if (error || !data) {
        console.log(`      ⚠️ [SUPABASE] Não encontrado ou erro: ${error?.message || 'sem data'}`);
        return null;
      }

      console.log(`      ✅ [SUPABASE] Engenheiro encontrado: ${data.nome}`);
      return data;
    } catch (error: any) {
      console.error(`      ❌ [SUPABASE] Exceção: ${error.message}`);
      return null;
    }
  }

  /**
   * Busca dono por telefone
   */
  async buscarDonoPorTelefone(telefone: string): Promise<any | null> {
    console.log(`      🔍 [SUPABASE] buscarDonoPorTelefone("${telefone}")`);
    if (!this.connected) {
      console.log(`      ❌ [SUPABASE] Não conectado`);
      return null;
    }

    try {
      const telefoneNormalizado = telefone.replace(/[^\d+]/g, '');
      console.log(`      🔍 [SUPABASE] Telefone normalizado: "${telefoneNormalizado}"`);
      console.log(`      🔍 [SUPABASE] Executando query...`);

      const { data, error } = await this.supabase
        .from('dono_empresa')
        .select('*')
        .eq('telefone', telefoneNormalizado)
        .eq('ativo', true)
        .single();

      console.log(`      🔍 [SUPABASE] Query concluída!`);

      if (error || !data) {
        console.log(`      ⚠️ [SUPABASE] Não encontrado ou erro: ${error?.message || 'sem data'}`);
        return null;
      }

      console.log(`      ✅ [SUPABASE] Dono encontrado: ${data.nome}`);
      return data;
    } catch (error: any) {
      console.error(`      ❌ [SUPABASE] Exceção: ${error.message}`);
      return null;
    }
  }

  /**
   * Atualiza telefone de um engenheiro
   */
  async atualizarTelefoneEngenheiro(eng_id: string, telefone: string): Promise<boolean> {
    if (!this.connected) return false;

    try {
      const telefoneNormalizado = telefone.replace(/[^\d+]/g, '');

      const { error } = await this.supabase
        .from('engenheiros')
        .update({ telefone: telefoneNormalizado })
        .eq('eng_id', eng_id);

      if (error) {
        console.error('❌ Erro ao atualizar telefone:', error);
        return false;
      }

      console.log(`✅ Telefone atualizado para engenheiro ${eng_id}`);
      return true;
    } catch (error: any) {
      console.error('❌ Erro ao atualizar telefone:', error.message);
      return false;
    }
  }

  // =====================================================
  // MÉTODOS PARA O DONO (OWNER)
  // =====================================================

  /**
   * Lista todos os engenheiros cadastrados
   */
  async listarEngenheiros(): Promise<{ success: boolean; data?: Engenheiro[]; error?: string }> {
    if (!this.connected) {
      return { success: false, error: 'Supabase não conectado' };
    }

    try {
      const { data, error } = await this.supabase
        .from('engenheiros')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) {
        console.error('❌ Erro ao listar engenheiros:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('❌ Erro ao listar engenheiros:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Lista todas as complexidades disponíveis
   */
  async listarComplexidades(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    if (!this.connected) {
      return { success: false, error: 'Supabase não conectado' };
    }

    try {
      const { data, error } = await this.supabase
        .from('complexidade_tarefas')
        .select('*')
        .eq('ativo', true)
        .order('nivel');

      if (error) {
        console.error('❌ Erro ao listar complexidades:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('❌ Erro ao listar complexidades:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Lista todos os projetos (para o dono visualizar)
   */
  async listarTodosProjetos(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    if (!this.connected) {
      return { success: false, error: 'Supabase não conectado' };
    }

    try {
      const { data, error } = await this.supabase
        .from('projetos')
        .select(`
          projeto_id,
          codigo_projeto,
          cliente,
          descricao,
          ativo,
          created_at
        `)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao listar todos os projetos:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('❌ Erro ao listar projetos:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Distribui tarefa do dono para um engenheiro (usando função .rpc())
   */
  async donoDistribuirTarefa(params: {
    dono_id: string;
    eng_id: string;
    area_codigo: string;
    descricao_task: string;
    projeto_id?: string;
    codigo_projeto?: string;
    cliente?: string;
    complexidade_codigo?: string;
    data_inicio_prevista?: string;
    data_conclusao_prevista?: string;
    observacoes_dono?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.connected) {
      return { success: false, error: 'Supabase não conectado' };
    }

    try {
      const { data, error } = await this.supabase.rpc('dono_distribuir_tarefa', {
        p_dono_id: params.dono_id,
        p_eng_id: params.eng_id,
        p_area_codigo: params.area_codigo,
        p_descricao_task: params.descricao_task,
        p_projeto_id: params.projeto_id || null,
        p_codigo_projeto: params.codigo_projeto || null,
        p_cliente: params.cliente || null,
        p_complexidade_codigo: params.complexidade_codigo || 'MEDIA',
        p_data_inicio_prevista: params.data_inicio_prevista || null,
        p_data_conclusao_prevista: params.data_conclusao_prevista || null,
        p_observacoes_dono: params.observacoes_dono || null,
      });

      if (error) {
        console.error('❌ Erro ao distribuir tarefa:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Tarefa distribuída com sucesso:', data);
      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Erro ao distribuir tarefa:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Distribui projeto existente com prazos completos
   */
  async distribuirProjetoComPrazos(params: {
    dono_id: string;
    eng_id: string;
    projeto_id: string;
    area_codigo: string;
    data_inicio: string;
    data_inicio_esperada_cliente?: string;
    prazo_final_eng: string;
    prazo_final_cliente: string;
    observacoes?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.connected) {
      return { success: false, error: 'Supabase não conectado' };
    }

    try {
      const { data, error } = await this.supabase.rpc('dono_distribuir_projeto_com_prazos', {
        p_dono_id: params.dono_id,
        p_eng_id: params.eng_id,
        p_projeto_id: params.projeto_id,
        p_area_codigo: params.area_codigo,
        p_data_inicio: params.data_inicio,
        p_data_inicio_esperada_cliente: params.data_inicio_esperada_cliente || null,
        p_prazo_final_eng: params.prazo_final_eng,
        p_prazo_final_cliente: params.prazo_final_cliente,
        p_observacoes: params.observacoes || null,
      });

      if (error) {
        console.error('❌ Erro ao distribuir projeto com prazos:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Projeto distribuído com prazos:', data);
      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Erro ao distribuir projeto:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cria projeto completo (apenas tabela projetos)
   */
  async criarProjetoCompleto(params: {
    codigo: string;
    cliente: string;
    descricao: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.connected) {
      return { success: false, error: 'Supabase não conectado' };
    }

    try {
      const { data, error } = await this.supabase.rpc('criar_projeto', {
        p_codigo: params.codigo,
        p_cliente: params.cliente,
        p_descricao: params.descricao,
      });

      if (error) {
        console.error('❌ Erro ao criar projeto:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Projeto criado:', data);
      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Erro ao criar projeto:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca detalhes completos de um projeto específico por ID
   */
  async buscarProjetoDetalhado(projetoId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.connected) {
      return { success: false, error: 'Supabase não conectado' };
    }

    try {
      const { data, error } = await this.supabase
        .from('vw_projetos_completo')
        .select('*')
        .eq('projeto_id', projetoId);

      if (error) {
        console.error('❌ Erro ao buscar projeto detalhado:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('❌ Erro ao buscar projeto:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca projetos de um engenheiro específico
   */
  async buscarProjetosPorEngenheiro(engId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.connected) {
      return { success: false, error: 'Supabase não conectado' };
    }

    try {
      const { data, error } = await this.supabase
        .from('vw_projetos_completo')
        .select('*')
        .eq('eng_id', engId)
        .order('data_inicio', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar projetos do engenheiro:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('❌ Erro ao buscar projetos:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca histórico de retrabalhos com filtros opcionais
   */
  async buscarHistoricoRetrabalhos(filters?: {
    engId?: string;
    projetoId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.connected) {
      return { success: false, error: 'Supabase não conectado' };
    }

    try {
      let query = this.supabase
        .from('vw_dono_retrabalhos_historico')
        .select('*')
        .order('data_retrabalho', { ascending: false });

      if (filters?.engId) {
        query = query.eq('eng_id', filters.engId);
      }

      if (filters?.projetoId) {
        query = query.eq('projeto_id', filters.projetoId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erro ao buscar histórico de retrabalhos:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('❌ Erro ao buscar retrabalhos:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca áreas de um projeto específico
   */
  async buscarAreasDoProjeto(projetoId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.connected) {
      return { success: false, error: 'Supabase não conectado' };
    }

    try {
      const { data, error } = await this.supabase
        .from('engenheiros_projetos')
        .select(`
          area_id,
          areas!inner(area_id, codigo, descricao)
        `)
        .eq('projeto_id', projetoId)
        .eq('ativo', true);

      if (error) {
        console.error('❌ Erro ao buscar áreas do projeto:', error);
        return { success: false, error: error.message };
      }

      // Remove duplicatas de áreas
      const areasUnicas = data?.reduce((acc: any[], curr: any) => {
        const area = curr.areas;
        if (!acc.find((a: any) => a.area_id === area.area_id)) {
          acc.push(area);
        }
        return acc;
      }, []);

      return { success: true, data: areasUnicas || [] };
    } catch (error: any) {
      console.error('❌ Erro ao buscar áreas:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca última atualização noturna do engenheiro (feito do dia + observações)
   */
  async buscarUltimaAtualizacaoNoturna(
    engProjetoId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.connected) {
      return { success: false, error: 'Supabase não conectado' };
    }

    try {
      // Buscar observações do engenheiros_projetos
      const { data: atribuicao, error: errorAtrib } = await this.supabase
        .from('engenheiros_projetos')
        .select('observacoes')
        .eq('id', engProjetoId)
        .single();

      if (errorAtrib) {
        console.error('❌ Erro ao buscar atribuição:', errorAtrib);
        return { success: false, error: errorAtrib.message };
      }

      // Buscar último feito_dia do projetos_previsao
      const { data: previsao, error: errorPrev } = await this.supabase
        .from('projetos_previsao')
        .select('feito_texto, data_registro')
        .eq('eng_projeto_id', engProjetoId)
        .not('feito_texto', 'is', null)
        .order('data_registro', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (errorPrev) {
        console.error('❌ Erro ao buscar previsão:', errorPrev);
        return { success: false, error: errorPrev.message };
      }

      return {
        success: true,
        data: {
          feito_texto: previsao?.feito_texto || null,
          data_registro: previsao?.data_registro || null,
          observacoes: atribuicao?.observacoes || null,
        },
      };
    } catch (error: any) {
      console.error('❌ Erro ao buscar última atualização:', error.message);
      return { success: false, error: error.message };
    }
  }

  // =====================================================
  // MÉTODOS PARA NOTIFICAÇÕES E EDIÇÃO DO ENGENHEIRO
  // =====================================================

  /**
   * Atualiza campo específico da atribuição
   */
  async atualizarCampoAtribuicao(
    eng_projeto_id: string,
    campo: 'data_inicio' | 'data_prevista' | 'percentual_andamento' | 'observacoes',
    valor: any
  ): Promise<boolean> {
    if (!this.connected) return false;

    try {
      const updateData: any = {};
      updateData[campo] = valor;
      updateData.updated_at = new Date().toISOString();

      const { error } = await this.supabase
        .from('engenheiros_projetos')
        .update(updateData)
        .eq('id', eng_projeto_id);

      if (error) {
        console.error(`❌ Erro ao atualizar ${campo}:`, error);
        return false;
      }

      console.log(`✅ Campo ${campo} atualizado com sucesso`);
      return true;
    } catch (error: any) {
      console.error(`❌ Erro ao atualizar ${campo}:`, error.message);
      return false;
    }
  }

  /**
   * Registra previsão do dia (manhã)
   */
  async registrarPrevisaoDia(
    eng_projeto_id: string,
    status_id: number,
    previsao_texto: string
  ): Promise<boolean> {
    if (!this.connected) return false;

    try {
      // Buscar eng_id e projeto_id da atribuição
      const { data: atrib, error: erroAtrib } = await this.supabase
        .from('engenheiros_projetos')
        .select('eng_id, projeto_id')
        .eq('id', eng_projeto_id)
        .single();

      if (erroAtrib || !atrib) {
        console.error('❌ Erro ao buscar atribuição:', erroAtrib);
        return false;
      }

      // Inserir ou atualizar previsão
      const { error } = await this.supabase
        .from('projetos_previsao')
        .upsert({
          eng_projeto_id,
          projeto_id: atrib.projeto_id,
          eng_id: atrib.eng_id,
          data_registro: new Date().toISOString().split('T')[0],
          previsao_texto,
          status_id,
          editavel: true,
        }, {
          onConflict: 'eng_projeto_id,data_registro'
        });

      if (error) {
        console.error('❌ Erro ao registrar previsão:', error);
        return false;
      }

      console.log('✅ Previsão registrada com sucesso');
      return true;
    } catch (error: any) {
      console.error('❌ Erro ao registrar previsão:', error.message);
      return false;
    }
  }

  /**
   * Atualiza atribuição com feito do dia (noite)
   */
  async atualizarFeitoDia(
    eng_projeto_id: string,
    feito_texto: string,
    observacoes?: string
  ): Promise<boolean> {
    if (!this.connected) return false;

    try {
      // Atualizar previsão com feito
      const { data: atrib, error: erroAtrib } = await this.supabase
        .from('engenheiros_projetos')
        .select('eng_id, projeto_id')
        .eq('id', eng_projeto_id)
        .single();

      if (erroAtrib || !atrib) {
        console.error('❌ Erro ao buscar atribuição:', erroAtrib);
        return false;
      }

      // Atualizar previsão do dia com o feito
      const { error: erroPrevisao } = await this.supabase
        .from('projetos_previsao')
        .update({
          feito_texto,
          data_fim_dia: new Date().toISOString(),
          editavel: false,
          updated_at: new Date().toISOString(),
        })
        .eq('eng_projeto_id', eng_projeto_id)
        .eq('data_registro', new Date().toISOString().split('T')[0]);

      if (erroPrevisao) {
        console.warn('⚠️ Aviso ao atualizar previsão:', erroPrevisao);
      }

      // Atualizar observações na atribuição se fornecidas
      if (observacoes) {
        const { error: erroObs } = await this.supabase
          .from('engenheiros_projetos')
          .update({
            observacoes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', eng_projeto_id);

        if (erroObs) {
          console.error('❌ Erro ao atualizar observações:', erroObs);
          return false;
        }
      }

      console.log('✅ Feito do dia registrado com sucesso');
      return true;
    } catch (error: any) {
      console.error('❌ Erro ao atualizar feito do dia:', error.message);
      return false;
    }
  }

  /**
   * Lista status disponíveis
   */
  async listarStatus(): Promise<Array<{ status_id: number; descricao: string; codigo: string }>> {
    if (!this.connected) return [];

    try {
      const { data, error } = await this.supabase
        .from('status_codes')
        .select('status_id, descricao, codigo')
        .eq('ativo', true)
        .order('ordem');

      if (error) {
        console.error('❌ Erro ao listar status:', error);
        return [];
      }

      return data || [];
    } catch (error: any) {
      console.error('❌ Erro ao listar status:', error.message);
      return [];
    }
  }

  // =====================================================
  // UTILITÁRIOS
  // =====================================================

  /**
   * Converte data DD/MM/AAAA para YYYY-MM-DD
   */
  private formatarDataParaDB(dataStr?: string): string | null {
    if (!dataStr) return null;

    try {
      const partes = dataStr.split('/');
      if (partes.length !== 3) return null;

      const [dia, mes, ano] = partes;
      return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    } catch (error) {
      return null;
    }
  }

  /**
   * Converte data YYYY-MM-DD para DD/MM/AAAA
   */
  formatarDataParaExibicao(dataStr?: string): string {
    if (!dataStr) return '';

    try {
      const partes = dataStr.split('-');
      if (partes.length !== 3) return dataStr;

      const [ano, mes, dia] = partes;
      return `${dia}/${mes}/${ano}`;
    } catch (error) {
      return dataStr;
    }
  }

  // =====================================================
  // SOFT DELETE DE PROJETOS (DONO)
  // =====================================================

  /**
   * Desativa (soft delete) um projeto e todas suas atribuições
   */
  async desativarProjeto(
    projeto_id: string
  ): Promise<{ success: boolean; error?: string; data?: { atribuicoes_desativadas: number } }> {
    if (!this.connected) return { success: false, error: 'Supabase não conectado' };

    try {
      // 1. Desativar o projeto
      const { error: erroProjeto } = await this.supabase
        .from('projetos')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('projeto_id', projeto_id);

      if (erroProjeto) {
        console.error('❌ Erro ao desativar projeto:', erroProjeto);
        return { success: false, error: erroProjeto.message };
      }

      // 2. Desativar todas as atribuições relacionadas
      const { data: atribuicoes, error: erroAtrib } = await this.supabase
        .from('engenheiros_projetos')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('projeto_id', projeto_id)
        .eq('ativo', true)
        .select('id');

      if (erroAtrib) {
        console.error('❌ Erro ao desativar atribuições:', erroAtrib);
        // Projeto já foi desativado, reportar erro parcial
        return { success: true, error: `Projeto desativado, mas erro nas atribuições: ${erroAtrib.message}`, data: { atribuicoes_desativadas: 0 } };
      }

      const qtd = atribuicoes?.length || 0;
      console.log(`✅ Projeto ${projeto_id} desativado com ${qtd} atribuição(ões)`);
      return { success: true, data: { atribuicoes_desativadas: qtd } };
    } catch (error: any) {
      console.error('❌ Erro ao desativar projeto:', error.message);
      return { success: false, error: error.message };
    }
  }

  // =====================================================
  // EDIÇÃO DE PROJETOS (DONO)
  // =====================================================

  /**
   * Atualiza campos do projeto master (tabela projetos)
   */
  async atualizarProjeto(
    projeto_id: string,
    campos: Partial<{ codigo_projeto: string; cliente: string; descricao: string }>
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.connected) return { success: false, error: 'Supabase não conectado' };

    try {
      const updateData: any = { ...campos, updated_at: new Date().toISOString() };

      const { error } = await this.supabase
        .from('projetos')
        .update(updateData)
        .eq('projeto_id', projeto_id);

      if (error) {
        console.error('❌ Erro ao atualizar projeto:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Projeto ${projeto_id} atualizado:`, campos);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Erro ao atualizar projeto:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Atualiza campos da atribuição (engenheiros_projetos) - versão genérica para o dono
   */
  async atualizarAtribuicaoDono(
    atribuicao_id: string,
    campos: Partial<{
      data_inicio: string;
      data_prevista: string;
      status_id: number;
      percentual_andamento: number;
      observacoes: string;
    }>
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.connected) return { success: false, error: 'Supabase não conectado' };

    try {
      const updateData: any = { ...campos, updated_at: new Date().toISOString() };

      const { error } = await this.supabase
        .from('engenheiros_projetos')
        .update(updateData)
        .eq('id', atribuicao_id);

      if (error) {
        console.error('❌ Erro ao atualizar atribuição:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Atribuição ${atribuicao_id} atualizada:`, campos);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Erro ao atualizar atribuição:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Atualiza campos de prazos
   */
  async atualizarPrazos(
    eng_projeto_id: string,
    campos: Partial<{
      prazo_final_eng: string;
      prazo_final_cliente: string;
      data_inicio_esperada_cliente: string;
    }>
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.connected) return { success: false, error: 'Supabase não conectado' };

    try {
      const updateData: any = { ...campos, updated_at: new Date().toISOString() };

      const { error } = await this.supabase
        .from('prazos')
        .update(updateData)
        .eq('eng_projeto_id', eng_projeto_id);

      if (error) {
        console.error('❌ Erro ao atualizar prazos:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Prazos atualizados para atribuição ${eng_projeto_id}:`, campos);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Erro ao atualizar prazos:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca atribuição com detalhes para edição (projeto + área + engenheiro + prazos)
   */
  async buscarAtribuicaoParaEdicao(atribuicao_id: string): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.connected) return { success: false, error: 'Supabase não conectado' };

    try {
      const { data, error } = await this.supabase
        .from('vw_projetos_completo')
        .select('*')
        .eq('atribuicao_id', atribuicao_id)
        .single();

      if (error) {
        console.error('❌ Erro ao buscar atribuição para edição:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Erro ao buscar atribuição:', error.message);
      return { success: false, error: error.message };
    }
  }

  // =====================================================
  // PROGRESSO PONDERADO (PAVIMENTOS / ETAPAS)
  // =====================================================

  /**
   * Busca todos os pavimentos de um projeto com suas etapas aninhadas
   */
  async buscarPavimentosComEtapas(projetoId: string): Promise<any[]> {
    if (!this.connected) return [];

    try {
      // Buscar pavimentos
      const { data: pavimentos, error: pavError } = await this.supabase
        .from('projeto_pavimentos')
        .select('*')
        .eq('projeto_id', projetoId)
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (pavError) {
        console.error('❌ Erro ao buscar pavimentos:', pavError);
        return [];
      }

      if (!pavimentos || pavimentos.length === 0) {
        return [];
      }

      // Buscar etapas de todos os pavimentos de uma vez
      const pavimentoIds = pavimentos.map((p: any) => p.pavimento_id);
      const { data: etapas, error: etapaError } = await this.supabase
        .from('pavimento_etapas')
        .select('*')
        .in('pavimento_id', pavimentoIds)
        .eq('ativo', true)
        .order('created_at', { ascending: true });

      if (etapaError) {
        console.error('❌ Erro ao buscar etapas dos pavimentos:', etapaError);
        // Retorna pavimentos sem etapas em vez de falhar completamente
        return pavimentos.map((p: any) => ({ ...p, etapas: [] }));
      }

      // Aninhar etapas dentro dos pavimentos
      const etapasPorPavimento = new Map<string, any[]>();
      (etapas || []).forEach((e: any) => {
        const lista = etapasPorPavimento.get(e.pavimento_id) || [];
        lista.push(e);
        etapasPorPavimento.set(e.pavimento_id, lista);
      });

      return pavimentos.map((p: any) => ({
        ...p,
        etapas: etapasPorPavimento.get(p.pavimento_id) || [],
      }));
    } catch (error: any) {
      console.error('❌ Erro ao buscar pavimentos com etapas:', error.message);
      return [];
    }
  }

  /**
   * Busca todas as etapas globais de um projeto
   */
  async buscarEtapasGlobais(projetoId: string): Promise<any[]> {
    if (!this.connected) return [];

    try {
      const { data, error } = await this.supabase
        .from('projeto_etapas_globais')
        .select('*')
        .eq('projeto_id', projetoId)
        .eq('ativo', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar etapas globais:', error);
        return [];
      }

      return data || [];
    } catch (error: any) {
      console.error('❌ Erro ao buscar etapas globais:', error.message);
      return [];
    }
  }

  /**
   * Marca uma etapa de pavimento como concluída ou não concluída
   */
  async marcarEtapaConcluida(etapaId: string, concluida: boolean): Promise<boolean> {
    if (!this.connected) return false;

    try {
      const { error } = await this.supabase
        .from('pavimento_etapas')
        .update({ concluida })
        .eq('etapa_id', etapaId)
        .eq('ativo', true);

      if (error) {
        console.error('❌ Erro ao marcar etapa:', error);
        return false;
      }

      console.log(`✅ Etapa ${etapaId} marcada como ${concluida ? 'concluída' : 'pendente'}`);
      return true;
    } catch (error: any) {
      console.error('❌ Erro ao marcar etapa:', error.message);
      return false;
    }
  }

  /**
   * Marca uma etapa global como concluída ou não concluída
   */
  async marcarEtapaGlobalConcluida(etapaGlobalId: string, concluida: boolean): Promise<boolean> {
    if (!this.connected) return false;

    try {
      const { error } = await this.supabase
        .from('projeto_etapas_globais')
        .update({ concluida })
        .eq('etapa_global_id', etapaGlobalId)
        .eq('ativo', true);

      if (error) {
        console.error('❌ Erro ao marcar etapa global:', error);
        return false;
      }

      console.log(`✅ Etapa global ${etapaGlobalId} marcada como ${concluida ? 'concluída' : 'pendente'}`);
      return true;
    } catch (error: any) {
      console.error('❌ Erro ao marcar etapa global:', error.message);
      return false;
    }
  }

  /**
   * Busca o percentual_ponderado cacheado de um projeto
   */
  async buscarProgressoPonderado(projetoId: string): Promise<number | null> {
    if (!this.connected) return null;

    try {
      const { data, error } = await this.supabase
        .from('projetos')
        .select('percentual_ponderado')
        .eq('projeto_id', projetoId)
        .eq('ativo', true)
        .single();

      if (error) {
        console.error('❌ Erro ao buscar progresso ponderado:', error);
        return null;
      }

      return (data as any)?.percentual_ponderado ?? null;
    } catch (error: any) {
      console.error('❌ Erro ao buscar progresso ponderado:', error.message);
      return null;
    }
  }
}

// =====================================================
// SINGLETON
// =====================================================

let supabaseServiceInstance: SupabaseService | null = null;

export function getSupabaseService(): SupabaseService {
  if (!supabaseServiceInstance) {
    supabaseServiceInstance = new SupabaseService();
  }
  return supabaseServiceInstance;
}

// Exportar instância direta também (para facilitar imports)
// COMENTADO: Causa problema de timing com dotenv.config()
// A instância é criada ANTES do dotenv carregar as variáveis
// export const supabaseService = getSupabaseService();

// Use getSupabaseService() em vez de importar supabaseService diretamente
export const supabaseService = {
  get instance() {
    return getSupabaseService();
  }
};

export default SupabaseService;
