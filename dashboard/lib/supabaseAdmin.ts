import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente administrativo do Supabase — usa a SERVICE_ROLE_KEY e por isso
 * IGNORA a RLS por completo. NUNCA importe este arquivo em código de cliente
 * (componentes 'use client'): a chave é secreta e fica só no servidor.
 *
 * Só pode ser usado dentro de Route Handlers (app/api/**) ou Server
 * Components. A variável NÃO tem prefixo NEXT_PUBLIC justamente para o Next
 * não embutir no bundle do browser.
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ''

  if (!url || !serviceKey) {
    throw new Error(
      'Configuração ausente: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no servidor.'
    )
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/** true quando a service key está configurada no ambiente. */
export function isAdminConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
}
