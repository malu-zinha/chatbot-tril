export interface ProjetoDisplayLike {
  codigo_projeto?: string | null;
  cliente?: string | null;
  descricao?: string | null;
}

export interface ProjetoDisciplinaDisplayLike extends ProjetoDisplayLike {
  area_codigo?: string | null;
  area_descricao?: string | null;
  instancia_label?: string | null;
}

function textoLimpo(valor?: string | null): string {
  return (valor || '').trim().replace(/\s+/g, ' ');
}

function normalizarComparacao(valor?: string | null): string {
  return textoLimpo(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

export function formatProjetoNomeComCodigo(projeto: ProjetoDisplayLike): string {
  const codigo = textoLimpo(projeto.codigo_projeto);
  const nome = textoLimpo(projeto.cliente) || textoLimpo(projeto.descricao) || codigo;

  if (!codigo || normalizarComparacao(nome) === normalizarComparacao(codigo)) {
    return nome || 'Projeto sem nome';
  }

  return `${nome} (${codigo})`;
}

export function formatDisciplinaNome(item: ProjetoDisciplinaDisplayLike): string {
  const areaCodigo = normalizarComparacao(item.area_codigo);
  const areaDescricao = normalizarComparacao(item.area_descricao);
  const instanciaLabel = textoLimpo(item.instancia_label);

  if ((areaCodigo === 'COMPATIBILIZACAO' || areaDescricao === 'COMPATIBILIZACAO') && instanciaLabel) {
    return instanciaLabel;
  }

  return textoLimpo(item.area_descricao) || 'Disciplina sem nome';
}

export function formatProjetoDisciplinaLinha(item: ProjetoDisciplinaDisplayLike): string {
  return `${formatProjetoNomeComCodigo(item)} - ${formatDisciplinaNome(item)}`;
}
