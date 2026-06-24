import { Layout } from '../components/layout/Layout'
import { useHealthCheck } from '../hooks/useHealthCheck'
import { useAuth } from '../hooks/useAuth'

export function HomePage() {
  const health = useHealthCheck()
  const { user } = useAuth()

  return (
    <Layout>
      <div className="page-home">
        <h1>Bienvenido{user ? `, ${user.email}` : ''}</h1>
        <p>Explora nuestro catálogo de productos usando las categorías del panel lateral.</p>
        <div className={`health-badge health-badge--${health}`}>
          Backend: {health === 'ok' ? '✅ conectado' : health === 'loading' ? '⏳ verificando…' : '❌ sin conexión'}
        </div>
      </div>
    </Layout>
  )
}
