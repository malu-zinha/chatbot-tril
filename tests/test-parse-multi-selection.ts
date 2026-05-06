import { parseMultiSelection, MultiSelectionError } from '../logic/execucao/parseMultiSelection.ts';

let pass = 0, fail = 0;
function eq<T>(a: T, b: T, name: string) {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (ok) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.error(`❌ ${name}: got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`); }
}
function throws(fn: () => unknown, name: string) {
  try { fn(); fail++; console.error(`❌ ${name}: did not throw`); }
  catch (e) {
    if (e instanceof MultiSelectionError) { pass++; console.log(`✅ ${name}`); }
    else { fail++; console.error(`❌ ${name}: wrong error type`); }
  }
}

eq(parseMultiSelection('1', 5),       [0],          'single');
eq(parseMultiSelection('1,3,5', 5),   [0, 2, 4],    'lista');
eq(parseMultiSelection('2-4', 5),     [1, 2, 3],    'range');
eq(parseMultiSelection('1,3-5', 5),   [0, 2, 3, 4], 'misto');
eq(parseMultiSelection('todas', 3),   [0, 1, 2],    'todas');
eq(parseMultiSelection('todos', 3),   [0, 1, 2],    'todos');
eq(parseMultiSelection('5-2', 5),     [1, 2, 3, 4], 'range invertido');
eq(parseMultiSelection('1,1,2', 5),   [0, 1],       'remove duplicatas');
eq(parseMultiSelection(' 1 , 3 ', 5), [0, 2],       'tolera espaços');

throws(() => parseMultiSelection('', 5),       'erro: vazio');
throws(() => parseMultiSelection('6', 5),      'erro: fora do range');
throws(() => parseMultiSelection('0', 5),      'erro: zero não permitido (é o atalho voltar)');
throws(() => parseMultiSelection('a,b', 5),    'erro: não-numérico');
throws(() => parseMultiSelection('1-7', 5),    'erro: range fora');
throws(() => parseMultiSelection('-3', 5),     'erro: range mal formado');

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
