import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { useAuth } from '../hooks/useAuth'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await register(email, password, name)
      navigate('/')
    } catch {
      setError('No se pudo crear la cuenta. El email puede estar en uso.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout hideSidebar>
      <div className="page-auth">
        <h1>Crear cuenta</h1>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Nombre
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Contraseña
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Creando…' : 'Registrarse'}
          </button>
        </form>
        <p>¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
      </div>
    </Layout>
  )
}
