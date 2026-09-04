// =====================================================
// Criação de cliente Supabase com credencial validada
// =====================================================
// Usado pelos serviços de sincronização de planilhas, que antes faziam
//   const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
//   createClient(url, key)
// sem trim e sem checagem nenhuma.
// =====================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { InvalidCredentialError, readCredential } from '../../logic/security/envSecret.ts';
import { redactSecrets } from '../../logic/security/redactSecrets.ts';

/**
 * Tipo do cliente devolvido. O que importa aqui é a nulidade ficar explícita
 * na assinatura; o schema fica em `any` porque o projeto não gera os tipos do
 * banco — com `ReturnType<typeof createClient>` as tabelas resolvem para
 * `never` e toda query existente quebra na compilação.
 */
export type ClienteSupabaseValidado = SupabaseClient<any, any, any>;

/**
 * Lançado quando um serviço tenta usar o cliente que não pôde ser criado.
 * Existe para que a falha apareça como "credenciais não configuradas" e não
 * como um `Cannot read properties of null` sem contexto.
 */
export class ClienteSupabaseIndisponivelError extends Error {
  constructor(scope: string) {
    super(
      `[${scope}] cliente Supabase não foi criado — verifique SUPABASE_URL e ` +
        `SUPABASE_SERVICE_ROLE_KEY. Sincronização abortada.`
    );
    this.name = 'ClienteSupabaseIndisponivelError';
  }
}

/**
 * Cria um cliente Supabase apenas se URL e chave forem válidas.
 *
 * Devolve `null` — em vez de lançar — porque estes serviços são instanciados
 * no momento do import (`export const engineerSyncService = new ...`), e uma
 * exceção aí derrubaria o processo inteiro no boot. Quem consome deve passar
 * pelo `exigirClienteSupabase` antes de usar.
 *
 * A mensagem de erro nunca inclui o valor da credencial.
 */
export function criarClienteSupabaseValidado(scope: string): ClienteSupabaseValidado | null {
  let url = '';
  let key = '';

  try {
    url = readCredential('SUPABASE_URL');
    key = readCredential('SUPABASE_SERVICE_ROLE_KEY');
  } catch (error) {
    console.error(
      error instanceof InvalidCredentialError
        ? `❌ [${scope}] ${error.message}`
        : `❌ [${scope}] ${redactSecrets(error)}`
    );
    return null;
  }

  if (!url || !key) {
    console.error(
      `❌ [${scope}] SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY não configurados — cliente não criado.`
    );
    return null;
  }

  return createClient(url, key);
}

/**
 * Converte o `null` do boot numa falha explícita, no momento do uso.
 * Chamar isto antes de qualquer `.from(...)` evita o null deref silencioso.
 */
export function exigirClienteSupabase(
  cliente: ClienteSupabaseValidado | null,
  scope: string
): ClienteSupabaseValidado {
  if (!cliente) {
    throw new ClienteSupabaseIndisponivelError(scope);
  }
  return cliente;
}
