import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function PrivateRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="route-loading" aria-label="Cargando">Cargando…</div>
  }

  if (!user) {
    // Preserve where the user was trying to go so LoginPage can redirect back
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
