import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AuthContext, type AuthContextValue } from '../contexts/AuthContext'
import { CartContext, type CartContextValue } from '../contexts/CartContext'
import { Sidebar } from '../components/layout/Sidebar'
import { ProductCard } from '../components/products/ProductCard'
import { ProductsPage } from '../pages/ProductsPage'
import { useDebounce } from '../hooks/useDebounce'
import type { Product } from '../types'

// ── Service mocks ───────────────────────────────────────────────────────────

const mockGetCategories = vi.hoisted(() => vi.fn())
const mockGetProducts = vi.hoisted(() => vi.fn())

vi.mock('../services/categories.service', () => ({
  getCategories: mockGetCategories,
}))

vi.mock('../services/products.service', () => ({
  getProducts: mockGetProducts,
}))

// ── Shared fixtures ─────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'cat-1', name: 'Electrónica' },
  { id: 'cat-2', name: 'Ropa' },
]

const PRODUCTS: Product[] = [
  {
    id: 'p-1',
    name: 'Laptop Pro',
    description: null,
    price: 999.99,
    stock: 5,
    categoryId: 1,
    category: { id: 1, name: 'Electrónica' },
    createdAt: '2024-01-01',
  },
  {
    id: 'p-2',
    name: 'Camiseta Básica',
    description: null,
    price: 29.99,
    stock: 0,
    categoryId: 2,
    category: { id: 2, name: 'Ropa' },
    createdAt: '2024-01-02',
  },
]

function makePaginatedResponse(
  data: Product[],
  total = data.length,
  page = 1,
) {
  return { data: { data, meta: { total, page, limit: 12, totalPages: Math.ceil(total / 12) } } }
}

// ── Shared auth context stub ─────────────────────────────────────────────────

const noUser: AuthContextValue = {
  user: null,
  loading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}

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

function renderInRouter(ui: React.ReactElement, initialPath = '/products') {
  return render(
    <AuthContext.Provider value={noUser}>
      <CartContext.Provider value={stubCart}>
        <MemoryRouter initialEntries={[initialPath]}>
          {ui}
        </MemoryRouter>
      </CartContext.Provider>
    </AuthContext.Provider>,
  )
}

// ── 1. useDebounce ──────────────────────────────────────────────────────────

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300))
    expect(result.current).toBe('hello')
  })

  it('delays updates by the specified time and only applies the last value', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } },
    )

    rerender({ value: 'ab' })
    rerender({ value: 'abc' })

    expect(result.current).toBe('a') // not yet updated

    act(() => vi.advanceTimersByTime(350))

    expect(result.current).toBe('abc') // latest value applied once
  })
})

// ── 2. Sidebar ──────────────────────────────────────────────────────────────

describe('Sidebar', () => {
  beforeEach(() => {
    mockGetCategories.mockReset()
  })

  it('shows loading text while categories are being fetched', () => {
    mockGetCategories.mockReturnValue(new Promise(() => {})) // never resolves
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    )
    expect(screen.getByText('Cargando…')).toBeInTheDocument()
  })

  it('renders a link for every category returned by the API', async () => {
    mockGetCategories.mockResolvedValueOnce({ data: CATEGORIES })
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Electrónica')).toBeInTheDocument()
    expect(screen.getByText('Ropa')).toBeInTheDocument()
    expect(screen.getByText('Todos')).toBeInTheDocument()
  })

  it('shows error message when API call fails', async () => {
    mockGetCategories.mockRejectedValueOnce(new Error('Network error'))
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    )
    expect(await screen.findByText(/no se pudieron cargar/i)).toBeInTheDocument()
  })

  it('marks active category based on URL search params', async () => {
    mockGetCategories.mockResolvedValueOnce({ data: CATEGORIES })
    render(
      <MemoryRouter initialEntries={['/products?categoryId=cat-1']}>
        <Routes>
          <Route path="/products" element={<Sidebar />} />
        </Routes>
      </MemoryRouter>,
    )

    const electronicaLink = await screen.findByRole('link', { name: 'Electrónica' })
    const ropaLink = screen.getByRole('link', { name: 'Ropa' })
    const todosLink = screen.getByRole('link', { name: 'Todos' })

    expect(electronicaLink).toHaveClass('active')
    expect(ropaLink).not.toHaveClass('active')
    expect(todosLink).not.toHaveClass('active')
  })

  it('marks "Todos" active when no categoryId in URL', async () => {
    mockGetCategories.mockResolvedValueOnce({ data: CATEGORIES })
    render(
      <MemoryRouter initialEntries={['/products']}>
        <Routes>
          <Route path="/products" element={<Sidebar />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByText('Electrónica')
    expect(screen.getByRole('link', { name: 'Todos' })).toHaveClass('active')
    expect(screen.getByRole('link', { name: 'Electrónica' })).not.toHaveClass('active')
  })
})

// ── 3. ProductCard ──────────────────────────────────────────────────────────

describe('ProductCard', () => {
  const inStock = PRODUCTS[0]   // Laptop Pro, stock=5
  const outOfStock = PRODUCTS[1] // Camiseta, stock=0

  it('renders product name and formatted price', () => {
    render(<ProductCard product={inStock} />)
    expect(screen.getByText('Laptop Pro')).toBeInTheDocument()
    expect(screen.getByText('$999.99')).toBeInTheDocument()
  })

  it('shows the category name', () => {
    render(<ProductCard product={inStock} />)
    expect(screen.getByText('Electrónica')).toBeInTheDocument()
  })

  it('shows available stock count when in stock', () => {
    render(<ProductCard product={inStock} />)
    expect(screen.getByText('5 disponibles')).toBeInTheDocument()
  })

  it('shows "Sin stock" badge and disables add button when stock is 0', () => {
    render(<ProductCard product={outOfStock} onAddToCart={vi.fn()} />)
    expect(screen.getByText('Sin stock')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /agregar/i })).toBeDisabled()
  })

  it('calls onAddToCart with the product when button is clicked', async () => {
    const user = userEvent.setup()
    const onAddToCart = vi.fn()
    render(<ProductCard product={inStock} onAddToCart={onAddToCart} />)
    await user.click(screen.getByRole('button', { name: /agregar/i }))
    expect(onAddToCart).toHaveBeenCalledWith(inStock)
  })

  it('does not render add button when onAddToCart is not provided', () => {
    render(<ProductCard product={inStock} />)
    expect(screen.queryByRole('button', { name: /agregar/i })).not.toBeInTheDocument()
  })
})

