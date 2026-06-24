import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useCart } from '../../hooks/useCart'
import { ThemeToggle } from '../ui/ThemeToggle'

export function Navbar() {
  const { user, logout } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">🛒 E-Commerce</Link>
      </div>

      <div className="navbar-links">
        <Link to="/products">Productos</Link>

        <Link to="/cart" className="cart-icon-link" aria-label={`Carrito${itemCount > 0 ? `, ${itemCount} artículo${itemCount !== 1 ? 's' : ''}` : ''}`}>
          <span aria-hidden="true">🛒</span>
          {itemCount > 0 && (
            <span className="cart-badge" aria-hidden="true">
              {itemCount > 99 ? '99+' : itemCount}
            </span>
          )}
        </Link>

        {user ? (
          <>
            <Link to="/profile" className="navbar-user">
              {user.email}
            </Link>
            <span className={`role-badge role-badge--${user.role}`}>
              {user.role === 'admin' ? 'Admin' : 'User'}
            </span>
            {user.role === 'admin' && (
              <Link to="/admin">Panel Admin</Link>
            )}
            <button className="btn-link" onClick={handleLogout}>
              Salir
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Iniciar sesión</Link>
            <Link to="/register">Registrarse</Link>
          </>
        )}

        <ThemeToggle />
      </div>
    </nav>
  )
}
