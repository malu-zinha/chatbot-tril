// =====================================================
// Helpers puros de filtro de itens concluídos
// =====================================================
// Sem I/O — recebem dados já carregados e devolvem listas filtradas.
// Usados em todos os fluxos onde o usuário escolhe disciplina/etapa
// para uma ação (marcar, registrar execução, registrar retrabalho).
// =====================================================

export interface EtapaLike {
  etapa_id: string;
  nome: string;
  peso?: number;
  concluida: boolean;
  ativo?: boolean;
}

export interface PavimentoLike {
  pavimento_id: string;
  nome: string;
  area_id?: string | number;
  ativo?: boolean;
  etapas: EtapaLike[];
}

export interface EtapaGlobalLike {
  etapa_global_id: string;
  nome: string;
  peso?: number;
  concluida: boolean;
  ativo?: boolean;
}

export function filterEtapasPendentes(etapas: EtapaLike[]): EtapaLike[] {
  return etapas.filter(e => !e.concluida && e.ativo !== false);
}

export function filterGlobaisPendentes(globais: EtapaGlobalLike[]): EtapaGlobalLike[] {
  return globais.filter(g => !g.concluida && g.ativo !== false);
}

/**
 * Deriva o texto do status a partir do percentual ponderado da disciplina.
 * Fonte única — mesma regra das views do dashboard e do emoji ✅.
 *   pct >= 100 -> Concluído ; pct > 0 -> Em Andamento ; senão -> Aguardando Início
 */
export function statusPorPercentual(pct: number): string {
  const p = Number(pct) || 0;
  if (p >= 100) return 'Concluído';
  if (p > 0) return 'Em Andamento';
  return 'Aguardando Início';
}

export type EscopoAcao = 'pav_escolher' | 'pav_todas' | 'glob_escolher' | 'glob_todas' | 'concluir_tudo';
export interface EscopoOpcao { label: string; acao: EscopoAcao; }

/**
 * Monta as opções do menu "o que marcar" a partir do nº de etapas pendentes.
 * @param nPavEtapas total de etapas de pavimento pendentes (somadas de todos os pavimentos)
 * @param nGlob total de etapas globais pendentes
 */
export function montarOpcoesEscopo(nPavEtapas: number, nGlob: number): EscopoOpcao[] {
  const ops: EscopoOpcao[] = [];
  if (nPavEtapas > 0) {
    ops.push({ label: `Etapas de pavimentos — escolher (${nPavEtapas} pendente(s))`, acao: 'pav_escolher' });
    ops.push({ label: `✅ Marcar TODAS as de pavimento (${nPavEtapas})`, acao: 'pav_todas' });
  }
  if (nGlob > 0) {
    ops.push({ label: `Etapas gerais do projeto — escolher (${nGlob} pendente(s))`, acao: 'glob_escolher' });
    ops.push({ label: `✅ Marcar TODAS as gerais (${nGlob})`, acao: 'glob_todas' });
  }
  if (nPavEtapas > 0 && nGlob > 0) {
    ops.push({ label: `🏁 Concluir disciplina inteira (100%)`, acao: 'concluir_tudo' });
  }
  return ops;
}

/** Rótulo de uma área na listagem: concluída mostra ✅; senão mostra o %. */
export function formatAreaLinha(nome: string, pct: number): string {
  const p = Number(pct) || 0;
  return p >= 100 ? `${nome} ✅ (100%)` : `${nome} (${p}%)`;
}

export function filterPavimentosPendentes(pavimentos: PavimentoLike[]): PavimentoLike[] {
  return pavimentos
    .filter(p => p.ativo !== false)
    .map(p => ({ ...p, etapas: filterEtapasPendentes(p.etapas) }))
    .filter(p => p.etapas.length > 0);
}

export function isAreaConcluida(pavimentos: PavimentoLike[], areaId: string | number): boolean {
  const dessaArea = pavimentos.filter(p => String(p.area_id) === String(areaId) && p.ativo !== false);
  if (dessaArea.length === 0) return false;
  // Pavimento sem etapas configuradas → NÃO é "concluído" (é não-configurado)
  return dessaArea.every(p => {
    const etapasAtivas = p.etapas.filter(e => e.ativo !== false);
    if (etapasAtivas.length === 0) return false;
    return etapasAtivas.every(e => e.concluida);
  });
}

export function filterAreasPendentes<T extends { area_id: string | number }>(
  areas: T[],
  pavimentos: PavimentoLike[]
): T[] {
  return areas.filter(a => !isAreaConcluida(pavimentos, a.area_id));
}

export function isProjetoTotalmenteConcluido(pavimentos: PavimentoLike[]): boolean {
  if (pavimentos.length === 0) return false;
  return pavimentos.every(p => {
    if (p.ativo === false) return true;
    const etapasAtivas = p.etapas.filter(e => e.ativo !== false);
    if (etapasAtivas.length === 0) return false; // sem etapas: não é concluído
    return etapasAtivas.every(e => e.concluida);
  });
}
