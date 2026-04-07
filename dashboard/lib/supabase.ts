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
  area_id: string
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

export interface Projeto {
  projeto_id: string
  codigo_projeto: string
  cliente: string
  descricao?: string
  engenheiro_nome: string
  area_descricao: string
  status_descricao: string
  percentual_andamento: number
  data_inicio?: string
  data_prevista?: string
  data_conclusao?: string | null
  dias_atraso: number
  created_at?: string
  motivo_aguardo?: string
  ativo?: boolean
}

export interface Engenheiro {
  eng_id: string
  nome: string
  exclusivo: boolean
  total_projetos: number
  areas_ativas: number
  media_percentual: number
  total_retrabalhos: number
  dias_trabalho_pendentes: number
  areas_atrasadas: number
  ativo?: boolean
}

export interface Area {
  area_id: string
  codigo: string
  descricao: string
  tempo_trabalho_dias: number
  total_projetos: number
  areas_ativas: number
  areas_concluidas: number
  percentual_conclusao: number
  ativo?: boolean
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
  // View vw_retrabalho_geral não existe — calcular a partir das tabelas base
  const [retRes, projRes] = await Promise.all([
    supabase.from('retrabalho_projetos').select('id'),
    supabase.from('projetos').select('projeto_id').eq('ativo', true),
  ])

  const totalRetrabalhos = retRes.data?.length ?? 0
  const totalProjetos = projRes.data?.length ?? 0

  return {
    total_retrabalhos_geral: totalRetrabalhos,
    total_projetos_ativos: totalProjetos,
    percentual_geral_retrabalho: totalProjetos > 0
      ? (totalRetrabalhos / totalProjetos) * 100
      : 0,
  }
}

