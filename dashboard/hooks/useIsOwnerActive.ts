'use client'

import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export function useIsOwnerActive(): boolean {
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let cancelled = false
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // maybeSingle() + checagem explícita de error: com single(), "0 linhas"
      // e "consulta falhou" chegavam do mesmo jeito, e o error era ignorado.
      // Aqui a falha só esconde os controles de owner (fail closed, sem
      // mensagem técnica na tela) — a segurança real está nas rotas de API.
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role, status')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('[useIsOwnerActive] nao foi possivel verificar o perfil')
        return
      }

      if (!cancelled && profile?.role === 'owner' && profile?.status === 'active') {
        setIsOwner(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return isOwner
}
