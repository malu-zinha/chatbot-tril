import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Cliente do Supabase baseado nos cookies da requisição (sessão do usuário
 * logado). Usa a ANON key + token do usuário -> respeita a RLS. Serve para
 * Server Components e Route Handlers identificarem QUEM está chamando.
 */
export function createServerSupabase(): SupabaseClient {
  const cookieStore = cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Components não podem setar cookies — ignorado de propósito.
          // O middleware já cuida de renovar a sessão nas navegações.
        }
      },
    },
  })
}

/**
 * Retorna o usuário autenticado SE ele for o owner ativo da plataforma;
 * caso contrário, null. É a guarda de segurança das rotas de admin.
 */
export async function getOwnerOrNull(): Promise<User | null> {
  const supabase = createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('role, status')
    .eq('user_id', user.id)
    .single()

  if (error || !profile) return null
  if (profile.role !== 'owner' || profile.status !== 'active') return null

  return user
}