export async function fetchRetrabalhoPorProjeto(): Promise<RetrabalhoPorProjeto[]> {
  // View vw_retrabalho_por_projeto não existe — calcular a partir das tabelas base
  const [retRes, projRes, epRes] = await Promise.all([
    supabase.from('retrabalho_projetos').select('projeto_id'),
    supabase.from('projetos').select('projeto_id, codigo_projeto, cliente').eq('ativo', true),
    supabase.from('engenheiros_projetos').select('projeto_id, eng_id').eq('ativo', true),
  ])

  if (projRes.error || retRes.error) {
    console.error('Erro ao buscar retrabalho por projeto:', projRes.error || retRes.error)
    return []
  }

  // Contar retrabalhos por projeto
  const retByProj = new Map<string, number>()
  for (const r of (retRes.data || [])) {
    retByProj.set(r.projeto_id, (retByProj.get(r.projeto_id) || 0) + 1)
  }

  // Contar engenheiros distintos por projeto
  const engByProj = new Map<string, Set<string>>()
  for (const ep of (epRes.data || [])) {
    if (!engByProj.has(ep.projeto_id)) engByProj.set(ep.projeto_id, new Set())
    engByProj.get(ep.projeto_id)!.add(ep.eng_id)
  }

  // Construir resultado — somente projetos com retrabalho
  const result: RetrabalhoPorProjeto[] = (projRes.data || [])
    .filter(p => retByProj.has(p.projeto_id))
    .map(p => {
      const totalRet = retByProj.get(p.projeto_id) || 0
      const totalEng = engByProj.get(p.projeto_id)?.size || 1
      return {
        projeto_id: p.projeto_id,
        codigo_projeto: p.codigo_projeto,
        cliente: p.cliente,
        total_retrabalhos_projeto: totalRet,
        total_engenheiros_projeto: totalEng,
        percentual_retrabalho_projeto: (totalRet / totalEng) * 100,
      }
    })
    .sort((a, b) => b.percentual_retrabalho_projeto - a.percentual_retrabalho_projeto)

  return result
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
  const [retRes, epRes, projRes, areaRes] = await Promise.all([
    supabase.from('retrabalho_projetos').select('projeto_id, eng_projeto_id, data_retrabalho'),
    supabase.from('engenheiros_projetos').select('id, projeto_id, area_id'),
    supabase.from('projetos').select('id, codigo_projeto, cliente'),
    supabase.from('areas').select('id, codigo, descricao'),
  ])

  if (retRes.error || epRes.error || projRes.error || areaRes.error) {
    console.error('Erro ao buscar taxa de retrabalho por área:', retRes.error || epRes.error || projRes.error || areaRes.error)
    return []
  }

  const retrabalhos = retRes.data || []
  const engProjetos = epRes.data || []
  const projetos = projRes.data || []
  const areas = areaRes.data || []

  const projetoMap = new Map(projetos.map(p => [p.id, p]))
  const areaMap = new Map(areas.map(a => [a.id, a]))
  const epMap = new Map(engProjetos.map(ep => [ep.id, ep]))

  // Group retrabalhos by projeto_id + area_id
  const grupoMap = new Map<string, { projeto_id: string; area_id: string; total: number; datas: Set<string> }>()

  for (const ret of retrabalhos) {
    const ep = epMap.get(ret.eng_projeto_id)
    const area_id = ep?.area_id
    if (!area_id) continue

    const key = `${ret.projeto_id}|${area_id}`
    if (!grupoMap.has(key)) {
      grupoMap.set(key, { projeto_id: ret.projeto_id, area_id, total: 0, datas: new Set() })
    }
    const g = grupoMap.get(key)!
    g.total++
    if (ret.data_retrabalho) g.datas.add(ret.data_retrabalho)
  }

  const result: RetrabalhoTaxaArea[] = []
  for (const g of grupoMap.values()) {
    const proj = projetoMap.get(g.projeto_id)
    const area = areaMap.get(g.area_id)
    const diasComRegistro = g.datas.size || 1
    result.push({
      projeto_id: g.projeto_id,
      codigo_projeto: proj?.codigo_projeto ?? 'N/A',
      cliente: proj?.cliente ?? 'N/A',
      area_id: g.area_id,
      area_codigo: area?.codigo ?? 'N/A',
      area: area?.descricao ?? 'N/A',
      total_retrabalhos_area: g.total,
      dias_com_registro: diasComRegistro,
      taxa_retrabalho_por_dia: g.total / diasComRegistro,
    })
  }

  return result.sort((a, b) => b.taxa_retrabalho_por_dia - a.taxa_retrabalho_por_dia)
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

export async function fetchProjetos(): Promise<Projeto[]> {
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

export async function fetchEngenheiros(): Promise<Engenheiro[]> {
  // Busca engenheiros base + carga de trabalho + retrabalhos em paralelo
  const [engRes, cargaRes, retRes, atrasosRes] = await Promise.all([
    supabase.from('engenheiros').select('*').eq('ativo', true).order('nome', { ascending: true }),
    supabase.from('vw_bloco3_carga_trabalho').select('*'),
    supabase.from('retrabalho_projetos').select('eng_id'),
    supabase.from('vw_bloco2_atrasos_engenheiro').select('*'),
  ])

  if (engRes.error) {
    console.error('Erro ao buscar engenheiros:', engRes.error)
    return []
  }

  const cargaMap = new Map<string, CargaTrabalho>()
  for (const c of (cargaRes.data || [])) {
    cargaMap.set(c.eng_id, c)
  }

  // Contar retrabalhos por engenheiro
  const retCountMap = new Map<string, number>()
  for (const r of (retRes.data || [])) {
    retCountMap.set(r.eng_id, (retCountMap.get(r.eng_id) || 0) + 1)
  }

  // Atrasos por engenheiro
  const atrasosMap = new Map<string, AtrasosEngenheiro>()
  for (const a of (atrasosRes.data || [])) {
    atrasosMap.set(a.eng_id, a)
  }

  return (engRes.data || []).map((eng): Engenheiro => {
    const carga = cargaMap.get(eng.eng_id)
    const atrasos = atrasosMap.get(eng.eng_id)
    return {
      eng_id: eng.eng_id,
      nome: eng.nome,
      exclusivo: eng.exclusivo,
      total_projetos: carga?.projetos_ativos ?? 0,
      areas_ativas: carga?.areas_ativas ?? 0,
      media_percentual: carga?.percentual_execucao_media ?? 0,
      total_retrabalhos: retCountMap.get(eng.eng_id) ?? 0,
      dias_trabalho_pendentes: carga?.dias_restantes ?? 0,
      areas_atrasadas: atrasos?.qtde_areas_atrasadas ?? 0,
      ativo: eng.ativo,
    }
  })
}

export async function fetchAreas(): Promise<Area[]> {
  // Busca areas base + engenheiros_projetos para agregar
  const [areasRes, epRes] = await Promise.all([
    supabase.from('areas').select('*').eq('ativo', true).order('codigo', { ascending: true }),
    supabase.from('engenheiros_projetos').select('area_id, ativo, data_conclusao').eq('ativo', true),
  ])

  if (areasRes.error) {
    console.error('Erro ao buscar áreas:', areasRes.error)
    return []
  }

  // Agregar por area_id
  const aggMap = new Map<string, { total: number; ativas: number; concluidas: number }>()
  for (const ep of (epRes.data || [])) {
    const id = ep.area_id
    if (!aggMap.has(id)) aggMap.set(id, { total: 0, ativas: 0, concluidas: 0 })
    const agg = aggMap.get(id)!
    agg.total++
    if (ep.data_conclusao) {
      agg.concluidas++
    } else {
      agg.ativas++
    }
  }

  return (areasRes.data || []).map((area): Area => {
    const agg = aggMap.get(area.area_id) || { total: 0, ativas: 0, concluidas: 0 }
    return {
      area_id: area.area_id,
      codigo: area.codigo,
      descricao: area.descricao,
      tempo_trabalho_dias: area.tempo_trabalho_dias,
      total_projetos: agg.total,
      areas_ativas: agg.ativas,
      areas_concluidas: agg.concluidas,
      percentual_conclusao: agg.total > 0 ? (agg.concluidas / agg.total) * 100 : 0,
      ativo: area.ativo,
    }
  })
}

// Setup realtime subscriptions
export function subscribeToChanges(
  table: string,
  callback: () => void
) {
  if (!isSupabaseConfigured) {
    return null
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

