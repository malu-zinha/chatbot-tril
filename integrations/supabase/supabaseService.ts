// =====================================================
// SERVIÇO: Conexão e Operações com Supabase
// =====================================================
// Responsabilidade: Gerenciar todas as operações com o banco de dados
// Usado por: EngineerProjectFlow, NotificationFlows
// =====================================================

import { createClient } from '@supabase/supabase-js';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface Engenheiro {
  id: string;
  nome: string;
  whatsapp: string;
  email?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Projeto {
  id: string;
  codigo: string;
  nome?: string;
  cliente: string;
  engenheiro_id: string;
  contato_cliente?: string;
  tipo_obra?: string;
  area?: string;
  tipo_projeto?: string;
  descricao_projeto?: string;
  complexidade?: string;
  status: string;
  percentual_total: number;
  data_inicio?: string;
  data_previsao_termino?: string;
  data_final_cliente?: string;
  prazo_interno_dias?: number;
  prazo_cliente_dias?: number;
  dias_atraso?: number;
  etapa_atual?: string;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AtualizacaoDiaria {
  id: string;
  projeto_id: string;
  data: string;
  previsao_dia?: string;
  feito_dia?: string;
  necessitou_retrabalho: boolean;
  motivo_revisao?: string;
  data_registro_retrabalho?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// SERVIÇO PRINCIPAL
// =====================================================

export class SupabaseService {
  private supabase: ReturnType<typeof createClient>;
  private connected: boolean = false;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️  SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados');
      console.warn('   Sistema funcionará apenas com Google Sheets');
      // Criar cliente "fake" para não quebrar
      this.supabase = null as any;
      return;
    }

    try {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.connected = true;
      console.log('✅ Supabase conectado');
    } catch (error: any) {
      console.error('❌ Erro ao conectar Supabase:', error.message);
      this.supabase = null as any;
    }
  }

  // =====================================================
  // VERIFICAÇÃO DE CONEXÃO
  // =====================================================

  isConnected(): boolean {
    return this.connected;
  }

  // =====================================================
  // ENGENHEIROS
  // =====================================================

  /**
   * Busca ou cria um engenheiro pelo WhatsApp
   */
  async criarOuBuscarEngenheiro(whatsapp: string, nome: string): Promise<Engenheiro | null> {
    if (!this.connected) return null;

    try {
      // Buscar engenheiro existente
      const { data: existente, error: erroConsulta } = await this.supabase
        .from('engenheiros')
        .select('*')
        .eq('whatsapp', whatsapp)
        .single();

      if (existente) {
        console.log(`✅ Engenheiro encontrado: ${existente.nome}`);
        return existente;
      }

      // Criar novo engenheiro
      const { data: novo, error: erroCriacao } = await this.supabase
        .from('engenheiros')
        .insert({
          whatsapp,
          nome,
          ativo: true,
        })
        .select()
        .single();

      if (erroCriacao) {
        console.error('❌ Erro ao criar engenheiro:', erroCriacao);
        return null;
      }

      console.log(`✅ Novo engenheiro criado: ${novo.nome}`);
      return novo;
    } catch (error: any) {
      console.error('❌ Erro ao buscar/criar engenheiro:', error.message);
      return null;
    }
  }

  /**
   * Busca engenheiro por ID
   */
  async buscarEngenheiroPorId(id: string): Promise<Engenheiro | null> {
    if (!this.connected) return null;

    try {
      const { data, error } = await this.supabase
        .from('engenheiros')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Erro ao buscar engenheiro:', error);
        return null;
      }

      return data;
    } catch (error: any) {
      console.error('❌ Erro ao buscar engenheiro:', error.message);
      return null;
    }
  }

  // =====================================================
  // PROJETOS
  // =====================================================

  /**
   * Cria um novo projeto no banco
   */
  async criarProjeto(projetoData: any, engenheiroId: string): Promise<Projeto | null> {
    if (!this.connected) return null;

    try {
      const dadosInsert = {
        codigo: projetoData['Código do Projeto'],
        nome: projetoData['Cliente'], // Pode ajustar depois
        cliente: projetoData['Cliente'],
        contato_cliente: projetoData['Contato'],
        engenheiro_id: engenheiroId,
        tipo_obra: projetoData['Obra'],
        area: projetoData['Área'],
        tipo_projeto: projetoData['Tipo de Projeto'],
        descricao_projeto: projetoData['Descrição do projeto'],
        complexidade: projetoData['Complexidade'],
        data_inicio: this.formatarDataParaDB(projetoData['Data de Início']),
        data_previsao_termino: this.formatarDataParaDB(projetoData['Data de Previsão de entrega (interna)']),
        data_final_cliente: this.formatarDataParaDB(projetoData['Data Final (acordado com o cliente)']),
        prazo_interno_dias: parseInt(projetoData['Prazo Interno (dias úteis)'] || '0'),
        prazo_cliente_dias: parseInt(projetoData['Prazo Cliente (dias úteis)'] || '0'),
        status: projetoData['Status do projeto'] || 'Em Planejamento',
        percentual_total: parseFloat(projetoData['% executado'] || '0'),
        observacoes: projetoData['Observações'],
        ativo: true,
      };

      const { data, error } = await this.supabase
        .from('projetos')
        .insert(dadosInsert)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar projeto:', error);
        return null;
      }

      console.log(`✅ Projeto criado: ${data.codigo}`);
      return data;
    } catch (error: any) {
      console.error('❌ Erro ao criar projeto:', error.message);
      return null;
    }
  }

  /**
   * Atualiza um campo específico de um projeto
   */
  async atualizarCampoProjeto(
    codigoProjeto: string,
    campo: string,
    valor: any
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.connected) {
      return { success: false, error: 'Supabase não conectado' };
    }

    try {
      // Mapear nome do campo da planilha para nome da coluna do BD
      const mapeamentoCampos: Record<string, string> = {
        'Cliente': 'cliente',
        'Contato': 'contato_cliente',
        'Obra': 'tipo_obra',
        'Área': 'area',
        'Tipo de Projeto': 'tipo_projeto',
        'Descrição do projeto': 'descricao_projeto',
        'Dias estimados (interno)': 'prazo_interno_dias',
        'Data de Previsão de entrega (interna)': 'data_previsao_termino',
        'Data Final (acordado com o cliente)': 'data_final_cliente',
        'Status do projeto': 'status',
        'Etapa': 'etapa_atual',
        '% executado': 'percentual_total',
        'Observações': 'observacoes'
      };

      const colunaBD = mapeamentoCampos[campo];
      
      if (!colunaBD) {
        return { success: false, error: `Campo "${campo}" não mapeado no BD` };
      }

      // Preparar valor baseado no tipo de campo
      let valorFormatado = valor;
      
      if (campo.includes('Data')) {
        valorFormatado = this.formatarDataParaDB(valor);
      } else if (campo === '% executado') {
        valorFormatado = parseFloat(valor);
      } else if (campo === 'Dias estimados (interno)') {
        valorFormatado = parseInt(valor, 10);
      }

      // Atualizar no Supabase
      const { data, error } = await this.supabase
        .from('projetos')
        .update({ 
          [colunaBD]: valorFormatado,
          updated_at: new Date().toISOString()
        })
        .eq('codigo', codigoProjeto)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao atualizar campo:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Campo "${campo}" atualizado no Supabase: ${codigoProjeto}`);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Erro ao atualizar campo:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca projeto por código (ex: PRJ-001)
   */
  async buscarProjetoPorCodigo(codigo: string): Promise<Projeto | null> {
    if (!this.connected) return null;

    try {
      const { data, error } = await this.supabase
        .from('projetos')
        .select('*')
        .eq('codigo', codigo)
        .eq('ativo', true)
        .single();

      if (error) {
        // Projeto não encontrado não é erro crítico
        return null;
      }

      return data;
    } catch (error: any) {
      console.error('❌ Erro ao buscar projeto:', error.message);
      return null;
    }
  }

  /**
   * Lista todos os projetos de um engenheiro
   */
  async listarProjetosEngenheiro(engenheiroId: string): Promise<Projeto[]> {
    if (!this.connected) return [];

    try {
      const { data, error } = await this.supabase
        .from('projetos')
        .select('*')
        .eq('engenheiro_id', engenheiroId)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao listar projetos:', error);
        return [];
      }

      return data || [];
    } catch (error: any) {
      console.error('❌ Erro ao listar projetos:', error.message);
      return [];
    }
  }

  /**
   * Atualiza status e percentual do projeto
   */
  async atualizarStatusProjeto(projetoId: string, status: string, percentual?: number): Promise<boolean> {
    if (!this.connected) return false;

    try {
      const dadosUpdate: any = { status };
      if (percentual !== undefined) {
        dadosUpdate.percentual_total = percentual;
      }

      const { error } = await this.supabase
        .from('projetos')
        .update(dadosUpdate)
        .eq('id', projetoId);

      if (error) {
        console.error('❌ Erro ao atualizar status:', error);
        return false;
      }

      console.log(`✅ Status atualizado: ${status}`);
      return true;
    } catch (error: any) {
      console.error('❌ Erro ao atualizar status:', error.message);
      return false;
    }
  }

  // =====================================================
  // ATUALIZAÇÕES DIÁRIAS
  // =====================================================

  /**
   * Registra atualização da manhã (status + previsão)
   */
  async registrarAtualizacaoManha(
    projetoId: string,
    dados: {
      status: string;
      previsao: string;
    }
  ): Promise<AtualizacaoDiaria | null> {
    if (!this.connected) return null;

    try {
      const hoje = new Date().toISOString().split('T')[0];

      // Usar upsert para atualizar se já existe registro do dia
      const { data, error } = await this.supabase
        .from('atualizacoes_diarias')
        .upsert({
          projeto_id: projetoId,
          data: hoje,
          previsao_dia: dados.previsao,
          necessitou_retrabalho: false, // default
        }, {
          onConflict: 'projeto_id,data',
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao registrar atualização manhã:', error);
        return null;
      }

      // Atualizar status no projeto também
      await this.atualizarStatusProjeto(projetoId, dados.status);

      console.log(`✅ Atualização manhã registrada`);
      return data;
    } catch (error: any) {
      console.error('❌ Erro ao registrar atualização manhã:', error.message);
      return null;
    }
  }

  /**
   * Registra atualização da noite (feito + retrabalho + etapa + obs)
   */
  async registrarAtualizacaoNoite(
    projetoId: string,
    dados: {
      feito: string;
      retrabalho: boolean;
      motivoRetrabalho?: string;
      etapa: string;
      percentual: number;
      observacoes: string;
    }
  ): Promise<AtualizacaoDiaria | null> {
    if (!this.connected) return null;

    try {
      const hoje = new Date().toISOString().split('T')[0];

      // Registrar atualização diária
      const { data, error } = await this.supabase
        .from('atualizacoes_diarias')
        .upsert({
          projeto_id: projetoId,
          data: hoje,
          feito_dia: dados.feito,
          necessitou_retrabalho: dados.retrabalho,
          motivo_revisao: dados.motivoRetrabalho,
          data_registro_retrabalho: dados.retrabalho ? hoje : null,
          observacoes: dados.observacoes,
        }, {
          onConflict: 'projeto_id,data',
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao registrar atualização noite:', error);
        return null;
      }

      // Atualizar projeto (etapa + percentual)
      await this.supabase
        .from('projetos')
        .update({
          etapa_atual: dados.etapa,
          percentual_total: dados.percentual,
        })
        .eq('id', projetoId);

      console.log(`✅ Atualização noite registrada`);
      return data;
    } catch (error: any) {
      console.error('❌ Erro ao registrar atualização noite:', error.message);
      return null;
    }
  }

  // =====================================================
  // UTILITÁRIOS
  // =====================================================

  /**
   * Converte data DD/MM/AAAA para YYYY-MM-DD (formato do banco)
   */
  private formatarDataParaDB(dataStr?: string): string | null {
    if (!dataStr) return null;

    try {
      // Formato esperado: DD/MM/AAAA
      const partes = dataStr.split('/');
      if (partes.length !== 3) return null;

      const [dia, mes, ano] = partes;
      return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    } catch (error) {
      return null;
    }
  }

  /**
   * Converte data YYYY-MM-DD para DD/MM/AAAA (formato exibição)
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

export default SupabaseService;

