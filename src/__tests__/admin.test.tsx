import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach, afterEach, type MockInstance } from 'vitest'
import { AuthContext, type AuthContextValue } from '../contexts/AuthContext'
import { CartContext, type CartContextValue } from '../contexts/CartContext'
import { AdminPage } from '../pages/AdminPage'
import { DashboardTab } from '../components/admin/DashboardTab'
import { ProductsTab } from '../components/admin/ProductsTab'
import { CategoriesTab } from '../components/admin/CategoriesTab'
import { OrdersTab } from '../components/admin/OrdersTab'
import type { Order, Product, Category } from '../types'

// ── Service mocks ─────────────────────────────────────────────────────────────

const mockGetProducts    = vi.hoisted(() => vi.fn())
const mockCreateProduct  = vi.hoisted(() => vi.fn())
const mockUpdateProduct  = vi.hoisted(() => vi.fn())
const mockDeleteProduct  = vi.hoisted(() => vi.fn())
const mockGetCategories  = vi.hoisted(() => vi.fn())
const mockCreateCategory = vi.hoisted(() => vi.fn())
const mockGetOrders      = vi.hoisted(() => vi.fn())
const mockUpdateOrderStatus = vi.hoisted(() => vi.fn())

vi.mock('../services/products.service', () => ({
  getProducts:    mockGetProducts,
  createProduct:  mockCreateProduct,
  updateProduct:  mockUpdateProduct,
  deleteProduct:  mockDeleteProduct,
}))

vi.mock('../services/categories.service', () => ({
  getCategories:  mockGetCategories,
  createCategory: mockCreateCategory,
}))

vi.mock('../services/orders.service', () => ({
  getOrders:           mockGetOrders,
  updateOrderStatus:   mockUpdateOrderStatus,
}))

