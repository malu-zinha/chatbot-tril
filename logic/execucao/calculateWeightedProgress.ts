// =====================================================
// LÓGICA: Cálculo de Progresso Ponderado por Pavimento
// =====================================================
// Responsabilidade: Colega (Lógica de Negócio)
//
// Este módulo contém toda a lógica de cálculo de progresso
// ponderado em dois níveis:
//   Nível 1: Pavimentos (andares) com peso %
//   Nível 2: Etapas dentro de cada pavimento com peso %
//   + Etapas globais (não vinculadas a pavimento)
//
// Fórmula:
//   progresso = SUM(peso_pavimento * progresso_interno / 100)
//             + SUM(peso_etapa_global onde concluída)
// =====================================================

// =====================================================
// TIPOS E INTERFACES
// =====================================================

/** Etapa/tarefa dentro de um pavimento */
export interface Etapa {
  etapa_id: string;
  pavimento_id: string;
  nome: string;
  /** Peso da etapa dentro do pavimento (0-100) */
  peso: number;
  concluida: boolean;
  data_conclusao?: string;
  observacoes?: string;
  ativo: boolean;
}

/** Pavimento/andar de um projeto com suas etapas */
export interface Pavimento {
  pavimento_id: string;
  projeto_id: string;
  nome: string;
  ordem: number;
  /** Peso do pavimento no progresso total do projeto (0-100) */
  peso: number;
  ativo: boolean;
  etapas: Etapa[];
}

/** Etapa global não vinculada a nenhum pavimento */
export interface EtapaGlobal {
  etapa_global_id: string;
  projeto_id: string;
  nome: string;
  /** Peso da etapa global no progresso total do projeto (0-100) */
  peso: number;
  concluida: boolean;
  data_conclusao?: string;
  observacoes?: string;
  ativo: boolean;
}

/** Detalhamento de contribuição de um pavimento no resultado */
export interface PavimentoContribuicao {
  pavimento_id: string;
  nome: string;
  peso: number;
  /** Progresso interno do pavimento (0-100): soma dos pesos das etapas concluídas */
  percentual_interno: number;
  /** Contribuição efetiva ao progresso total: peso * percentual_interno / 100 */
  contribuicao: number;
  total_etapas: number;
  etapas_concluidas: number;
  /** Soma dos pesos das etapas ativas (deve ser 100) */
  soma_pesos_etapas: number;
}

/** Detalhamento de contribuição de uma etapa global no resultado */
export interface EtapaGlobalContribuicao {
  etapa_global_id: string;
  nome: string;
  peso: number;
  concluida: boolean;
  /** peso se concluída, 0 se não */
  contribuicao: number;
}

/** Resultado completo do cálculo de progresso ponderado */
export interface ProgressoPonderado {
  projeto_id: string;
  /** Progresso ponderado total (0-100) */
  percentual_ponderado: number;
  detalhamento: {
    pavimentos: PavimentoContribuicao[];
    globais: EtapaGlobalContribuicao[];
  };
  /** Soma de todos os pesos configurados (pavimentos + globais). Deve ser 100 */
  soma_pesos_configurados: number;
  /** true se soma_pesos_configurados === 100 */
  pesos_validos: boolean;
}

/** Resultado da validação de pesos */
export interface ValidacaoPesos {
  valido: boolean;
  erros: string[];
  avisos: string[];
}

// =====================================================
// FUNÇÃO: Calcular Progresso Ponderado
// =====================================================
// Calcula o progresso total de um projeto baseado em
// pavimentos com pesos e etapas internas, mais etapas
// globais. Considera apenas itens ativos.
// =====================================================

/**
 * Calcula o progresso ponderado de um projeto.
 *
 * Fórmula:
 *   progresso = SUM(peso_pavimento * progresso_interno_pavimento / 100)
 *             + SUM(peso_etapa_global onde concluída = true)
 *
 * Onde progresso_interno_pavimento = SUM(etapa.peso) onde concluída = true
 *
 * @param projeto_id - ID do projeto
 * @param pavimentos - Lista de pavimentos com suas etapas
 * @param etapasGlobais - Lista de etapas globais
 * @returns Resultado detalhado do cálculo
 */
