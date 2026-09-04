// =====================================================
// Criação de cliente Supabase com credencial validada
// =====================================================
// Usado pelos serviços de sincronização de planilhas, que antes faziam
//   const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
//   createClient(url, key)
// sem trim e sem checagem nenhuma.
// =====================================================

import { createClient } from '@supabase/supabase-js';
import { InvalidCredentialError, readCredential } from '../../logic/security/envSecret.ts';
import { redactSecrets } from '../../logic/security/redactSecrets.ts';

/**
 * Cria um cliente Supabase apenas se URL e chave forem válidas.
 *
 * Devolve `null` — em vez de lançar — porque estes serviços são instanciados
 * no momento do import (`export const engineerSyncService = new ...`), e uma
 * exceção aí derrubaria o processo inteiro no boot.
 *
 * A mensagem de erro nunca inclui o valor da credencial.
 */
export function criarClienteSupabaseValidado(scope: string): any {
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