// Sidebar uses useCategories hook — stub to keep layout tests clean
vi.mock('../hooks/useCategories', () => ({
  useCategories: () => ({ categories: [], loading: false, error: null }),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  { id: 1, name: 'Electrónica' },
  { id: 2, name: 'Ropa' },
]

const PRODUCT: Product = {
  id: 'p-1',
  name: 'Laptop Pro',
  description: null,
  price: 999.99,
  stock: 5,
  categoryId: 1,
  category: { id: 1, name: 'Electrónica' },
  createdAt: '2024-01-01T00:00:00Z',
}

const ORDER: Order = {
  id: 'order-abc123def456',
  status: 'pending',
  total: 999.99,
  createdAt: '2024-06-01T12:00:00Z',
}

const PAID_ORDER: Order = {
  id: 'order-xyz987uv0001',
  status: 'paid',
  total: 49.99,
  createdAt: '2024-06-02T09:00:00Z',
}

function makePaginated(data: Product[], total = data.length) {
  return { data: { data, meta: { total, page: 1, limit: 100, totalPages: Math.ceil(total / 100) } } }
}

// ── Render helpers ────────────────────────────────────────────────────────────

const adminAuth: AuthContextValue = {
  user: { sub: 'admin-1', email: 'admin@shop.com', role: 'admin' },
  loading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}

const stubCart: CartContextValue = {
  cart: null, loading: false, error: null, itemCount: 0,
  addItem: vi.fn(), removeItem: vi.fn(), updateQuantity: vi.fn(),
  refreshCart: vi.fn(), clearCartLocal: vi.fn(),
}

function renderAdmin(ui: React.ReactElement) {
  return render(
    <AuthContext.Provider value={adminAuth}>
      <CartContext.Provider value={stubCart}>
        <MemoryRouter>{ui}</MemoryRouter>
      </CartContext.Provider>
    </AuthContext.Provider>,
  )
}

// ── 1. DashboardTab ───────────────────────────────────────────────────────────

describe('DashboardTab', () => {
  beforeEach(() => {
    mockGetProducts.mockReset()
    mockGetOrders.mockReset()
  })

  it('shows total products and pending orders count from API', async () => {
    mockGetProducts.mockResolvedValueOnce(makePaginated([PRODUCT], 42))
    mockGetOrders.mockResolvedValueOnce({ data: [ORDER, PAID_ORDER] })

    renderAdmin(<DashboardTab />)

    await waitFor(() => {
      expect(screen.getByTestId('metric-products')).toHaveTextContent('42')
      expect(screen.getByTestId('metric-pending')).toHaveTextContent('1')
      expect(screen.getByTestId('metric-orders')).toHaveTextContent('2')
    })
  })

  it('shows total stock summed from loaded products', async () => {
    const products = [PRODUCT, { ...PRODUCT, id: 'p-2', stock: 10 }]
    mockGetProducts.mockResolvedValueOnce(makePaginated(products, 2))
    mockGetOrders.mockResolvedValueOnce({ data: [] })

    renderAdmin(<DashboardTab />)

    await waitFor(() => {
      expect(screen.getByTestId('metric-stock')).toHaveTextContent('15') // 5 + 10
    })
  })

  it('shows loading placeholders while data is being fetched', () => {
    mockGetProducts.mockReturnValue(new Promise(() => {}))
    mockGetOrders.mockReturnValue(new Promise(() => {}))

    renderAdmin(<DashboardTab />)

    expect(screen.getByTestId('metric-products')).toHaveTextContent('…')
  })
})

// ── 2. ProductsTab — list ─────────────────────────────────────────────────────

describe('ProductsTab — product list', () => {
  beforeEach(() => {
    mockGetProducts.mockReset()
    mockGetCategories.mockReset()
    mockGetCategories.mockResolvedValue({ data: CATEGORIES })
  })

  it('renders all products in the table', async () => {
    const p2: Product = { ...PRODUCT, id: 'p-2', name: 'Mouse', price: 29.99, stock: 0 }
    mockGetProducts.mockResolvedValueOnce(makePaginated([PRODUCT, p2]))

    renderAdmin(<ProductsTab />)

    expect(await screen.findByText('Laptop Pro')).toBeInTheDocument()
    expect(screen.getByText('Mouse')).toBeInTheDocument()
    expect(screen.getByText('$999.99')).toBeInTheDocument()
    expect(screen.getByText('$29.99')).toBeInTheDocument()
  })

  it('shows category name in each row', async () => {
    mockGetProducts.mockResolvedValueOnce(makePaginated([PRODUCT]))

    renderAdmin(<ProductsTab />)
    await screen.findByText('Laptop Pro')

    expect(screen.getByText('Electrónica')).toBeInTheDocument()
  })

  it('shows empty state when there are no products', async () => {
    mockGetProducts.mockResolvedValueOnce(makePaginated([]))

    renderAdmin(<ProductsTab />)

    expect(await screen.findByText(/no hay productos/i)).toBeInTheDocument()
  })

  it('shows Editar and Eliminar buttons per product row', async () => {
    mockGetProducts.mockResolvedValueOnce(makePaginated([PRODUCT]))

    renderAdmin(<ProductsTab />)
    await screen.findByText('Laptop Pro')

    expect(screen.getByRole('button', { name: /editar laptop pro/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /eliminar laptop pro/i })).toBeInTheDocument()
  })
})

// ── 3. ProductsTab — create ───────────────────────────────────────────────────

describe('ProductsTab — create product', () => {
  beforeEach(() => {
    mockGetProducts.mockReset()
    mockGetCategories.mockReset()
    mockCreateProduct.mockReset()
    mockGetCategories.mockResolvedValue({ data: CATEGORIES })
  })

  it('shows ProductForm when "+ Nuevo producto" is clicked', async () => {
    const user = userEvent.setup()
    mockGetProducts.mockResolvedValue(makePaginated([]))

    renderAdmin(<ProductsTab />)
    await screen.findByRole('button', { name: /nuevo producto/i })

    await user.click(screen.getByRole('button', { name: /nuevo producto/i }))

    expect(screen.getByRole('form', { name: /nuevo producto/i })).toBeInTheDocument()
  })

  it('calls createProduct with correct values when form is submitted', async () => {
    const user = userEvent.setup()
    mockGetProducts.mockResolvedValue(makePaginated([]))
    mockCreateProduct.mockResolvedValueOnce({ data: PRODUCT })

    renderAdmin(<ProductsTab />)
    await user.click(await screen.findByRole('button', { name: /nuevo producto/i }))

    await user.type(screen.getByLabelText(/nombre \*/i), 'Laptop Pro')
    await user.type(screen.getByLabelText(/precio \*/i), '999.99')
    await user.type(screen.getByLabelText(/stock \*/i), '5')
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => {
      expect(mockCreateProduct).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Laptop Pro', price: 999.99, stock: 5 }),
      )
    })
  })

  it('closes the form after successful creation', async () => {
    const user = userEvent.setup()
    mockGetProducts.mockResolvedValue(makePaginated([]))
    mockCreateProduct.mockResolvedValueOnce({ data: PRODUCT })

    renderAdmin(<ProductsTab />)
    await user.click(await screen.findByRole('button', { name: /nuevo producto/i }))
    await user.type(screen.getByLabelText(/nombre \*/i), 'Laptop Pro')
    await user.type(screen.getByLabelText(/precio \*/i), '999')
    await user.type(screen.getByLabelText(/stock \*/i), '1')
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => {
      expect(screen.queryByRole('form', { name: /nuevo producto/i })).not.toBeInTheDocument()
    })
  })

  it('shows form error when createProduct fails', async () => {
    const user = userEvent.setup()
    mockGetProducts.mockResolvedValue(makePaginated([]))
    mockCreateProduct.mockRejectedValueOnce({
      response: { data: { message: 'El nombre ya existe.' } },
    })

    renderAdmin(<ProductsTab />)
    await user.click(await screen.findByRole('button', { name: /nuevo producto/i }))
    await user.type(screen.getByLabelText(/nombre \*/i), 'Laptop Pro')
    await user.type(screen.getByLabelText(/precio \*/i), '999')
    await user.type(screen.getByLabelText(/stock \*/i), '1')
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/el nombre ya existe/i)
  })
})

