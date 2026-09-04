import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { getOwnerOrError } from '@/lib/supabaseServer'
import { isAdminConfigured } from '@/lib/supabaseAdmin'
import { MENSAGEM_BANCO_INDISPONIVEL } from '@/lib/apiError'

export type OwnerGuard = { ok: true; owner: User } | { ok: false; response: NextResponse }

/**
 * Guarda comum das rotas /api/admin/*: exige owner ativo e service key válida.
 *
 * Uso:
 *   const guard = await guardOwnerRoute()
 *   if (!guard.ok) return guard.response
 *
 * Existe para que as 9 rotas não repitam — e não divirjam — a mesma checagem.
 * O ponto novo é o 503: antes, uma falha de rede na verificação de owner virava
 * 403 "Acesso negado.", acusando o owner legítimo de não ter permissão.
 */
export async function guardOwnerRoute(): Promise<OwnerGuard> {
  const owner = await getOwnerOrError()

  if (!owner.ok) {
    if (owner.reason === 'unavailable') {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Não foi possível verificar sua sessão. Tente novamente.' },
          { status: 503 }
        ),
      }
    }
    return {
      ok: false,
      response: NextResponse.json({ error: 'Acesso negado.' }, { status: 403 }),
    }
  }

  if (!isAdminConfigured()) {
    // Mensagem genérica: o nome da variável de ambiente não vai para o browser.
    return {
      ok: false,
      response: NextResponse.json({ error: MENSAGEM_BANCO_INDISPONIVEL }, { status: 500 }),
    }
  }

  return { ok: true, owner: owner.user }
}
