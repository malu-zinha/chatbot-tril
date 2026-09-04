import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readCredential } from '@/lib/secrets'

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
  // readCredential faz trim e rejeita \r, \n e outros caracteres que tornam o
  // valor inválido como header HTTP. Sem isso, uma chave com quebra de linha
  // só falha lá dentro do fetch — e a exceção carrega a chave na mensagem.
  const url = readCredential('NEXT_PUBLIC_SUPABASE_URL')
  const serviceKey = readCredential('SUPABASE_SERVICE_ROLE_KEY')

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

/** true quando a service key está configurada e é válida como header. */
export function isAdminConfigured(): boolean {
  try {
    return Boolean(readCredential('SUPABASE_SERVICE_ROLE_KEY'))
  } catch {
    // Chave presente mas malformada: tratar como não configurada, para a rota
    // responder erro genérico em vez de explodir dentro do fetch.
    return false
  }
}
