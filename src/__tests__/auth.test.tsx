import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AuthContext, AuthProvider, type AuthContextValue } from '../contexts/AuthContext'
import { CartContext, type CartContextValue } from '../contexts/CartContext'
import { useAuth } from '../hooks/useAuth'
import { PrivateRoute } from '../components/auth/PrivateRoute'
import { AdminRoute } from '../components/auth/AdminRoute'
import { GuestRoute } from '../components/auth/GuestRoute'
import type { User } from '../types'

// ── Module-level mocks ──────────────────────────────────────────────────────
// vi.hoisted ensures these are initialized before vi.mock's hoisted factory runs

const mockPost = vi.hoisted(() => vi.fn())
const mockGet = vi.hoisted(() => vi.fn())

vi.mock('../services/api', () => ({
  default: {
    post: mockPost,
    get: mockGet,
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}))

// ── Test helpers ────────────────────────────────────────────────────────────

const stubCart: CartContextValue = {
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

const guestAuth: AuthContextValue = {
  user: null,
  loading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}

function makeUserAuth(role: User['role'] = 'user'): AuthContextValue {
  return {
    user: { sub: '1', email: 'test@test.com', role },
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }
}

// Renders a route tree with AuthContext directly injected (no real HTTP calls)
function renderRoutes(
  authValue: AuthContextValue,
  RouteGuard: React.ComponentType,
  initialPath = '/protected',
) {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<RouteGuard />}>
            <Route path="/protected" element={<div>Contenido protegido</div>} />
          </Route>
          <Route path="/login" element={<div>Página de login</div>} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

// ── 1. Login saves tokens ───────────────────────────────────────────────────

describe('AuthContext — login', () => {
  beforeEach(() => {
    localStorage.clear()
    mockPost.mockReset()
    mockGet.mockReset()
  })

  it('saves accessToken and refreshToken in localStorage on successful login', async () => {
    mockPost.mockResolvedValueOnce({
      data: { accessToken: 'test-access-token', refreshToken: 'test-refresh-token' },
    })
    mockGet.mockResolvedValueOnce({
      data: { sub: '1', email: 'test@test.com', role: 'user' },
    })

    let capturedLogin: AuthContextValue['login'] | undefined

    function Capture() {
      const { login } = useAuth()
      capturedLogin = login
      return null
    }

    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>,
    )

    // Wait for the initial useEffect to finish (no stored token → loading=false immediately)
    await waitFor(() => expect(capturedLogin).toBeDefined())

    await act(async () => {
      await capturedLogin!('test@test.com', 'password123')
    })

    expect(localStorage.getItem('accessToken')).toBe('test-access-token')
    expect(localStorage.getItem('refreshToken')).toBe('test-refresh-token')
  })

  it('sets user in context after successful login', async () => {
    mockPost.mockResolvedValueOnce({
      data: { accessToken: 'at', refreshToken: 'rt' },
    })
    mockGet.mockResolvedValueOnce({
      data: { sub: '42', email: 'admin@shop.com', role: 'admin' },
    })

    let capturedAuth: ReturnType<typeof useAuth> | undefined

    function Capture() {
      capturedAuth = useAuth()
      return null
    }

    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>,
    )

    await waitFor(() => expect(capturedAuth?.loading).toBe(false))

    await act(async () => {
      await capturedAuth!.login('admin@shop.com', 'pass')
    })

    expect(capturedAuth!.user).toMatchObject({ email: 'admin@shop.com', role: 'admin' })
  })

  it('does NOT save tokens when login API call fails', async () => {
    mockPost.mockRejectedValueOnce(new Error('Unauthorized'))

    let capturedLogin: AuthContextValue['login'] | undefined

    function Capture() {
      const { login } = useAuth()
      capturedLogin = login
      return null
    }

    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>,
    )

    await waitFor(() => expect(capturedLogin).toBeDefined())

    await expect(
      act(async () => { await capturedLogin!('wrong@test.com', 'badpass') }),
    ).rejects.toThrow()

    expect(localStorage.getItem('accessToken')).toBeNull()
  })
})

// ── 2. Register saves tokens ────────────────────────────────────────────────

describe('AuthContext — register', () => {
  beforeEach(() => {
    localStorage.clear()
    mockPost.mockReset()
    mockGet.mockReset()
  })

  it('saves tokens after successful registration', async () => {
    mockPost.mockResolvedValueOnce({
      data: { accessToken: 'reg-access', refreshToken: 'reg-refresh' },
    })
    mockGet.mockResolvedValueOnce({
      data: { sub: '99', email: 'new@test.com', role: 'user' },
    })

    let capturedAuth: ReturnType<typeof useAuth> | undefined

    function Capture() {
      capturedAuth = useAuth()
      return null
    }

    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>,
    )

    await waitFor(() => expect(capturedAuth?.loading).toBe(false))

    await act(async () => {
      await capturedAuth!.register('new@test.com', 'password123', 'Nuevo Usuario')
    })

    expect(localStorage.getItem('accessToken')).toBe('reg-access')
    expect(localStorage.getItem('refreshToken')).toBe('reg-refresh')
  })
})

