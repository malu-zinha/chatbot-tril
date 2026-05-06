// =====================================================
// Parser de seleção múltipla
// =====================================================
// Aceita: "1" | "1,3,5" | "2-4" | "1,3-5,7" | "todas" | "todos"
// Retorna índices 0-based, ordenados, sem duplicatas.
// =====================================================

export class MultiSelectionError extends Error {
  readonly userMessage: string;
  constructor(userMessage: string) {
    super(userMessage);
    this.userMessage = userMessage;
  }
}

export function parseMultiSelection(input: string, max: number): number[] {
  const trimmed = input.trim().toLowerCase();
  if (trimmed === '') {
    throw new MultiSelectionError('❌ Você não selecionou nada. Digite ao menos um número.');
  }
  if (trimmed === 'todas' || trimmed === 'todos') {
    return Array.from({ length: max }, (_, i) => i);
  }

  const indices = new Set<number>();
  const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [aRaw, bRaw] = part.split('-').map(s => s.trim());
      const a = parseInt(aRaw, 10);
      const b = parseInt(bRaw, 10);
      if (isNaN(a) || isNaN(b) || a < 1 || b < 1 || a > max || b > max) {
        throw new MultiSelectionError(`❌ Intervalo inválido: "${part}". Use números entre 1 e ${max}.`);
      }
      const lo = Math.min(a, b), hi = Math.max(a, b);
      for (let i = lo; i <= hi; i++) indices.add(i - 1);
    } else {
      const n = parseInt(part, 10);
      if (isNaN(n) || n < 1 || n > max) {
        throw new MultiSelectionError(`❌ Valor inválido: "${part}". Use números entre 1 e ${max}.`);
      }
      indices.add(n - 1);
    }
  }

  if (indices.size === 0) {
    throw new MultiSelectionError('❌ Nenhuma seleção válida.');
  }
  return [...indices].sort((a, b) => a - b);
}
