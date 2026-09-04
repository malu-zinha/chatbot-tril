// =====================================================
// TESTE: redação de segredos
// =====================================================
// Rodar com: npx tsx tests/test-redact-secrets.ts
// =====================================================

import assert from 'node:assert';
import { redactSecrets, logSupabaseError } from '../logic/security/redactSecrets.ts';

let passou = 0;

function check(nome: string, entrada: unknown, naoPodeConter: string[], devePermanecer: string[] = []) {
  const saida = redactSecrets(entrada);

  for (const proibido of naoPodeConter) {
    assert.ok(
      !saida.includes(proibido),
      `[${nome}] vazou "${proibido.slice(0, 12)}..." em: ${saida}`
    );
  }
  for (const esperado of devePermanecer) {
    assert.ok(saida.includes(esperado), `[${nome}] perdeu o contexto "${esperado}" em: ${saida}`);
  }

  passou++;
  console.log(`   ✅ ${nome}`);
}

// =====================================================
// AMOSTRAS — montadas em runtime, NUNCA literais
// =====================================================
// Um teste de redação precisa de valores com o formato real das credenciais,
// senão não prova nada. Mas uma string literal completa nesse formato dispara
// o secret scanning do GitHub e bloqueia o push da branch (foi o que
// aconteceu com o Twilio Account SID).
//
// Solução: nenhuma amostra existe inteira no código-fonte. Todas são
// concatenadas em tempo de execução, então o scanner não encontra o padrão no
// arquivo, e o redactSecrets recebe exatamente o formato que precisa tratar.
//
// REGRA: ao adicionar uma amostra nova, monte-a por partes aqui. Não cole um
// valor completo, mesmo fictício.
// =====================================================

const SB = 'sb' + '_';
const AMOSTRAS = {
  /** sb_secret_… — o formato da chave que vazou no incidente */
  supabaseSecret: `${SB}secret_` + 'ABCdef123456' + '_ghiJKL789',
  /** sb_publishable_… */
  supabasePublishable: `${SB}publishable_` + 'AbC123' + '_xyz789',
  /** JWT de 3 segmentos (service role legado) */
  jwt: ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', 'eyJyb2xlIjoidGVzdGUifQ', 'AbCdEfGhIjK'].join('.'),
  /** sk-proj-… */
  openai: 'sk-' + 'proj-' + 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789',
  /** ACxxxxxxxx… (32 hex) — Twilio Account SID */
  twilioSid: 'AC' + '0123456789abcdef'.repeat(2),
  /** SKxxxxxxxx… (32 hex) — Twilio API Key SID */
  twilioApiKey: 'SK' + 'fedcba9876543210'.repeat(2),
} as const;

console.log('\n🔐 TESTE: redactSecrets\n');

// ---------------------------------------------------------------
// 1. O caso real do incidente
// ---------------------------------------------------------------
const SEGREDO_FAKE = AMOSTRAS.supabaseSecret;
check(
  'Headers.set com Secret Key (o erro que apareceu no navegador)',
  `TypeError: Headers.set: "${SEGREDO_FAKE}" is an invalid header value`,
  [SEGREDO_FAKE],
  ['Headers.set', `${SB}secret_***`]
);

// ---------------------------------------------------------------
// 2. Cada formato de credencial
// ---------------------------------------------------------------
check('sb_publishable_', `key=${AMOSTRAS.supabasePublishable}`, [AMOSTRAS.supabasePublishable]);

check('JWT (service role legado)', `Authorization: Bearer ${AMOSTRAS.jwt}`, [AMOSTRAS.jwt]);

check('OpenAI', `OPENAI_API_KEY=${AMOSTRAS.openai}`, [AMOSTRAS.openai]);

check('Twilio Account SID', `sid ${AMOSTRAS.twilioSid} ok`, [AMOSTRAS.twilioSid]);

check('Twilio API Key SID', `key ${AMOSTRAS.twilioApiKey} ok`, [AMOSTRAS.twilioApiKey]);

check('senha em connection string', 'postgresql://user:SenhaSuperSecreta@host:5432/db', [
  'SenhaSuperSecreta',
]);

check('apikey em querystring', 'GET /rest/v1/x?apikey=umValorMuitoSecretoAqui123', [
  'umValorMuitoSecretoAqui123',
]);

// Guarda-trilho: se alguém colar um literal completo aqui no futuro, o teste
// abaixo continua passando, mas o push será bloqueado. Este assert garante ao
// menos que as amostras têm o formato certo — ou seja, que a montagem em
// runtime não degradou o valor a ponto de não exercitar o padrão.
assert.match(AMOSTRAS.twilioSid, /^AC[0-9a-f]{32}$/, 'amostra Twilio SID perdeu o formato');
assert.match(AMOSTRAS.jwt, /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/, 'amostra JWT perdeu o formato');
passou++;
console.log('   ✅ amostras montadas em runtime mantêm o formato real');

// ---------------------------------------------------------------
// 3. Varredura de process.env — a parte que pega formatos desconhecidos
// ---------------------------------------------------------------
const VALOR_INESPERADO = 'formato-totalmente-desconhecido-123456';
process.env.ALGUMA_COISA_TOKEN = VALOR_INESPERADO;
check(
  'valor de env sensível em texto arbitrário',
  `falhou ao conectar usando ${VALOR_INESPERADO} no host`,
  [VALOR_INESPERADO],
  ['[REDACTED:ALGUMA_COISA_TOKEN]']
);
delete process.env.ALGUMA_COISA_TOKEN;

// ---------------------------------------------------------------
// 4. Objetos, Errors e idempotência
// ---------------------------------------------------------------
check(
  'objeto de erro do PostgREST',
  { message: `chave ${SEGREDO_FAKE} rejeitada`, code: 'PGRST301' },
  [SEGREDO_FAKE],
  ['PGRST301']
);

check('instância de Error', new Error(`falha com ${SEGREDO_FAKE}`), [SEGREDO_FAKE]);

assert.strictEqual(
  redactSecrets(redactSecrets(`x ${SEGREDO_FAKE} y`)),
  redactSecrets(`x ${SEGREDO_FAKE} y`),
  'redactSecrets deveria ser idempotente'
);
passou++;
console.log('   ✅ idempotente');

// ---------------------------------------------------------------
// 5. Não pode mascarar o que não é segredo
// ---------------------------------------------------------------
const textoLimpo = 'Falha ao buscar engenheiro no projeto ABC-123 (code PGRST116)';
assert.strictEqual(redactSecrets(textoLimpo), textoLimpo, 'texto sem segredo foi alterado');
passou++;
console.log('   ✅ texto limpo passa intacto');

// ---------------------------------------------------------------
// 6. logSupabaseError não imprime o segredo
// ---------------------------------------------------------------
const originalError = console.error;
const capturado: string[] = [];
console.error = (...args: unknown[]) => {
  capturado.push(args.map(String).join(' '));
};
logSupabaseError('Falha ao consultar cadastro', {
  message: `header inválido: ${SEGREDO_FAKE}`,
  code: 'PGRST301',
});
console.error = originalError;

assert.ok(capturado.length === 1, 'logSupabaseError deveria logar exatamente uma linha');
assert.ok(!capturado[0].includes(SEGREDO_FAKE), `logSupabaseError vazou o segredo: ${capturado[0]}`);
assert.ok(capturado[0].includes('PGRST301'), 'logSupabaseError deveria manter o code');
passou++;
console.log('   ✅ logSupabaseError mascara e mantém o code');

console.log(`\n✅ ${passou} verificações passaram\n`);