// ── 3. Logout clears tokens ─────────────────────────────────────────────────

describe('AuthContext — logout', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it('removes accessToken and refreshToken from localStorage', async () => {
    localStorage.setItem('accessToken', 'stored-access')
    localStorage.setItem('refreshToken', 'stored-refresh')

    // AuthProvider will call me() on mount because there's a stored token
    mockGet.mockResolvedValueOnce({
      data: { sub: '1', email: 'test@test.com', role: 'user' },
    })

    let capturedAuth: ReturnType<typeof useAuth> | undefined

    function Capture() {
      capturedAuth = useAuth()
      return null
    }

    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>,
    )

    await waitFor(() => expect(capturedAuth?.user).not.toBeNull())

    act(() => capturedAuth!.logout())

    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
  })

  it('clears the user from context after logout', async () => {
    localStorage.setItem('accessToken', 'stored-access')
    localStorage.setItem('refreshToken', 'stored-refresh')

    mockGet.mockResolvedValueOnce({
      data: { sub: '1', email: 'test@test.com', role: 'user' },
    })

    let capturedAuth: ReturnType<typeof useAuth> | undefined

    function Capture() {
      capturedAuth = useAuth()
      return null
    }

    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>,
    )

    await waitFor(() => expect(capturedAuth?.user).not.toBeNull())

    act(() => capturedAuth!.logout())

    expect(capturedAuth!.user).toBeNull()
  })
})

// ── 4. PrivateRoute ─────────────────────────────────────────────────────────

describe('PrivateRoute', () => {
  it('redirects unauthenticated user to /login', () => {
    renderRoutes(guestAuth, PrivateRoute)

    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
    expect(screen.getByText('Página de login')).toBeInTheDocument()
  })

  it('renders protected content for authenticated user', () => {
    renderRoutes(makeUserAuth('user'), PrivateRoute)

    expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
    expect(screen.queryByText('Página de login')).not.toBeInTheDocument()
  })

  it('shows loading indicator while auth state is resolving', () => {
    const loadingAuth: AuthContextValue = { ...guestAuth, loading: true }
    renderRoutes(loadingAuth, PrivateRoute)

    expect(screen.getByLabelText('Cargando')).toBeInTheDocument()
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })
})

// ── 5. AdminRoute ───────────────────────────────────────────────────────────

describe('AdminRoute', () => {
  it('renders content for admin user', () => {
    renderRoutes(makeUserAuth('admin'), AdminRoute)
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
  })

  it('redirects non-admin user to home', () => {
    renderRoutes(makeUserAuth('user'), AdminRoute)
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
  })

  it('redirects unauthenticated user to login', () => {
    renderRoutes(guestAuth, AdminRoute)
    expect(screen.getByText('Página de login')).toBeInTheDocument()
  })
})

// ── 6. GuestRoute ───────────────────────────────────────────────────────────

describe('GuestRoute', () => {
  function renderGuestRoutes(authValue: AuthContextValue, initialPath = '/login') {
    return render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<div>Página de login</div>} />
            </Route>
            <Route path="/" element={<div>Home</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )
  }

  it('renders login page for unauthenticated user', () => {
    renderGuestRoutes(guestAuth)
    expect(screen.getByText('Página de login')).toBeInTheDocument()
  })

  it('redirects authenticated user away from login to home', () => {
    renderGuestRoutes(makeUserAuth('user'))
    expect(screen.queryByText('Página de login')).not.toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
  })
})

// ── 7. LoginPage integration ─────────────────────────────────────────────────

describe('LoginPage — form interaction', () => {
  beforeEach(() => {
    localStorage.clear()
    mockPost.mockReset()
    mockGet.mockReset()
  })

  it('shows error message on failed login', async () => {
    const user = userEvent.setup()
    mockPost.mockRejectedValueOnce({ response: { status: 401 } })

    // Import page dynamically so vi.mock is already registered
    const { LoginPage } = await import('../pages/LoginPage')

    render(
      <AuthContext.Provider value={{ ...guestAuth, login: async () => { throw new Error('bad') } }}>
        <CartContext.Provider value={stubCart}>
          <MemoryRouter>
            <LoginPage />
          </MemoryRouter>
        </CartContext.Provider>
      </AuthContext.Provider>,
    )

    await user.type(screen.getByLabelText('Email'), 'bad@email.com')
    await user.type(screen.getByLabelText('Contraseña'), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/credenciales inválidas/i)
  })
})
