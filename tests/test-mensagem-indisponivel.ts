// =====================================================
// TESTE: mensagem do WhatsApp quando o Supabase está fora
// =====================================================
// Garante o comportamento do item 7 do plano de ajustes: com o banco
// indisponível o engenheiro recebe "serviço temporariamente indisponível",
// NUNCA "número não cadastrado" — e nenhum detalhe técnico.
//
// Rodar com: npx tsx tests/test-mensagem-indisponivel.ts
// =====================================================

import assert from 'node:assert';
import {
  getSupabaseService,
  SupabaseUnavailableError,
} from '../integrations/supabase/supabaseService.ts';

import { messageHandler } from '../chatbot/handlers/messageHandler.ts';

// O MessageHandler resolve o SupabaseService de forma preguiçosa (só na
// primeira chamada de autenticação) e guarda a MESMA referência que
// getSupabaseService() devolve aqui. Trocar os métodos neste objeto, antes de
// processar qualquer mensagem, vale para o handler também.
const supabase = getSupabaseService() as any;

let passou = 0;
const TELEFONE = '+5583999990000';

function proibirDetalheTecnico(nome: string, texto: string) {
  const proibidos = [
    'Supabase',
    'PGRST',
    'sb_secret',
    'stack',
    'Stack',
    'engenheiros',
    'dono_empresa',
    'fetch failed',
    'TypeError',
    'Headers.set',
  ];
  for (const p of proibidos) {
    assert.ok(!texto.includes(p), `[${nome}] vazou detalhe técnico "${p}" em:\n${texto}`);
  }
}

console.log('\n📱 TESTE: mensagem de indisponibilidade no WhatsApp\n');

// ---------------------------------------------------------------
// 1. Banco fora -> "serviço temporariamente indisponível"
// ---------------------------------------------------------------
{
  supabase.buscarEngenheiroPorTelefone = async () => {
    throw new SupabaseUnavailableError('buscarEngenheiroPorTelefone');
  };
  supabase.buscarDonoPorTelefone = async () => {
    throw new SupabaseUnavailableError('buscarDonoPorTelefone');
  };

  const { resposta } = await messageHandler.processarMensagem(TELEFONE, 'oi');

  assert.ok(
    resposta.includes('indisponível'),
    `esperava mensagem de indisponibilidade, veio:\n${resposta}`
  );
  assert.ok(
    !resposta.includes('não cadastrado'),
    `NUNCA pode dizer "não cadastrado" numa falha de infraestrutura:\n${resposta}`
  );
  proibirDetalheTecnico('indisponivel', resposta);
  passou++;
  console.log('   ✅ banco fora -> "serviço temporariamente indisponível"');
}

// ---------------------------------------------------------------
// 2. A falha NÃO pode ficar cacheada na sessão
// ---------------------------------------------------------------
// Se a sessão tivesse sido gravada como 'nao_cadastrado', o engenheiro
// continuaria recebendo a mensagem errada por até 15 minutos após o banco
// voltar. Aqui o banco "volta" e ele deve ser reconhecido na mensagem seguinte.
{
  supabase.buscarEngenheiroPorTelefone = async () => ({ eng_id: 'e1', nome: 'Maria' });
  supabase.buscarDonoPorTelefone = async () => null;

  const { resposta } = await messageHandler.processarMensagem(TELEFONE, 'oi');

  assert.ok(
    !resposta.includes('indisponível') && !resposta.includes('não cadastrado'),
    `após o banco voltar, o engenheiro deveria ser reconhecido:\n${resposta}`
  );
  passou++;
  console.log('   ✅ falha não fica cacheada na sessão');
}

// ---------------------------------------------------------------
// 3. Consulta OK + telefone inexistente -> "não cadastrado" (preservado)
// ---------------------------------------------------------------
{
  supabase.buscarEngenheiroPorTelefone = async () => null;
  supabase.buscarDonoPorTelefone = async () => null;

  const outroNumero = '+5583988887777';
  const { resposta } = await messageHandler.processarMensagem(outroNumero, 'oi');

  assert.ok(
    resposta.includes('não cadastrado'),
    `telefone realmente inexistente ainda deve receber "não cadastrado":\n${resposta}`
  );
  passou++;
  console.log('   ✅ consulta OK + inexistente -> "número não cadastrado"');
}

console.log(`\n✅ ${passou} verificações passaram\n`);

// O MessageHandler cria um setInterval de limpeza de sessões.
process.exit(0);