// ── 4. ProductsTab — edit ─────────────────────────────────────────────────────

describe('ProductsTab — edit product', () => {
  beforeEach(() => {
    mockGetProducts.mockReset()
    mockGetCategories.mockReset()
    mockUpdateProduct.mockReset()
    mockGetCategories.mockResolvedValue({ data: CATEGORIES })
  })

  it('pre-populates the form with existing product values', async () => {
    const user = userEvent.setup()
    mockGetProducts.mockResolvedValue(makePaginated([PRODUCT]))

    renderAdmin(<ProductsTab />)
    await screen.findByText('Laptop Pro')

    await user.click(screen.getByRole('button', { name: /editar laptop pro/i }))

    expect(screen.getByLabelText(/nombre \*/i)).toHaveValue('Laptop Pro')
    expect(screen.getByLabelText(/precio \*/i)).toHaveValue(999.99)
    expect(screen.getByLabelText(/stock \*/i)).toHaveValue(5)
  })

  it('calls updateProduct with changed values', async () => {
    const user = userEvent.setup()
    mockGetProducts.mockResolvedValue(makePaginated([PRODUCT]))
    mockUpdateProduct.mockResolvedValueOnce({ data: { ...PRODUCT, price: 1299.99 } })

    renderAdmin(<ProductsTab />)
    await screen.findByText('Laptop Pro')

    await user.click(screen.getByRole('button', { name: /editar laptop pro/i }))

    const priceInput = screen.getByLabelText(/precio \*/i)
    await user.clear(priceInput)
    await user.type(priceInput, '1299.99')
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => {
      expect(mockUpdateProduct).toHaveBeenCalledWith(
        'p-1',
        expect.objectContaining({ price: 1299.99 }),
      )
    })
  })
})

// ── 5. ProductsTab — delete ───────────────────────────────────────────────────

