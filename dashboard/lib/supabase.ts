import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

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

// Setup realtime subscriptions
export function subscribeToChanges(
  table: string,
  callback: () => void
) {
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

