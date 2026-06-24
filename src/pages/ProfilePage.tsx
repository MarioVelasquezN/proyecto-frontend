import { Link, useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { useAuth } from '../hooks/useAuth'

export function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <Layout hideSidebar>
      <div className="page-profile">
        <h1>Mi perfil</h1>

        <div className="profile-card">
          <div className="profile-row">
            <span className="profile-label">Email</span>
            <span>{user.email}</span>
          </div>
          <div className="profile-row">
            <span className="profile-label">Rol</span>
            <span className={`role-badge role-badge--${user.role}`}>
              {user.role === 'admin' ? 'Administrador' : 'Usuario'}
            </span>
          </div>
        </div>

        {user.role === 'admin' && (
          <section className="profile-section profile-section--admin">
            <h2>Panel de administración</h2>
            <p>Tienes acceso completo para gestionar productos, categorías y órdenes.</p>
            <Link to="/admin" className="btn-primary">Ir al panel</Link>
          </section>
        )}

        {user.role === 'user' && (
          <section className="profile-section">
            <h2>Mis pedidos</h2>
            <p className="text-muted">Aún no tienes pedidos realizados.</p>
          </section>
        )}

        <button className="btn-danger" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </Layout>
  )
}
