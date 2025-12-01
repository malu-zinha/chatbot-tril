// =====================================================
// LÓGICA: Cálculo e Análise de Retrabalho
// =====================================================
// Responsabilidade: Colega (Lógica de Negócio)
//
// Este módulo contém toda a lógica de classificação,
// análise e cálculo de impacto de retrabalhos
// =====================================================

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface Retrabalho {
  id?: string;
  projeto_id: string;
  data: string;
  motivo: string;
  categoria?: string;
  descricao: string;
  impacto_percentual?: number;
  tempo_perdido_horas?: number;
  resolvido?: boolean;
}

export interface ClassificacaoMotivo {
  categoria: string;
  subcategoria: string;
  severidade: 'baixa' | 'media' | 'alta' | 'critica';
  sugestao_preventiva?: string;
}

export interface ImpactoRetrabalho {
  total_retrabalhos: number;
  impacto_total_percentual: number;
  tempo_total_perdido_horas: number;
  media_impacto_por_retrabalho: number;
  categoria_mais_frequente: string;
  severidade_geral: 'baixa' | 'media' | 'alta' | 'critica';
  recomendacoes: string[];
}

export interface TendenciaRetrabalho {
  periodo: string;
  quantidade: number;
  impacto_medio: number;
  tendencia: 'aumentando' | 'estavel' | 'diminuindo';
}

// =====================================================
// MAPEAMENTO DE CATEGORIAS E MOTIVOS
// =====================================================

const CATEGORIAS_DETALHADAS: {
  [key: string]: {
    categoria: string;
    subcategoria: string;
    severidade: 'baixa' | 'media' | 'alta' | 'critica';
    sugestao: string;
  };
} = {
  // Técnicos
  'erro de projeto': {
    categoria: 'Técnico',
    subcategoria: 'Erro de Projeto',
    severidade: 'alta',
    sugestao: 'Revisar processo de validação de projetos',
  },
  'erro de planejamento': {
    categoria: 'Técnico',
    subcategoria: 'Erro de Planejamento',
    severidade: 'alta',
    sugestao: 'Melhorar fase de planejamento e análise de riscos',
  },
  'erro de execução': {
    categoria: 'Técnico',
    subcategoria: 'Erro de Execução',
    severidade: 'media',
    sugestao: 'Treinar equipe em procedimentos corretos',
  },
  'falha de equipamento': {
    categoria: 'Técnico',
    subcategoria: 'Falha de Equipamento',
    severidade: 'media',
    sugestao: 'Implementar manutenção preventiva de equipamentos',
  },

  // Cliente
  'mudança de escopo': {
    categoria: 'Cliente',
    subcategoria: 'Mudança de Escopo',
    severidade: 'media',
    sugestao: 'Formalizar processo de gestão de mudanças',
  },
  'alteração de projeto': {
    categoria: 'Cliente',
    subcategoria: 'Alteração de Projeto',
    severidade: 'media',
    sugestao: 'Estabelecer aprovações formais antes de iniciar execução',
  },
  'requisitos incorretos': {
    categoria: 'Cliente',
    subcategoria: 'Requisitos Incorretos',
    severidade: 'alta',
    sugestao: 'Melhorar levantamento e validação de requisitos',
  },

  // Fornecedor
  'material incorreto': {
    categoria: 'Fornecedor',
    subcategoria: 'Material Incorreto',
    severidade: 'alta',
    sugestao: 'Implementar inspeção rigorosa no recebimento',
  },
  'atraso de fornecedor': {
    categoria: 'Fornecedor',
    subcategoria: 'Atraso de Fornecedor',
    severidade: 'media',
    sugestao: 'Trabalhar com fornecedores backup',
  },
  'qualidade inadequada': {
    categoria: 'Fornecedor',
    subcategoria: 'Qualidade Inadequada',
    severidade: 'alta',
    sugestao: 'Reavaliar fornecedores e critérios de qualidade',
  },

  // Planejamento
  'falta de recursos': {
    categoria: 'Planejamento',
    subcategoria: 'Falta de Recursos',
    severidade: 'alta',
    sugestao: 'Melhorar planejamento de recursos',
  },
  'cronograma inadequado': {
    categoria: 'Planejamento',
    subcategoria: 'Cronograma Inadequado',
    severidade: 'media',
    sugestao: 'Usar histórico de projetos similares para estimar prazos',
  },

  // Externos
  'condições climáticas': {
    categoria: 'Externo',
    subcategoria: 'Condições Climáticas',
    severidade: 'baixa',
    sugestao: 'Considerar sazonalidade no planejamento',
  },
  'problemas regulatórios': {
    categoria: 'Externo',
    subcategoria: 'Problemas Regulatórios',
    severidade: 'media',
    sugestao: 'Antecipar aprovações e licenças necessárias',
  },
};

// =====================================================
// FUNÇÃO: Classificar Motivo do Retrabalho
// =====================================================

