import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function AdminRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="route-loading" aria-label="Cargando">Cargando…</div>
  }

  if (!user) return <Navigate to="/login" replace />

  // Authenticated but not admin → silent redirect to home, not a 403 page
  if (user.role !== 'admin') return <Navigate to="/" replace />

  return <Outlet />
}
