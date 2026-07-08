import assert from 'node:assert/strict';

import {
  formatProjetoDisciplinaLinha,
  formatProjetoNomeComCodigo,
} from '../logic/projetos/display.ts';

assert.equal(
  formatProjetoNomeComCodigo({
    codigo_projeto: 'PRJ-020',
    cliente: 'Condominio Reserva dos Ipes',
    descricao: 'Descricao auxiliar',
  }),
  'Condominio Reserva dos Ipes (PRJ-020)',
);

assert.equal(
  formatProjetoNomeComCodigo({
    codigo_projeto: 'PRJ-060',
    cliente: '',
    descricao: 'Piscina do bloco A',
  }),
  'Piscina do bloco A (PRJ-060)',
);

assert.equal(
  formatProjetoNomeComCodigo({
    codigo_projeto: 'PRJ-059',
    cliente: '',
    descricao: '',
  }),
  'PRJ-059',
);

assert.equal(
  formatProjetoDisciplinaLinha({
    codigo_projeto: 'PRJ-020',
    cliente: 'Condominio Reserva dos Ipes',
    descricao: '',
    area_descricao: 'Complemento',
  }),
  'Condominio Reserva dos Ipes (PRJ-020) - Complemento',
);

assert.equal(
  formatProjetoDisciplinaLinha({
    codigo_projeto: 'PRJ-047',
    cliente: 'Condominio Reserva dos Ipes',
    descricao: '',
    area_codigo: 'COMPATIBILIZACAO',
    area_descricao: 'Compatibilizacao',
    instancia_label: 'Compatibilizacao Revisao Cliente',
  }),
  'Condominio Reserva dos Ipes (PRJ-047) - Compatibilizacao Revisao Cliente',
);

console.log('test-projeto-display: OK');
