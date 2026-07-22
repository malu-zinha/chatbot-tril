import { statusDonoPorProgresso } from '../chatbot/flows/ownerFlow.ts';

let pass = 0, fail = 0;
function assert(cond: boolean, name: string) {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.error(`❌ ${name}`); }
}

const mariaRitaRegressao = {
  status_id: 1,
  status_descricao: 'Aguardando Início',
  percentual_andamento: 0,
  percentual_ponderado: 100,
  data_conclusao: '2026-06-12',
};

assert(
  statusDonoPorProgresso(mariaRitaRegressao) === 'Concluído',
  'dono mostra Concluído quando percentual_ponderado e data_conclusao indicam tarefa finalizada'
);

assert(
  statusDonoPorProgresso({ status_descricao: 'Aguardando Início', percentual_andamento: 41.69 }) === 'Em Andamento',
  'dono ignora status legado e deriva Em Andamento do percentual'
);

assert(
  statusDonoPorProgresso({ status_descricao: 'Aguardando Início', percentual_andamento: 0 }) === 'Aguardando Início',
  'dono preserva Aguardando Início quando progresso e conclusao nao existem'
);

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
