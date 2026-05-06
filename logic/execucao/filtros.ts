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

export function filterEtapasPendentes(etapas: EtapaLike[]): EtapaLike[] {
  return etapas.filter(e => !e.concluida && e.ativo !== false);
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
