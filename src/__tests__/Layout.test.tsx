import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { Layout } from '../components/layout/Layout'
import { AuthContext } from '../contexts/AuthContext'
import { CartContext, type CartContextValue } from '../contexts/CartContext'
import { ThemeContext } from '../contexts/ThemeContext'

// Stub out the categories hook so Sidebar doesn't need a real API
vi.mock('../hooks/useCategories', () => ({
  useCategories: () => ({ categories: [], loading: false, error: null }),
}))

const authValue = {
  user: null,
  loading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}

const themeValue = { theme: 'light' as const, toggle: vi.fn() }

const cartValue: CartContextValue = {
  cart: null,
  loading: false,
  error: null,
  itemCount: 0,
  addItem: vi.fn(),
  removeItem: vi.fn(),
  updateQuantity: vi.fn(),
  refreshCart: vi.fn(),
  clearCartLocal: vi.fn(),
}

function renderLayout(hideSidebar = false) {
  return render(
    <ThemeContext.Provider value={themeValue}>
      <AuthContext.Provider value={authValue}>
        <CartContext.Provider value={cartValue}>
          <MemoryRouter>
            <Layout hideSidebar={hideSidebar}>
              <p>contenido de prueba</p>
            </Layout>
          </MemoryRouter>
        </CartContext.Provider>
      </AuthContext.Provider>
    </ThemeContext.Provider>,
  )
}

describe('Layout', () => {
  it('renders navbar, main content and footer without errors', () => {
    renderLayout()

    expect(screen.getByRole('link', { name: /E-Commerce/i })).toBeInTheDocument()
    expect(screen.getByText('contenido de prueba')).toBeInTheDocument()
    expect(screen.getByText(/E-Commerce — NestJS \+ React/i)).toBeInTheDocument()
  })

  it('renders sidebar with categories heading when hideSidebar is false', () => {
    renderLayout(false)
    expect(screen.getByText('Categorías')).toBeInTheDocument()
  })

  it('hides sidebar when hideSidebar is true', () => {
    renderLayout(true)
    expect(screen.queryByText('Categorías')).not.toBeInTheDocument()
  })

  it('renders login and register links for unauthenticated user', () => {
    renderLayout()
    expect(screen.getByRole('link', { name: /iniciar sesión/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /registrarse/i })).toBeInTheDocument()
  })
})