export function calculateWeightedProgress(
  projeto_id: string,
  pavimentos: Pavimento[],
  etapasGlobais: EtapaGlobal[]
): ProgressoPonderado {
  // Filtra apenas itens ativos
  const pavimentosAtivos = pavimentos.filter((p) => p.ativo);
  const globaisAtivas = etapasGlobais.filter((g) => g.ativo);

  // Calcula contribuição de cada pavimento
  const detalhePavimentos: PavimentoContribuicao[] = pavimentosAtivos.map((pav) => {
    const etapasAtivas = pav.etapas.filter((e) => e.ativo);
    const etapasConcluidas = etapasAtivas.filter((e) => e.concluida);

    const soma_pesos_etapas = etapasAtivas.reduce((acc, e) => acc + e.peso, 0);
    const percentual_interno = etapasConcluidas.reduce((acc, e) => acc + e.peso, 0);
    const contribuicao = (pav.peso * percentual_interno) / 100;

    return {
      pavimento_id: pav.pavimento_id,
      nome: pav.nome,
      peso: pav.peso,
      percentual_interno: Math.round(percentual_interno * 100) / 100,
      contribuicao: Math.round(contribuicao * 100) / 100,
      total_etapas: etapasAtivas.length,
      etapas_concluidas: etapasConcluidas.length,
      soma_pesos_etapas: Math.round(soma_pesos_etapas * 100) / 100,
    };
  });

  // Calcula contribuição de cada etapa global
  const detalheGlobais: EtapaGlobalContribuicao[] = globaisAtivas.map((g) => ({
    etapa_global_id: g.etapa_global_id,
    nome: g.nome,
    peso: g.peso,
    concluida: g.concluida,
    contribuicao: g.concluida ? g.peso : 0,
  }));

  // Soma total
  const contribPavimentos = detalhePavimentos.reduce((acc, p) => acc + p.contribuicao, 0);
  const contribGlobais = detalheGlobais.reduce((acc, g) => acc + g.contribuicao, 0);
  let percentual_ponderado = contribPavimentos + contribGlobais;

  // Limita entre 0 e 100
  percentual_ponderado = Math.max(0, Math.min(100, percentual_ponderado));

  // Soma dos pesos de nível 1
  const somaPesosPavimentos = pavimentosAtivos.reduce((acc, p) => acc + p.peso, 0);
  const somaPesosGlobais = globaisAtivas.reduce((acc, g) => acc + g.peso, 0);
  const soma_pesos_configurados = Math.round((somaPesosPavimentos + somaPesosGlobais) * 100) / 100;

  return {
    projeto_id,
    percentual_ponderado: Math.round(percentual_ponderado * 100) / 100,
    detalhamento: {
      pavimentos: detalhePavimentos,
      globais: detalheGlobais,
    },
    soma_pesos_configurados,
    pesos_validos: soma_pesos_configurados === 100,
  };
}

// =====================================================
// FUNÇÃO: Validar Pesos
// =====================================================
// Verifica se os pesos de pavimentos, etapas internas
// e etapas globais estão consistentes e somam 100%
// =====================================================

/**
 * Valida a consistência dos pesos configurados para um projeto.
 *
 * Verifica:
 * - Soma dos pesos de nível 1 (pavimentos + globais) = 100%
 * - Soma dos pesos internos de cada pavimento = 100%
 * - Nenhum peso negativo
 * - Nenhum pavimento/etapa sem peso definido
 *
 * @param pavimentos - Lista de pavimentos com suas etapas
 * @param etapasGlobais - Lista de etapas globais
 * @returns Resultado da validação com erros e avisos
 */
