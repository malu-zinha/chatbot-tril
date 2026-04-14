import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''

/** Evita chamadas inválidas e WebSocket de Realtime quando o .env não está preenchido. */
export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseAnonKey) && /^https?:\/\//i.test(supabaseUrl)

const placeholderUrl = 'https://placeholder.supabase.co'
const placeholderKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : placeholderUrl,
  isSupabaseConfigured ? supabaseAnonKey : placeholderKey,
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
)

// Types
export interface VisaoGeral {
  total_projetos: number
  projetos_concluidos: number
  projetos_em_execucao: number
  projetos_atrasados: number
  percentual_concluido_medio: number
  total_areas: number
  areas_concluidas: number
  areas_ativas: number
}

export interface AtrasosEngenheiro {
  eng_id: string
  engenheiro: string
  qtde_projetos_atrasados: number
  qtde_areas_atrasadas: number
  dias_medios_atraso: number
  atraso_maximo_dias: number
}

export interface AtrasosArea {
  area_id: number
  area_codigo: string
  area: string
  qtde_atrasados: number
  dias_medio_atraso: number
  total_projetos_area: number
}

export interface CargaTrabalho {
  eng_id: string
  engenheiro: string
  exclusivo: boolean
  dias_estimados_totais: number
  percentual_execucao_media: number
  dias_restantes: number
  areas_ativas: number
  projetos_ativos: number
}

export interface RetrabalhoEngenheiro {
  eng_id: string
  engenheiro: string
  qtde_areas_retrabalho: number
  total_retrabalhos: number
  retrabalho_medio_percentual: number
  projetos_com_retrabalho: number
}

export interface RetrabalhoGeral {
  total_retrabalhos_geral: number
  total_projetos_ativos: number
  percentual_geral_retrabalho: number
}

export interface RetrabalhoPorProjeto {
  projeto_id: string
  codigo_projeto: string
  cliente: string
  total_retrabalhos_projeto: number
  total_engenheiros_projeto: number
  percentual_retrabalho_projeto: number
}

export interface RetrabalhoDetalheProjeto {
  retrabalho_id: string
  projeto_id: string
  codigo_projeto: string
  cliente: string
  data_retrabalho: string
  eng_id: string
  engenheiro_nome: string
  motivo_retrabalho: string | null
  area_id: number
  area_codigo: string
  area_descricao: string
}

export interface RetrabalhoAreaProjeto {
  projeto_id: string
  codigo_projeto: string
  cliente: string
  area_id: number
  area_codigo: string
  area: string
  total_retrabalhos_area: number
}

export interface RetrabalhoMotivo {
  motivo_retrabalho: string
  quantidade: number
  engenheiros_afetados?: number
  projetos_afetados?: number
}

export interface RetrabalhoTaxaArea {
  projeto_id: string
  codigo_projeto: string
  cliente: string
  area_id: number
  area_codigo: string
  area: string
  total_retrabalhos_area: number
  dias_com_registro: number
  taxa_retrabalho_por_dia: number
}

export interface ProjetosStatus {
  status: string
  quantidade: number
  percentual: number
}

// Funções para buscar dados
export async function fetchVisaoGeral(): Promise<VisaoGeral | null> {
  const { data, error } = await supabase
    .from('vw_bloco1_visao_geral')
    .select('*')
    .single()
  
  if (error) {
    console.error('Erro ao buscar visão geral:', error)
    return null
  }
  
  return data
}

export async function fetchAtrasosEngenheiro(): Promise<AtrasosEngenheiro[]> {
  const { data, error } = await supabase
    .from('vw_bloco2_atrasos_engenheiro')
    .select('*')
    .order('dias_medios_atraso', { ascending: false })
  
  if (error) {
    console.error('Erro ao buscar atrasos por engenheiro:', error)
    return []
  }
  
  return data || []
}

export async function fetchAtrasosArea(): Promise<AtrasosArea[]> {
  const { data, error } = await supabase
    .from('vw_bloco2_atrasos_area')
    .select('*')
    .order('dias_medio_atraso', { ascending: false })
  
  if (error) {
    console.error('Erro ao buscar atrasos por área:', error)
    return []
  }
  
  return data || []
}

export async function fetchCargaTrabalho(): Promise<CargaTrabalho[]> {
  const { data, error } = await supabase
    .from('vw_bloco3_carga_trabalho')
    .select('*')
    .order('dias_restantes', { ascending: false })
  
  if (error) {
    console.error('Erro ao buscar carga de trabalho:', error)
    return []
  }
  
  return data || []
}

export async function fetchRetrabalhoEngenheiro(): Promise<RetrabalhoEngenheiro[]> {
  const { data, error } = await supabase
    .from('vw_bloco5_retrabalho_engenheiro')
    .select('*')
    .order('total_retrabalhos', { ascending: false })
  
  if (error) {
    console.error('Erro ao buscar retrabalho por engenheiro:', error)
    return []
  }
  
  return data || []
}

