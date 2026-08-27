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
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, status')
        .eq('user_id', user.id)
        .single()
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