export function validateWeights(
  pavimentos: Pavimento[],
  etapasGlobais: EtapaGlobal[]
): ValidacaoPesos {
  const erros: string[] = [];
  const avisos: string[] = [];

  const pavimentosAtivos = pavimentos.filter((p) => p.ativo);
  const globaisAtivas = etapasGlobais.filter((g) => g.ativo);

  // Verificar se há algo configurado
  if (pavimentosAtivos.length === 0 && globaisAtivas.length === 0) {
    avisos.push('Nenhum pavimento ou etapa global configurada');
    return { valido: true, erros, avisos };
  }

  // Verificar pesos negativos - pavimentos
  pavimentosAtivos.forEach((pav) => {
    if (pav.peso < 0) {
      erros.push(`Pavimento "${pav.nome}": peso negativo (${pav.peso}%)`);
    }
    if (pav.peso === 0) {
      avisos.push(`Pavimento "${pav.nome}": peso é 0%`);
    }
  });

  // Verificar pesos negativos - etapas globais
  globaisAtivas.forEach((g) => {
    if (g.peso < 0) {
      erros.push(`Etapa global "${g.nome}": peso negativo (${g.peso}%)`);
    }
    if (g.peso === 0) {
      avisos.push(`Etapa global "${g.nome}": peso é 0%`);
    }
  });

  // Verificar soma nível 1 (pavimentos + globais = 100%)
  const somaPesosPavimentos = pavimentosAtivos.reduce((acc, p) => acc + p.peso, 0);
  const somaPesosGlobais = globaisAtivas.reduce((acc, g) => acc + g.peso, 0);
  const somaTotal = Math.round((somaPesosPavimentos + somaPesosGlobais) * 100) / 100;

  if (somaTotal !== 100) {
    erros.push(
      `Soma dos pesos de nível 1 é ${somaTotal}% (esperado: 100%). ` +
        `Pavimentos: ${Math.round(somaPesosPavimentos * 100) / 100}%, ` +
        `Globais: ${Math.round(somaPesosGlobais * 100) / 100}%`
    );
  }

  // Verificar soma nível 2 (etapas dentro de cada pavimento = 100%)
  pavimentosAtivos.forEach((pav) => {
    const etapasAtivas = pav.etapas.filter((e) => e.ativo);

    if (etapasAtivas.length === 0) {
      avisos.push(`Pavimento "${pav.nome}": nenhuma etapa configurada`);
      return;
    }

    // Verificar pesos negativos nas etapas
    etapasAtivas.forEach((etapa) => {
      if (etapa.peso < 0) {
        erros.push(`Etapa "${etapa.nome}" (${pav.nome}): peso negativo (${etapa.peso}%)`);
      }
      if (etapa.peso === 0) {
        avisos.push(`Etapa "${etapa.nome}" (${pav.nome}): peso é 0%`);
      }
    });

    const somaEtapas = Math.round(etapasAtivas.reduce((acc, e) => acc + e.peso, 0) * 100) / 100;
    if (somaEtapas !== 100) {
      erros.push(
        `Pavimento "${pav.nome}": soma das etapas é ${somaEtapas}% (esperado: 100%)`
      );
    }
  });

  return {
    valido: erros.length === 0,
    erros,
    avisos,
  };
}

// =====================================================
// FUNÇÃO: Obter Detalhamento do Progresso
// =====================================================
// Retorna um resumo legível do progresso ponderado,
// ideal para exibição em chatbot ou dashboard
// =====================================================

/**
 * Gera um resumo formatado do progresso ponderado de um projeto.
 *
 * Combina cálculo + validação e retorna um objeto pronto para
 * exibição, incluindo texto descritivo para cada pavimento/etapa.
 *
 * @param projeto_id - ID do projeto
 * @param pavimentos - Lista de pavimentos com suas etapas
 * @param etapasGlobais - Lista de etapas globais
 * @returns Progresso calculado + validação + linhas de resumo
 */
