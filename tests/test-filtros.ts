import {
  filterEtapasPendentes,
  filterPavimentosPendentes,
  isAreaConcluida,
  filterAreasPendentes,
  isProjetoTotalmenteConcluido,
  filterGlobaisPendentes,
  statusPorPercentual,
} from '../logic/execucao/filtros.ts';

let pass = 0, fail = 0;
function assert(cond: boolean, name: string) {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.error(`❌ ${name}`); }
}

const etapas = [
  { etapa_id: 'e1', nome: 'A', concluida: true,  ativo: true },
  { etapa_id: 'e2', nome: 'B', concluida: false, ativo: true },
  { etapa_id: 'e3', nome: 'C', concluida: false, ativo: false },
];
assert(filterEtapasPendentes(etapas).length === 1, 'filterEtapasPendentes ignora concluidas e inativas');

const pavs = [
  { pavimento_id: 'p1', nome: 'Térreo', area_id: 'a1', ativo: true, etapas: [
    { etapa_id: 'e1', nome: 'A', concluida: true,  ativo: true },
    { etapa_id: 'e2', nome: 'B', concluida: false, ativo: true },
  ]},
  { pavimento_id: 'p2', nome: 'Sub',    area_id: 'a1', ativo: true, etapas: [
    { etapa_id: 'e3', nome: 'C', concluida: true, ativo: true },
  ]},
  { pavimento_id: 'p3', nome: 'Tipo',   area_id: 'a2', ativo: true, etapas: [
    { etapa_id: 'e4', nome: 'D', concluida: false, ativo: true },
  ]},
];

const filtPavs = filterPavimentosPendentes(pavs);
assert(filtPavs.length === 2, 'filterPavimentosPendentes remove pavimento sem etapas pendentes');
assert(filtPavs[0].etapas.length === 1, 'filterPavimentosPendentes mantém só etapas pendentes');

assert(isAreaConcluida(pavs, 'a1') === false, 'área a1 não está concluída (tem etapa B pendente)');
assert(isAreaConcluida(pavs, 'a2') === false, 'área a2 não está concluída');

const pavsTodasConcluidas = pavs.map(p => ({
  ...p, etapas: p.etapas.map(e => ({ ...e, concluida: true })),
}));
assert(isAreaConcluida(pavsTodasConcluidas, 'a1') === true, 'área a1 concluída quando tudo true');
assert(isProjetoTotalmenteConcluido(pavsTodasConcluidas) === true, 'projeto totalmente concluído');

const areas = [{ area_id: 'a1', codigo: 'ELETRICO' }, { area_id: 'a2', codigo: 'HIDRAULICO' }];
const todasA1ConcA2Pend = pavsTodasConcluidas.filter(p => p.area_id === 'a1').concat([
  { pavimento_id: 'p3', nome: 'Tipo', area_id: 'a2', ativo: true, etapas: [
    { etapa_id: 'e4', nome: 'D', concluida: false, ativo: true },
  ]},
]);
const filtAreas = filterAreasPendentes(areas, todasA1ConcA2Pend);
assert(filtAreas.length === 1 && filtAreas[0].area_id === 'a2', 'filterAreasPendentes remove a1 concluída');

// Edge case: pavimento sem etapas configuradas NÃO é "concluído"
const pavSemEtapas = [
  { pavimento_id: 'p1', nome: 'X', area_id: 'a1', ativo: true, etapas: [] },
];
assert(isAreaConcluida(pavSemEtapas, 'a1') === false, 'área com pavimento sem etapas NÃO está concluída');
assert(isProjetoTotalmenteConcluido(pavSemEtapas) === false, 'projeto com pavimento sem etapas NÃO está concluído');

// --- Etapas globais pendentes ---
const globais = [
  { etapa_global_id: 'g1', nome: 'Memorial',   concluida: false, ativo: true },
  { etapa_global_id: 'g2', nome: 'Pranchas',   concluida: true,  ativo: true },
  { etapa_global_id: 'g3', nome: 'Desativada', concluida: false, ativo: false },
];
assert(filterGlobaisPendentes(globais).length === 1, 'filterGlobaisPendentes ignora concluídas e inativas');
assert(filterGlobaisPendentes(globais)[0].etapa_global_id === 'g1', 'filterGlobaisPendentes mantém só a pendente ativa');

// --- statusPorPercentual ---
assert(statusPorPercentual(0) === 'Aguardando Início', 'pct 0 → Aguardando Início');
assert(statusPorPercentual(3.03) === 'Em Andamento', 'pct 3.03 → Em Andamento');
assert(statusPorPercentual(99.9) === 'Em Andamento', 'pct 99.9 → Em Andamento');
assert(statusPorPercentual(100) === 'Concluído', 'pct 100 → Concluído');
assert(statusPorPercentual(undefined as any) === 'Aguardando Início', 'pct undefined → Aguardando Início');

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