export function classifyReworkReason(descricao: string, motivoFornecido?: string): ClassificacaoMotivo {
  const textoAnalise = (motivoFornecido + ' ' + descricao).toLowerCase();

  // Buscar match nas categorias conhecidas
  for (const [chave, config] of Object.entries(CATEGORIAS_DETALHADAS)) {
    if (textoAnalise.includes(chave)) {
      return {
        categoria: config.categoria,
        subcategoria: config.subcategoria,
        severidade: config.severidade,
        sugestao_preventiva: config.sugestao,
      };
    }
  }

  // Classificação por palavras-chave se não houver match exato
  if (
    textoAnalise.includes('projeto') ||
    textoAnalise.includes('desenho') ||
    textoAnalise.includes('dimensionamento')
  ) {
    return {
      categoria: 'Técnico',
      subcategoria: 'Erro de Projeto',
      severidade: 'alta',
      sugestao_preventiva: 'Revisar processo de validação de projetos',
    };
  }

  if (
    textoAnalise.includes('cliente') ||
    textoAnalise.includes('mudança') ||
    textoAnalise.includes('alteração')
  ) {
    return {
      categoria: 'Cliente',
      subcategoria: 'Mudança de Escopo',
      severidade: 'media',
      sugestao_preventiva: 'Formalizar processo de gestão de mudanças',
    };
  }

  if (
    textoAnalise.includes('material') ||
    textoAnalise.includes('fornecedor') ||
    textoAnalise.includes('entrega')
  ) {
    return {
      categoria: 'Fornecedor',
      subcategoria: 'Problema de Material',
      severidade: 'media',
      sugestao_preventiva: 'Melhorar gestão de fornecedores',
    };
  }

  // Classificação padrão
  return {
    categoria: 'Outro',
    subcategoria: 'Não Classificado',
    severidade: 'media',
    sugestao_preventiva: 'Analisar causa raiz para classificação adequada',
  };
}

// =====================================================
// FUNÇÃO: Calcular Impacto Total de Retrabalhos
// =====================================================

export function calculateReworkImpact(retrabalhos: Retrabalho[]): ImpactoRetrabalho {
  if (!retrabalhos || retrabalhos.length === 0) {
    return {
      total_retrabalhos: 0,
      impacto_total_percentual: 0,
      tempo_total_perdido_horas: 0,
      media_impacto_por_retrabalho: 0,
      categoria_mais_frequente: 'N/A',
      severidade_geral: 'baixa',
      recomendacoes: [],
    };
  }

  // Calcular totais
  const total_retrabalhos = retrabalhos.length;
  const impacto_total_percentual = retrabalhos.reduce(
    (acc, r) => acc + (r.impacto_percentual || 0),
    0
  );
  const tempo_total_perdido_horas = retrabalhos.reduce(
    (acc, r) => acc + (r.tempo_perdido_horas || 0),
    0
  );
  const media_impacto_por_retrabalho = impacto_total_percentual / total_retrabalhos;

  // Contar categorias
  const categorias: { [key: string]: number } = {};
  retrabalhos.forEach((r) => {
    const categoria = r.categoria || 'Outro';
    categorias[categoria] = (categorias[categoria] || 0) + 1;
  });

  // Categoria mais frequente
  const categoria_mais_frequente =
    Object.entries(categorias).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  // Determinar severidade geral
  let severidade_geral: 'baixa' | 'media' | 'alta' | 'critica';
  if (impacto_total_percentual >= 20 || total_retrabalhos >= 10) {
    severidade_geral = 'critica';
  } else if (impacto_total_percentual >= 10 || total_retrabalhos >= 5) {
    severidade_geral = 'alta';
  } else if (impacto_total_percentual >= 5 || total_retrabalhos >= 3) {
    severidade_geral = 'media';
  } else {
    severidade_geral = 'baixa';
  }

  // Gerar recomendações
  const recomendacoes: string[] = [];

  if (total_retrabalhos >= 5) {
    recomendacoes.push('Alto número de retrabalhos. Realizar análise de causa raiz.');
  }

  if (impacto_total_percentual >= 10) {
    recomendacoes.push('Impacto significativo no progresso. Revisar processos de qualidade.');
  }

  if (categoria_mais_frequente !== 'N/A') {
    recomendacoes.push(
      `Categoria mais frequente: ${categoria_mais_frequente}. Focar em ações preventivas nesta área.`
    );
  }

  if (tempo_total_perdido_horas >= 40) {
    recomendacoes.push('Alto tempo perdido. Implementar controles mais rigorosos.');
  }

  if (recomendacoes.length === 0) {
    recomendacoes.push('Manter monitoramento contínuo dos retrabalhos.');
  }

  return {
    total_retrabalhos,
    impacto_total_percentual: Math.round(impacto_total_percentual * 100) / 100,
    tempo_total_perdido_horas: Math.round(tempo_total_perdido_horas * 100) / 100,
    media_impacto_por_retrabalho: Math.round(media_impacto_por_retrabalho * 100) / 100,
    categoria_mais_frequente,
    severidade_geral,
    recomendacoes,
  };
}

