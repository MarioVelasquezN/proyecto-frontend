import { useEffect, useState } from 'react'
import { checkHealth } from '../services/health.service'

type Status = 'idle' | 'loading' | 'ok' | 'error'

export function useHealthCheck() {
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    checkHealth()
      .then(() => { if (!cancelled) setStatus('ok') })
      .catch(() => { if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [])

  return status
}