// ── 4. ProductsPage ─────────────────────────────────────────────────────────

describe('ProductsPage', () => {
  beforeEach(() => {
    mockGetProducts.mockReset()
    mockGetCategories.mockResolvedValue({ data: [] }) // sidebar: no categories
  })

  // Safety net: if any test uses fake timers and fails before restoring, clean up
  afterEach(() => vi.useRealTimers())

  it('renders products returned by the API', async () => {
    mockGetProducts.mockResolvedValueOnce(makePaginatedResponse(PRODUCTS, 2))
    renderInRouter(<ProductsPage />)

    expect(await screen.findByText('Laptop Pro')).toBeInTheDocument()
    expect(screen.getByText('Camiseta Básica')).toBeInTheDocument()
  })

  it('shows empty state when API returns no products', async () => {
    mockGetProducts.mockResolvedValueOnce(makePaginatedResponse([], 0))
    renderInRouter(<ProductsPage />)

    expect(await screen.findByText(/no se encontraron productos/i)).toBeInTheDocument()
  })

  it('shows skeleton placeholders while loading', () => {
    mockGetProducts.mockReturnValue(new Promise(() => {})) // never resolves
    renderInRouter(<ProductsPage />)

    expect(screen.getByLabelText(/cargando productos/i)).toBeInTheDocument()
  })

  it('shows error message when API call fails', async () => {
    mockGetProducts.mockRejectedValueOnce(new Error('Server error'))
    renderInRouter(<ProductsPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/error al cargar/i)
  })

  it('calls getProducts with sortBy=price and sortOrder=asc when sort changes', async () => {
    const user = userEvent.setup()
    mockGetProducts.mockResolvedValue(makePaginatedResponse(PRODUCTS))

    renderInRouter(<ProductsPage />)
    await screen.findByText('Laptop Pro')

    await user.selectOptions(screen.getByLabelText(/ordenar por/i), 'price-asc')

    await waitFor(() => {
      const calls = mockGetProducts.mock.calls
      const lastCall = calls[calls.length - 1][0]
      expect(lastCall).toMatchObject({ sortBy: 'price', sortOrder: 'asc' })
    })
  })

  it('advances to page 2 when next page button is clicked', async () => {
    const user = userEvent.setup()
    // Return 25 products total so pagination shows
    mockGetProducts.mockResolvedValue(makePaginatedResponse(PRODUCTS, 25))

    renderInRouter(<ProductsPage />)
    await screen.findByText('Laptop Pro')

    expect(screen.getByText(/página/i)).toBeInTheDocument()

    await user.click(screen.getByLabelText('Página siguiente'))

    await waitFor(() => {
      const calls = mockGetProducts.mock.calls
      const lastCall = calls[calls.length - 1][0]
      expect(lastCall).toMatchObject({ page: 2 })
    })
  })

  it('disables previous button on first page', async () => {
    mockGetProducts.mockResolvedValue(makePaginatedResponse(PRODUCTS, 25))

    renderInRouter(<ProductsPage />)
    await screen.findByText('Laptop Pro')

    expect(screen.getByLabelText('Página anterior')).toBeDisabled()
    expect(screen.getByLabelText('Página siguiente')).not.toBeDisabled()
  })

  it('calls getProducts with search term after typing', async () => {
    const user = userEvent.setup()
    mockGetProducts.mockResolvedValue(makePaginatedResponse(PRODUCTS))

    renderInRouter(<ProductsPage />)
    await screen.findByText('Laptop Pro') // wait for initial render

    await user.type(screen.getByLabelText(/buscar productos/i), 'Lap')

    // waitFor polls until the 300ms debounce fires and the hook re-fetches
    await waitFor(
      () => {
        const lastCall = mockGetProducts.mock.calls.at(-1)?.[0]
        expect(lastCall).toMatchObject({ search: 'Lap' })
      },
      { timeout: 2000 },
    )
  })

  it('filters by categoryId when URL has categoryId param', async () => {
    mockGetProducts.mockResolvedValue(makePaginatedResponse([PRODUCTS[0]]))

    renderInRouter(<ProductsPage />, '/products?categoryId=1')
    await screen.findByText('Laptop Pro')

    expect(mockGetProducts).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 1 }),
    )
  })

  it('shows filter chip and clears it when × is clicked', async () => {
    const user = userEvent.setup()
    mockGetProducts.mockResolvedValue(makePaginatedResponse(PRODUCTS))

    renderInRouter(<ProductsPage />, '/products?categoryId=cat-1')
    await screen.findByText('Laptop Pro')

    expect(screen.getByText(/filtrando por categoría/i)).toBeInTheDocument()

    await user.click(screen.getByLabelText('Quitar filtro de categoría'))

    await waitFor(() => {
      const calls = mockGetProducts.mock.calls
      const lastCall = calls[calls.length - 1][0]
      expect(lastCall).not.toHaveProperty('categoryId')
    })
  })
})
