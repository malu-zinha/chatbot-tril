import type { Projeto } from '@/lib/supabase'

/**
 * vw_projetos_detalhado retorna 1 linha por (projeto × area × engenheiro).
 * Reduzimos a 1 linha por projeto_id agregando:
 *  - dias_atraso: máximo entre as linhas
 *  - percentual_andamento: média
 *  - data_conclusao: preenchida apenas se TODAS as linhas estiverem concluídas
 *  - status: 'Atrasado' se alguma atrasou; senão 'Concluído' se todas concluíram; senão 'Em Andamento'
 *  - engenheiro_nome/area_descricao: concatenados (string com vírgula)
 */
export function dedupeProjetos(rows: Projeto[]): Projeto[] {
  const map = new Map<string, Projeto[]>()
  for (const r of rows) {
    if (!map.has(r.projeto_id)) map.set(r.projeto_id, [])
    map.get(r.projeto_id)!.push(r)
  }

  const result: Projeto[] = []
  for (const [, group] of map) {
    const first = group[0]
    const todasConcluidas = group.every(g => g.data_conclusao)
    // Derivamos o status de dias_atraso (não de status_descricao) porque o status da view é por linha; precisamos de um rollup por projeto.
    const algumaAtrasada = group.some(g => g.dias_atraso > 0)
    const status: string = algumaAtrasada
      ? 'Atrasado'
      : todasConcluidas
        ? 'Concluído'
        : 'Em Andamento'

    const engs = Array.from(new Set(group.map(g => g.engenheiro_nome).filter(Boolean)))
    const areas = Array.from(new Set(group.map(g => g.area_descricao).filter(Boolean)))

    result.push({
      ...first,
      engenheiro_nome: engs.join(', ') || '—',
      area_descricao: areas.join(', ') || '—',
      status_descricao: status,
      // Média não ponderada pelo número de linhas (1 linha por área×engenheiro); não representa peso real.
      percentual_andamento: group.reduce((s, g) => s + (g.percentual_andamento ?? 0), 0) / group.length,
      dias_atraso: Math.max(...group.map(g => g.dias_atraso ?? 0)),
      data_conclusao: todasConcluidas ? group.map(g => g.data_conclusao!).sort().slice(-1)[0] : null,
    })
  }
  return result
}