export async function fetchRetrabalhoGeral(): Promise<RetrabalhoGeral | null> {
  const { data, error } = await supabase
    .from('vw_retrabalho_geral')
    .select('*')
    .single()

  if (error) {
    console.error('Erro ao buscar retrabalho geral:', error)
    return null
  }

  return data as RetrabalhoGeral
}

export async function fetchRetrabalhoPorProjeto(): Promise<RetrabalhoPorProjeto[]> {
  const { data, error } = await supabase
    .from('vw_retrabalho_por_projeto')
    .select('*')
    .order('percentual_retrabalho_projeto', { ascending: false })

  if (error) {
    console.error('Erro ao buscar retrabalho por projeto:', error)
    return []
  }

  return (data as RetrabalhoPorProjeto[]) || []
}

export async function fetchRetrabalhoDetalhesPorProjeto(
  projetoId: string
): Promise<RetrabalhoDetalheProjeto[]> {
  const { data, error } = await supabase
    .from('vw_retrabalho_detalhes_projeto')
    .select('*')
    .eq('projeto_id', projetoId)
    .order('data_retrabalho', { ascending: false })

  if (error) {
    console.error('Erro ao buscar detalhes de retrabalho por projeto:', error)
    return []
  }

  return (data as RetrabalhoDetalheProjeto[]) || []
}

export async function fetchRetrabalhoAreaPorProjeto(
  projetoId: string
): Promise<RetrabalhoAreaProjeto[]> {
  const { data, error } = await supabase
    .from('vw_retrabalho_por_area_projeto')
    .select('*')
    .eq('projeto_id', projetoId)
    .order('total_retrabalhos_area', { ascending: false })

  if (error) {
    console.error('Erro ao buscar retrabalho por área do projeto:', error)
    return []
  }

  return (data as RetrabalhoAreaProjeto[]) || []
}

export async function fetchRetrabalhoMotivosPorProjeto(
  projetoId: string
): Promise<RetrabalhoMotivo[]> {
  const { data, error } = await supabase
    .from('vw_retrabalho_motivos_por_projeto')
    .select('*')
    .eq('projeto_id', projetoId)
    .order('quantidade', { ascending: false })

  if (error) {
    console.error('Erro ao buscar motivos de retrabalho por projeto:', error)
    return []
  }

  return (data as RetrabalhoMotivo[]) || []
}

export async function fetchRetrabalhoMotivosGeral(): Promise<RetrabalhoMotivo[]> {
  const { data, error } = await supabase
    .from('vw_dono_retrabalhos_por_motivo')
    .select('*')
    .order('quantidade', { ascending: false })

  if (error) {
    console.error('Erro ao buscar motivos gerais de retrabalho:', error)
    return []
  }

  return (data as RetrabalhoMotivo[]) || []
}

export async function fetchRetrabalhoTaxaPorArea(): Promise<RetrabalhoTaxaArea[]> {
  const { data, error } = await supabase
    .from('vw_retrabalho_taxa_area_projeto')
    .select('*')
    .order('taxa_retrabalho_por_dia', { ascending: false })

  if (error) {
    console.error('Erro ao buscar taxa de retrabalho por área:', error)
    return []
  }

  return (data as RetrabalhoTaxaArea[]) || []
}

export async function fetchProjetosStatus(): Promise<ProjetosStatus[]> {
  const { data, error } = await supabase
    .from('vw_grafico_projetos_status')
    .select('*')
  
  if (error) {
    console.error('Erro ao buscar projetos por status:', error)
    return []
  }
  
  return data || []
}

export async function fetchProjetos() {
  const { data, error } = await supabase
    .from('vw_projetos_detalhado')
    .select('*')
    .eq('ativo', true)

  if (error) {
    console.error('Erro ao buscar projetos:', error)
    return []
  }

  return data || []
}

export async function fetchEngenheiros() {
  const { data, error } = await supabase
    .from('engenheiros')
    .select('*')
    .eq('ativo', true)
    .order('nome', { ascending: true })

  if (error) {
    console.error('Erro ao buscar engenheiros:', error)
    return []
  }

  return data || []
}

export async function fetchAreas() {
  const { data, error } = await supabase
    .from('areas')
    .select('*')
    .eq('ativo', true)
    .order('codigo', { ascending: true })

  if (error) {
    console.error('Erro ao buscar áreas:', error)
    return []
  }

  return data || []
}

export async function criarProjeto(params: {
  codigo: string
  cliente: string
  descricao: string
}): Promise<{ success: boolean; data?: any; error?: string }> {
  const { data, error } = await supabase.rpc('criar_projeto', {
    p_codigo: params.codigo,
    p_cliente: params.cliente,
    p_descricao: params.descricao,
  })

  if (error) {
    console.error('Erro ao criar projeto:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// Setup realtime subscriptions
export function subscribeToChanges(
  table: string,
  callback: () => void
) {
  if (!isSupabaseConfigured) {
    return { unsubscribe: () => {} }
  }

  const channel = supabase
    .channel(`realtime-${table}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table,
      },
      () => {
        callback()
      }
    )
    .subscribe()

  return channel
}

