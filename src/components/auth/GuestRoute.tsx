import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function GuestRoute() {
  const { user, loading } = useAuth()

  if (loading) return <div className="route-loading" aria-label="Cargando">Cargando…</div>

  if (user) return <Navigate to="/" replace />

  return <Outlet />
}