// =====================================================
// FUNÇÃO: Analisar Tendência de Retrabalhos
// =====================================================

export function analyzeReworkTrend(retrabalhos: Retrabalho[]): TendenciaRetrabalho[] {
  if (!retrabalhos || retrabalhos.length === 0) {
    return [];
  }

  // Agrupar por mês
  const retrabalhosPorMes: { [mes: string]: Retrabalho[] } = {};

  retrabalhos.forEach((r) => {
    const data = new Date(r.data);
    const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
    if (!retrabalhosPorMes[mesAno]) {
      retrabalhosPorMes[mesAno] = [];
    }
    retrabalhosPorMes[mesAno].push(r);
  });

  // Calcular tendências por mês
  const tendencias: TendenciaRetrabalho[] = Object.entries(retrabalhosPorMes)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, retrabalhosMes]) => {
      const quantidade = retrabalhosMes.length;
      const impacto_medio =
        retrabalhosMes.reduce((acc, r) => acc + (r.impacto_percentual || 0), 0) / quantidade;

      return {
        periodo: mes,
        quantidade,
        impacto_medio: Math.round(impacto_medio * 100) / 100,
        tendencia: 'estavel' as 'aumentando' | 'estavel' | 'diminuindo',
      };
    });

  // Calcular tendência comparando com o mês anterior
  for (let i = 1; i < tendencias.length; i++) {
    const mesAtual = tendencias[i];
    const mesAnterior = tendencias[i - 1];

    const variacaoQuantidade =
      ((mesAtual.quantidade - mesAnterior.quantidade) / mesAnterior.quantidade) * 100;

    if (variacaoQuantidade > 20) {
      mesAtual.tendencia = 'aumentando';
    } else if (variacaoQuantidade < -20) {
      mesAtual.tendencia = 'diminuindo';
    } else {
      mesAtual.tendencia = 'estavel';
    }
  }

  return tendencias;
}

// =====================================================
// FUNÇÃO: Sugerir Ações Corretivas
// =====================================================

export function suggestCorrectiveActions(retrabalhos: Retrabalho[]): {
  categoria: string;
  quantidade: number;
  sugestoes: string[];
}[] {
  if (!retrabalhos || retrabalhos.length === 0) {
    return [];
  }

  // Agrupar por categoria
  const retrabalhosPorCategoria: { [categoria: string]: Retrabalho[] } = {};

  retrabalhos.forEach((r) => {
    const categoria = r.categoria || 'Outro';
    if (!retrabalhosPorCategoria[categoria]) {
      retrabalhosPorCategoria[categoria] = [];
    }
    retrabalhosPorCategoria[categoria].push(r);
  });

  // Gerar sugestões por categoria
  const acoes = Object.entries(retrabalhosPorCategoria)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([categoria, retrabalhos]) => {
      const sugestoes: string[] = [];

      // Extrair sugestões dos retrabalhos
      const sugestoesUnicas = new Set<string>();
      retrabalhos.forEach((r) => {
        const classificacao = classifyReworkReason(r.descricao, r.motivo);
        if (classificacao.sugestao_preventiva) {
          sugestoesUnicas.add(classificacao.sugestao_preventiva);
        }
      });

      sugestoes.push(...Array.from(sugestoesUnicas));

      // Sugestões genéricas se não houver específicas
      if (sugestoes.length === 0) {
        sugestoes.push(`Analisar causa raiz dos retrabalhos de ${categoria}`);
        sugestoes.push(`Implementar checklist de validação para ${categoria}`);
      }

      return {
        categoria,
        quantidade: retrabalhos.length,
        sugestoes,
      };
    });

  return acoes;
}

// =====================================================
// EXEMPLO DE USO
// =====================================================

/*
import {
  classifyReworkReason,
  calculateReworkImpact,
  analyzeReworkTrend,
  suggestCorrectiveActions,
} from './calculateRework';

// Exemplo 1: Classificar motivo
const classificacao = classifyReworkReason(
  'Erro no dimensionamento dos cabos elétricos',
  'Erro de Projeto'
);
console.log(classificacao);

// Exemplo 2: Calcular impacto
const retrabalhos = [
  {
    projeto_id: 'uuid',
    data: '2024-01-15',
    motivo: 'Erro de Projeto',
    categoria: 'Técnico',
    descricao: 'Erro no dimensionamento',
    impacto_percentual: 5,
    tempo_perdido_horas: 8,
  },
  // ... mais retrabalhos
];

const impacto = calculateReworkImpact(retrabalhos);
console.log(impacto);

// Exemplo 3: Analisar tendência
const tendencia = analyzeReworkTrend(retrabalhos);
console.log(tendencia);

// Exemplo 4: Sugerir ações
const acoes = suggestCorrectiveActions(retrabalhos);
console.log(acoes);
*/

