import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAdmin } from './context'

export function useSessionCounts() {
  const { version } = useAdmin()
  const [counts, setCounts] = useState({})
  useEffect(() => {
    supabase.rpc('client_session_counts').then(({ data }) => {
      if (data) setCounts(Object.fromEntries(data.map((r) => [r.client_id, r])))
    })
  }, [version])
  return counts
}
