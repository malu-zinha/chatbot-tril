import { NextResponse } from 'next/server'
import { getOwnerOrNull } from '@/lib/supabaseServer'
import { createAdminClient, isAdminConfigured } from '@/lib/supabaseAdmin'
import { isUuid } from '@/lib/adminAtribuicoes'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface RelatorioProjetoData {
  projeto_id: string
  codigo_projeto: string
  cliente: string
  descricao: string | null
  percentual_projeto: number
  data_inicio_projeto: string | null
  data_conclusao_projeto: string | null
  dias_execucao_total: number
  total_engenheiros: number
  total_disciplinas: number
  disciplinas_concluidas: number
  dias_retrabalho: number
  dias_paralisacao: number
  projeto_criado_em: string
}

export interface DisciplinaRelatorio {
  eng_projeto_id: string
  engenheiro_nome: string
  area_descricao: string
  area_codigo: string
  instancia_label: string | null
  data_inicio: string | null
  data_conclusao: string | null
  data_prevista: string | null
  percentual_ponderado: number
  dias_execucao: number
  dias_retrabalho: number
}

/**
 * GET /api/admin/projetos/[id]/relatorio
 * Returns metrics for PDF report generation
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const owner = await getOwnerOrNull()
  if (!owner) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY nao configurada no servidor.' },
      { status: 500 }
    )
  }

  if (!isUuid(params.id)) {
    return NextResponse.json({ error: 'Projeto invalido.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Buscar metricas agregadas do projeto
  const { data: relatorio, error: errorRelatorio } = await admin
    .from('vw_relatorio_projeto_pdf')
    .select('*')
    .eq('projeto_id', params.id)
    .single()

  if (errorRelatorio) {
    if (errorRelatorio.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Projeto nao encontrado.' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: errorRelatorio.message },
      { status: 500 }
    )
  }

  // Buscar detalhamento por disciplina
  const { data: disciplinas, error: errorDisciplinas } = await admin
    .from('vw_relatorio_disciplinas_projeto')
    .select('*')
    .eq('projeto_id', params.id)
    .order('data_inicio', { ascending: true, nullsFirst: false })

  if (errorDisciplinas) {
    return NextResponse.json(
      { error: errorDisciplinas.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    relatorio: relatorio as RelatorioProjetoData,
    disciplinas: (disciplinas || []) as DisciplinaRelatorio[],
    gerado_em: new Date().toISOString(),
  })
}