describe('ProductsTab — delete product', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let confirmSpy!: MockInstance<any>

  beforeEach(() => {
    mockGetProducts.mockReset()
    mockGetCategories.mockResolvedValue({ data: CATEGORIES })
    mockDeleteProduct.mockReset()
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    confirmSpy.mockRestore()
  })

  it('calls deleteProduct after confirm dialog is accepted', async () => {
    const user = userEvent.setup()
    mockGetProducts.mockResolvedValue(makePaginated([PRODUCT]))
    mockDeleteProduct.mockResolvedValueOnce({})

    renderAdmin(<ProductsTab />)
    await screen.findByText('Laptop Pro')

    await user.click(screen.getByRole('button', { name: /eliminar laptop pro/i }))

    expect(confirmSpy).toHaveBeenCalled()
    await waitFor(() => {
      expect(mockDeleteProduct).toHaveBeenCalledWith('p-1')
    })
  })

  it('does not call deleteProduct when confirm is cancelled', async () => {
    const user = userEvent.setup()
    confirmSpy.mockReturnValueOnce(false)
    mockGetProducts.mockResolvedValue(makePaginated([PRODUCT]))

    renderAdmin(<ProductsTab />)
    await screen.findByText('Laptop Pro')

    await user.click(screen.getByRole('button', { name: /eliminar laptop pro/i }))

    expect(mockDeleteProduct).not.toHaveBeenCalled()
  })

  it('shows delete error when backend rejects', async () => {
    const user = userEvent.setup()
    mockGetProducts.mockResolvedValue(makePaginated([PRODUCT]))
    mockDeleteProduct.mockRejectedValueOnce({
      response: { data: { message: 'Producto referenciado en órdenes activas.' } },
    })

    renderAdmin(<ProductsTab />)
    await screen.findByText('Laptop Pro')

    await user.click(screen.getByRole('button', { name: /eliminar laptop pro/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/referenciado en órdenes/i)
  })
})

// ── 6. CategoriesTab ──────────────────────────────────────────────────────────

describe('CategoriesTab', () => {
  beforeEach(() => {
    mockGetCategories.mockReset()
    mockCreateCategory.mockReset()
  })

  it('lists existing categories', async () => {
    mockGetCategories.mockResolvedValueOnce({ data: CATEGORIES })

    renderAdmin(<CategoriesTab />)

    expect(await screen.findByText('Electrónica')).toBeInTheDocument()
    expect(screen.getByText('Ropa')).toBeInTheDocument()
  })

  it('creates a category and refreshes the list', async () => {
    const user = userEvent.setup()
    mockGetCategories
      .mockResolvedValueOnce({ data: CATEGORIES })
      .mockResolvedValueOnce({ data: [...CATEGORIES, { id: 'cat-3', name: 'Libros' }] })
    mockCreateCategory.mockResolvedValueOnce({ data: { id: 'cat-3', name: 'Libros' } })

    renderAdmin(<CategoriesTab />)
    await screen.findByText('Electrónica')

    await user.type(screen.getByLabelText(/nombre de la nueva categoría/i), 'Libros')
    await user.click(screen.getByRole('button', { name: /crear categoría/i }))

    expect(mockCreateCategory).toHaveBeenCalledWith('Libros')
    expect(await screen.findByText('Libros')).toBeInTheDocument()
  })

  it('clears the input after successful creation', async () => {
    const user = userEvent.setup()
    mockGetCategories.mockResolvedValue({ data: CATEGORIES })
    mockCreateCategory.mockResolvedValueOnce({ data: { id: 'cat-3', name: 'Libros' } })

    renderAdmin(<CategoriesTab />)
    await screen.findByText('Electrónica')

    const input = screen.getByLabelText(/nombre de la nueva categoría/i)
    await user.type(input, 'Libros')
    await user.click(screen.getByRole('button', { name: /crear categoría/i }))

    await waitFor(() => expect(input).toHaveValue(''))
  })
})

// ── 7. OrdersTab ──────────────────────────────────────────────────────────────

describe('OrdersTab', () => {
  beforeEach(() => {
    mockGetOrders.mockReset()
    mockUpdateOrderStatus.mockReset()
  })

  it('renders all orders with id, total and status badge', async () => {
    mockGetOrders.mockResolvedValueOnce({ data: [ORDER, PAID_ORDER] })

    renderAdmin(<OrdersTab />)

    // truncated IDs (first 8 chars uppercase)
    expect(await screen.findByText('ORDER-AB')).toBeInTheDocument()
    expect(screen.getByText('ORDER-XY')).toBeInTheDocument()
    expect(screen.getByText('$999.99')).toBeInTheDocument()
    // Use selector to target the badge span, not the <option> elements inside the status select
    expect(screen.getByText('Pendiente', { selector: '.status-badge' })).toBeInTheDocument()
    expect(screen.getByText('Pagado', { selector: '.status-badge' })).toBeInTheDocument()
  })

  it('updates order status when select changes', async () => {
    const user = userEvent.setup()
    mockGetOrders.mockResolvedValueOnce({ data: [ORDER] })
    mockUpdateOrderStatus.mockResolvedValueOnce({ data: { ...ORDER, status: 'paid' } })

    renderAdmin(<OrdersTab />)
    await screen.findByText('ORDER-AB')

    await user.selectOptions(
      screen.getByRole('combobox', { name: /estado de la orden order-ab/i }),
      'paid',
    )

    await waitFor(() => {
      expect(mockUpdateOrderStatus).toHaveBeenCalledWith('order-abc123def456', 'paid')
    })
  })

  it('shows inline error when status update fails', async () => {
    const user = userEvent.setup()
    mockGetOrders.mockResolvedValueOnce({ data: [ORDER] })
    mockUpdateOrderStatus.mockRejectedValueOnce({
      response: { data: { message: 'Transición no permitida.' } },
    })

    renderAdmin(<OrdersTab />)
    await screen.findByText('ORDER-AB')

    await user.selectOptions(
      screen.getByRole('combobox', { name: /estado de la orden order-ab/i }),
      'cancelled',
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(/transición no permitida/i)
  })

  it('filters orders by status when a filter button is clicked', async () => {
    const user = userEvent.setup()
    mockGetOrders.mockResolvedValueOnce({ data: [ORDER, PAID_ORDER] })

    renderAdmin(<OrdersTab />)
    await screen.findByText('ORDER-AB')

    await user.click(screen.getByRole('button', { name: /pendientes/i }))

    expect(screen.getByText('ORDER-AB')).toBeInTheDocument()
    expect(screen.queryByText('ORDER-XY')).not.toBeInTheDocument()
  })

  it('shows "Estado final" instead of select for terminal orders', async () => {
    const delivered: Order = { ...ORDER, id: 'order-del1111', status: 'delivered' }
    mockGetOrders.mockResolvedValueOnce({ data: [delivered] })

    renderAdmin(<OrdersTab />)
    await screen.findByText('ORDER-DE')

    expect(screen.getByText(/estado final/i)).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('shows empty state when no orders match the current filter', async () => {
    const user = userEvent.setup()
    mockGetOrders.mockResolvedValueOnce({ data: [ORDER] }) // only pending

    renderAdmin(<OrdersTab />)
    await screen.findByText('ORDER-AB')

    await user.click(screen.getByRole('button', { name: /pagados/i }))

    expect(screen.getByText(/no hay órdenes con este filtro/i)).toBeInTheDocument()
  })
})

// ── 8. AdminPage — integration ────────────────────────────────────────────────

describe('AdminPage — integration', () => {
  beforeEach(() => {
    mockGetProducts.mockResolvedValue(makePaginated([], 0))
    mockGetOrders.mockResolvedValue({ data: [] })
    mockGetCategories.mockResolvedValue({ data: [] })
  })

  it('renders all four tab buttons', async () => {
    renderAdmin(<AdminPage />)

    expect(screen.getByRole('button', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Productos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Categorías' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Órdenes' })).toBeInTheDocument()
  })

  it('shows admin email and Admin badge in the header', () => {
    renderAdmin(<AdminPage />)

    // The .admin-header section contains both; Navbar also shows email so scope the query
    const adminHeader = document.querySelector('.admin-header')!
    expect(adminHeader).toHaveTextContent('admin@shop.com')
    expect(adminHeader).toHaveTextContent('Admin')
  })

  it('switches to Productos tab when button is clicked', async () => {
    const user = userEvent.setup()
    mockGetProducts.mockResolvedValue(makePaginated([], 0))

    renderAdmin(<AdminPage />)

    await user.click(screen.getByRole('button', { name: 'Productos' }))

    // ProductsTab renders "+ Nuevo producto" button
    expect(await screen.findByRole('button', { name: /nuevo producto/i })).toBeInTheDocument()
  })

  it('switches to Órdenes tab and renders orders', async () => {
    const user = userEvent.setup()
    mockGetOrders.mockResolvedValue({ data: [ORDER] })

    renderAdmin(<AdminPage />)

    await user.click(screen.getByRole('button', { name: 'Órdenes' }))

    expect(await screen.findByText('ORDER-AB')).toBeInTheDocument()
  })

  it('marks the active tab with aria-current="page"', async () => {
    const user = userEvent.setup()
    mockGetProducts.mockResolvedValue(makePaginated([], 0))
    renderAdmin(<AdminPage />)

    const productosBtn = screen.getByRole('button', { name: 'Productos' })
    await user.click(productosBtn)

    expect(productosBtn).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })
})

// ── 9. Role-based UI ──────────────────────────────────────────────────────────

describe('Role-based UI', () => {
  it('admin panel shows Edit/Delete action buttons (admin-only actions)', async () => {
    mockGetProducts.mockResolvedValue(makePaginated([PRODUCT]))
    mockGetCategories.mockResolvedValue({ data: CATEGORIES })

    renderAdmin(<ProductsTab />)
    await screen.findByText('Laptop Pro')

    const row = screen.getByTestId('product-row')
    expect(within(row).getByRole('button', { name: /editar/i })).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: /eliminar/i })).toBeInTheDocument()
  })

  it('admin panel shows "+ Nuevo producto" create button', async () => {
    mockGetProducts.mockResolvedValue(makePaginated([]))
    renderAdmin(<ProductsTab />)

    expect(await screen.findByRole('button', { name: /nuevo producto/i })).toBeInTheDocument()
  })
})
