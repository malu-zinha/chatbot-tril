// =====================================================
// TESTE: cliente Supabase ausente falha com mensagem clara
// =====================================================
// Sem credenciais, criarClienteSupabaseValidado() devolve null (não pode
// lançar no import, senão derruba o boot). O risco é o null chegar até um
// this.supabase.from(...) e virar "Cannot read properties of null" sem
// contexto. exigirClienteSupabase() transforma isso numa falha explícita.
//
// Rodar com: npx tsx tests/test-cliente-supabase-indisponivel.ts
// =====================================================

import assert from 'node:assert';
import {
  ClienteSupabaseIndisponivelError,
  criarClienteSupabaseValidado,
  exigirClienteSupabase,
} from '../integrations/supabase/createValidatedClient.ts';

let passou = 0;

console.log('\n🔌 TESTE: cliente Supabase indisponível\n');

// ---------------------------------------------------------------
// 1. Sem credenciais -> null (e não uma exceção no import)
// ---------------------------------------------------------------
{
  const urlOriginal = process.env.SUPABASE_URL;
  const keyOriginal = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  const cliente = criarClienteSupabaseValidado('TesteSemCredenciais');
  assert.strictEqual(cliente, null, 'sem credenciais o cliente deve ser null');

  if (urlOriginal !== undefined) process.env.SUPABASE_URL = urlOriginal;
  if (keyOriginal !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = keyOriginal;

  passou++;
  console.log('   ✅ sem credenciais -> null, sem derrubar o processo');
}

// ---------------------------------------------------------------
// 2. Usar o cliente ausente -> erro explícito, não null deref
// ---------------------------------------------------------------
{
  assert.throws(
    () => exigirClienteSupabase(null, 'TesteSync'),
    (erro: unknown) => {
      assert.ok(
        erro instanceof ClienteSupabaseIndisponivelError,
        'deve lançar ClienteSupabaseIndisponivelError'
      );
      assert.ok(erro.message.includes('TesteSync'), `mensagem sem o escopo: ${erro.message}`);
      assert.ok(
        !erro.message.includes('Cannot read properties'),
        `mensagem não pode ser um null deref: ${erro.message}`
      );
      return true;
    }
  );
  passou++;
  console.log('   ✅ uso do cliente ausente -> erro explícito com escopo');
}

// ---------------------------------------------------------------
// 3. A mensagem de erro nunca inclui a credencial
// ---------------------------------------------------------------
{
  const erro = new ClienteSupabaseIndisponivelError('TesteSync');
  const chaveFalsa = 'sb_secret_valor_que_nao_pode_vazar';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? chaveFalsa;

  assert.ok(
    !erro.message.includes('sb_secret') && !erro.message.includes(chaveFalsa),
    `a mensagem vazou credencial: ${erro.message}`
  );
  passou++;
  console.log('   ✅ mensagem cita as variáveis, nunca os valores');
}

// ---------------------------------------------------------------
// 4. Cliente válido passa direto
// ---------------------------------------------------------------
{
  const fake = { from: () => ({}) } as any;
  assert.strictEqual(
    exigirClienteSupabase(fake, 'TesteSync'),
    fake,
    'cliente válido deve ser devolvido sem alteração'
  );
  passou++;
  console.log('   ✅ cliente válido passa direto');
}

console.log(`\n✅ ${passou} verificações passaram\n`);