export function getProgressBreakdown(
  projeto_id: string,
  pavimentos: Pavimento[],
  etapasGlobais: EtapaGlobal[]
): {
  progresso: ProgressoPonderado;
  validacao: ValidacaoPesos;
  resumo: string[];
} {
  const progresso = calculateWeightedProgress(projeto_id, pavimentos, etapasGlobais);
  const validacao = validateWeights(pavimentos, etapasGlobais);

  const resumo: string[] = [];

  // Linha de cabeçalho
  resumo.push(`Progresso ponderado: ${progresso.percentual_ponderado}%`);

  // Aviso de pesos inválidos
  if (!progresso.pesos_validos) {
    resumo.push(
      `⚠ Pesos somam ${progresso.soma_pesos_configurados}% (esperado: 100%)`
    );
  }

  // Detalhamento dos pavimentos
  if (progresso.detalhamento.pavimentos.length > 0) {
    resumo.push('');
    resumo.push('Pavimentos:');
    progresso.detalhamento.pavimentos.forEach((pav) => {
      const checkmark = pav.percentual_interno === 100 ? '[OK]' : `[${pav.percentual_interno}%]`;
      resumo.push(
        `  ${pav.nome} (peso ${pav.peso}%): ` +
          `${pav.etapas_concluidas}/${pav.total_etapas} etapas ${checkmark} ` +
          `-> contribui ${pav.contribuicao}%`
      );
    });
  }

  // Detalhamento das etapas globais
  if (progresso.detalhamento.globais.length > 0) {
    resumo.push('');
    resumo.push('Etapas globais:');
    progresso.detalhamento.globais.forEach((g) => {
      const status = g.concluida ? '[OK]' : '[pendente]';
      resumo.push(
        `  ${g.nome} (peso ${g.peso}%): ${status} -> contribui ${g.contribuicao}%`
      );
    });
  }

  return {
    progresso,
    validacao,
    resumo,
  };
}

// =====================================================
// FUNÇÃO AUXILIAR: Calcular Progresso de Um Pavimento
// =====================================================
// Calcula o progresso interno de um único pavimento
// =====================================================

/**
 * Calcula o progresso interno de um único pavimento.
 *
 * @param pavimento - Pavimento com suas etapas
 * @returns Percentual interno (0-100) baseado nas etapas concluídas
 */
export function calculateFloorProgress(pavimento: Pavimento): number {
  const etapasAtivas = pavimento.etapas.filter((e) => e.ativo);

  if (etapasAtivas.length === 0) {
    return 0;
  }

  const somaConcluidas = etapasAtivas
    .filter((e) => e.concluida)
    .reduce((acc, e) => acc + e.peso, 0);

  return Math.round(Math.max(0, Math.min(100, somaConcluidas)) * 100) / 100;
}

// =====================================================
// EXEMPLO DE USO
// =====================================================

/*
import {
  calculateWeightedProgress,
  validateWeights,
  getProgressBreakdown,
  calculateFloorProgress,
} from './calculateWeightedProgress';

// Exemplo: Projeto com 2 pavimentos + 1 etapa global

const pavimentos = [
  {
    pavimento_id: 'pav-1', projeto_id: 'proj-1', nome: 'Térreo',
    ordem: 1, peso: 40, ativo: true,
    etapas: [
      { etapa_id: 'e-1', pavimento_id: 'pav-1', nome: 'Fundação', peso: 50, concluida: true, ativo: true },
      { etapa_id: 'e-2', pavimento_id: 'pav-1', nome: 'Alvenaria', peso: 30, concluida: false, ativo: true },
      { etapa_id: 'e-3', pavimento_id: 'pav-1', nome: 'Elétrica', peso: 20, concluida: false, ativo: true },
    ],
  },
  {
    pavimento_id: 'pav-2', projeto_id: 'proj-1', nome: '1o Pavimento',
    ordem: 2, peso: 50, ativo: true,
    etapas: [
      { etapa_id: 'e-4', pavimento_id: 'pav-2', nome: 'Estrutura', peso: 60, concluida: false, ativo: true },
      { etapa_id: 'e-5', pavimento_id: 'pav-2', nome: 'Acabamento', peso: 40, concluida: false, ativo: true },
    ],
  },
];

const etapasGlobais = [
  {
    etapa_global_id: 'g-1', projeto_id: 'proj-1', nome: 'Aprovação prefeitura',
    peso: 10, concluida: true, ativo: true,
  },
];

// Calcular progresso
const resultado = calculateWeightedProgress('proj-1', pavimentos, etapasGlobais);
console.log(resultado.percentual_ponderado);
// Térreo: 40% * 50% (fundação concluída) / 100 = 20%
// 1o Pav: 50% * 0% / 100 = 0%
// Global: 10% (aprovação concluída)
// Total = 20 + 0 + 10 = 30%

// Validar pesos
const validacao = validateWeights(pavimentos, etapasGlobais);
console.log(validacao);
// { valido: true, erros: [], avisos: [] }

// Resumo completo
const { resumo } = getProgressBreakdown('proj-1', pavimentos, etapasGlobais);
console.log(resumo.join('\n'));
*/
