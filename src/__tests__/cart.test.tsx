import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AuthContext, type AuthContextValue } from '../contexts/AuthContext'
import { CartContext, CartProvider, type CartContextValue } from '../contexts/CartContext'
import { CartPage } from '../pages/CartPage'
import { CheckoutPage } from '../pages/CheckoutPage'
import { useCart } from '../hooks/useCart'
import type { Cart } from '../types'

// ── Service mocks ────────────────────────────────────────────────────────────

const mockGetCart = vi.hoisted(() => vi.fn())
const mockAddToCart = vi.hoisted(() => vi.fn())
const mockRemoveFromCart = vi.hoisted(() => vi.fn())
const mockPostCheckout = vi.hoisted(() => vi.fn())

vi.mock('../services/cart.service', () => ({
  getCart: mockGetCart,
  addToCart: mockAddToCart,
  removeFromCart: mockRemoveFromCart,
}))

vi.mock('../services/checkout.service', () => ({
  postCheckout: mockPostCheckout,
}))

vi.mock('../hooks/useCategories', () => ({
  useCategories: () => ({ categories: [], loading: false, error: null }),
}))

// ── Fixtures ─────────────────────────────────────────────────────────────────

const CART: Cart = {
  id: 'cart-1',
  items: [
    {
      productId: 'p-1',
      quantity: 2,
      product: { id: 'p-1', name: 'Laptop Pro', price: 999.99, stock: 5 },
    },
    {
      productId: 'p-2',
      quantity: 1,
      product: { id: 'p-2', name: 'Mouse Inalámbrico', price: 29.99, stock: 10 },
    },
  ],
}
// subtotal = 999.99*2 + 29.99*1 = 2029.97

const EMPTY_CART: Cart = { id: 'cart-1', items: [] }

const loggedInUser: AuthContextValue = {
  user: { sub: 'u-1', email: 'test@example.com', role: 'user' },
  loading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}

// ── Cart context stub (for page tests) ───────────────────────────────────────

const addItemMock = vi.fn()
const removeItemMock = vi.fn()
const updateQuantityMock = vi.fn()
const refreshCartMock = vi.fn()
const clearCartLocalMock = vi.fn()

function makeCartCtx(overrides?: Partial<CartContextValue>): CartContextValue {
  return {
    cart: CART,
    loading: false,
    error: null,
    itemCount: 3,
    addItem: addItemMock,
    removeItem: removeItemMock,
    updateQuantity: updateQuantityMock,
    refreshCart: refreshCartMock,
    clearCartLocal: clearCartLocalMock,
    ...overrides,
  }
}

function renderWithCart(
  ui: React.ReactElement,
  cartOverrides?: Partial<CartContextValue>,
  initialPath = '/',
) {
  return render(
    <AuthContext.Provider value={loggedInUser}>
      <CartContext.Provider value={makeCartCtx(cartOverrides)}>
        <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>
      </CartContext.Provider>
    </AuthContext.Provider>,
  )
}

// ── Helper component to read CartContext in tests ─────────────────────────────

function CartHarness({ onCtx }: { onCtx: (ctx: CartContextValue) => void }) {
  const ctx = useCart()
  onCtx(ctx)
  return null
}

function renderWithProvider(
  authValue: AuthContextValue,
  onCtx: (ctx: CartContextValue) => void,
) {
  return render(
    <AuthContext.Provider value={authValue}>
      <CartProvider>
        <MemoryRouter>
          <CartHarness onCtx={onCtx} />
        </MemoryRouter>
      </CartProvider>
    </AuthContext.Provider>,
  )
}

// ── 1. CartContext ────────────────────────────────────────────────────────────

describe('CartContext', () => {
  beforeEach(() => {
    mockGetCart.mockReset()
    mockAddToCart.mockReset()
    mockRemoveFromCart.mockReset()
  })

  it('fetches cart on mount when user is logged in', async () => {
    mockGetCart.mockResolvedValueOnce({ data: CART })
    let captured: CartContextValue | null = null
    renderWithProvider(loggedInUser, (ctx) => { captured = ctx })

    await waitFor(() => {
      expect(captured?.cart?.id).toBe('cart-1')
    })
    expect(mockGetCart).toHaveBeenCalledOnce()
  })

  it('does not fetch cart when user is null', () => {
    const noUser: AuthContextValue = { ...loggedInUser, user: null }
    renderWithProvider(noUser, () => {})
    expect(mockGetCart).not.toHaveBeenCalled()
  })

  it('addItem calls addToCart then refreshes cart', async () => {
    mockGetCart
      .mockResolvedValueOnce({ data: EMPTY_CART })   // initial fetch
      .mockResolvedValueOnce({ data: CART })           // refresh after addItem
    mockAddToCart.mockResolvedValueOnce({})

    let captured: CartContextValue | null = null
    renderWithProvider(loggedInUser, (ctx) => { captured = ctx })

    await waitFor(() => expect(captured?.cart).toBeTruthy())

    await captured!.addItem('p-1', 1)

    expect(mockAddToCart).toHaveBeenCalledWith('p-1', 1)
    await waitFor(() => {
      expect(captured?.cart?.items).toHaveLength(2)
    })
    expect(mockGetCart).toHaveBeenCalledTimes(2)
  })

  it('removeItem calls removeFromCart then refreshes cart', async () => {
    mockGetCart
      .mockResolvedValueOnce({ data: CART })
      .mockResolvedValueOnce({ data: EMPTY_CART })
    mockRemoveFromCart.mockResolvedValueOnce({})

    let captured: CartContextValue | null = null
    renderWithProvider(loggedInUser, (ctx) => { captured = ctx })

    await waitFor(() => expect(captured?.cart?.items).toHaveLength(2))

    await captured!.removeItem('p-1')

    expect(mockRemoveFromCart).toHaveBeenCalledWith('p-1')
    await waitFor(() => {
      expect(captured?.cart?.items).toHaveLength(0)
    })
  })

  it('updateQuantity with qty <= 0 calls removeFromCart', async () => {
    mockGetCart.mockResolvedValue({ data: EMPTY_CART })
    mockRemoveFromCart.mockResolvedValueOnce({})

    let captured: CartContextValue | null = null
    renderWithProvider(loggedInUser, (ctx) => { captured = ctx })

    await waitFor(() => expect(captured?.cart).toBeTruthy())

    await captured!.updateQuantity('p-1', 0)

    expect(mockRemoveFromCart).toHaveBeenCalledWith('p-1')
    expect(mockAddToCart).not.toHaveBeenCalled()
  })

  it('itemCount sums all item quantities', async () => {
    mockGetCart.mockResolvedValueOnce({ data: CART })  // qty 2 + 1 = 3

    let captured: CartContextValue | null = null
    renderWithProvider(loggedInUser, (ctx) => { captured = ctx })

    await waitFor(() => {
      expect(captured?.itemCount).toBe(3)
    })
  })
})

// ── 2. CartPage ───────────────────────────────────────────────────────────────

describe('CartPage', () => {
  beforeEach(() => {
    addItemMock.mockReset()
    removeItemMock.mockReset()
    updateQuantityMock.mockReset()
  })

  it('renders all cart items with names', () => {
    renderWithCart(<CartPage />)

    expect(screen.getByText('Laptop Pro')).toBeInTheDocument()
    expect(screen.getByText('Mouse Inalámbrico')).toBeInTheDocument()
  })

  it('shows unit price for each item', () => {
    renderWithCart(<CartPage />)
    expect(screen.getByText('$999.99 c/u')).toBeInTheDocument()
    expect(screen.getByText('$29.99 c/u')).toBeInTheDocument()
  })

  it('shows line totals (price × quantity)', () => {
    renderWithCart(<CartPage />)
    // Laptop Pro: 999.99 * 2
    expect(screen.getByText('$1999.98')).toBeInTheDocument()
    // Mouse: 29.99 * 1
    expect(screen.getByText('$29.99')).toBeInTheDocument()
  })

  it('shows cart subtotal', () => {
    renderWithCart(<CartPage />)
    // 1999.98 + 29.99 = 2029.97
    expect(screen.getByLabelText(/subtotal: \$2029\.97/i)).toBeInTheDocument()
  })

  it('shows empty state when cart has no items', () => {
    renderWithCart(<CartPage />, { cart: EMPTY_CART, itemCount: 0 })
    expect(screen.getByText(/no tienes productos en el carrito/i)).toBeInTheDocument()
  })

  it('clicking × remove button calls removeItem with productId', async () => {
    const user = userEvent.setup()
    removeItemMock.mockResolvedValueOnce(undefined)
    renderWithCart(<CartPage />)

    await user.click(screen.getByLabelText('Eliminar Laptop Pro'))

    expect(removeItemMock).toHaveBeenCalledWith('p-1')
  })

  it('clicking + quantity button calls updateQuantity with qty+1', async () => {
    const user = userEvent.setup()
    updateQuantityMock.mockResolvedValueOnce(undefined)
    renderWithCart(<CartPage />)

    const increaseButtons = screen.getAllByLabelText('Aumentar cantidad')
    await user.click(increaseButtons[0]) // first item (Laptop Pro, qty=2)

    expect(updateQuantityMock).toHaveBeenCalledWith('p-1', 3)
  })

  it('clicking − quantity button calls updateQuantity with qty-1', async () => {
    const user = userEvent.setup()
    updateQuantityMock.mockResolvedValueOnce(undefined)
    renderWithCart(<CartPage />)

    const decreaseButtons = screen.getAllByLabelText('Reducir cantidad')
    await user.click(decreaseButtons[0]) // first item (Laptop Pro, qty=2)

    expect(updateQuantityMock).toHaveBeenCalledWith('p-1', 1)
  })

  it('disables − button when quantity is 1', () => {
    const singleQtyCart: Cart = {
      id: 'cart-1',
      items: [{ productId: 'p-1', quantity: 1, product: { id: 'p-1', name: 'Laptop Pro', price: 999.99, stock: 5 } }],
    }
    renderWithCart(<CartPage />, { cart: singleQtyCart })
    expect(screen.getByLabelText('Reducir cantidad')).toBeDisabled()
  })

  it('disables + button when quantity equals stock', () => {
    const atMaxCart: Cart = {
      id: 'cart-1',
      items: [{ productId: 'p-1', quantity: 5, product: { id: 'p-1', name: 'Laptop Pro', price: 999.99, stock: 5 } }],
    }
    renderWithCart(<CartPage />, { cart: atMaxCart })
    expect(screen.getByLabelText('Aumentar cantidad')).toBeDisabled()
  })

  it('shows error state', () => {
    renderWithCart(<CartPage />, { cart: null, error: 'No se pudo cargar el carrito.' })
    expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo cargar/i)
  })
})

// ── 3. CheckoutPage ───────────────────────────────────────────────────────────

describe('CheckoutPage', () => {
  beforeEach(() => {
    mockPostCheckout.mockReset()
    clearCartLocalMock.mockReset()
  })

  it('renders product summary with names and quantities', () => {
    renderWithCart(<CheckoutPage />)
    expect(screen.getByText('Laptop Pro')).toBeInTheDocument()
    expect(screen.getByText('Mouse Inalámbrico')).toBeInTheDocument()
    expect(screen.getByText(/× 2/)).toBeInTheDocument()
    expect(screen.getByText(/× 1/)).toBeInTheDocument()
  })

  it('shows correct subtotal', () => {
    renderWithCart(<CheckoutPage />)
    expect(screen.getByText('$2029.97')).toBeInTheDocument()
  })

  it('renders coupon input field', () => {
    renderWithCart(<CheckoutPage />)
    expect(screen.getByLabelText(/código de cupón/i)).toBeInTheDocument()
  })

  it('shows empty state when cart has no items', () => {
    renderWithCart(<CheckoutPage />, { cart: EMPTY_CART })
    expect(screen.getByText(/tu carrito está vacío/i)).toBeInTheDocument()
  })

  it('calls postCheckout without coupon when field is empty', async () => {
    const user = userEvent.setup()
    mockPostCheckout.mockResolvedValueOnce({
      data: { id: 'order-123', status: 'paid', total: 2029.97, createdAt: '', items: [] },
    })
    renderWithCart(<CheckoutPage />)

    await user.click(screen.getByRole('button', { name: /comprar/i }))

    expect(mockPostCheckout).toHaveBeenCalledWith(undefined)
  })

  it('calls postCheckout with couponCode when entered', async () => {
    const user = userEvent.setup()
    mockPostCheckout.mockResolvedValueOnce({
      data: { id: 'order-123', status: 'paid', total: 1800.0, createdAt: '', items: [] },
    })
    renderWithCart(<CheckoutPage />)

    await user.type(screen.getByLabelText(/código de cupón/i), 'SAVE10')
    await user.click(screen.getByRole('button', { name: /comprar/i }))

    expect(mockPostCheckout).toHaveBeenCalledWith('SAVE10')
  })

  it('shows success screen with order id and total after checkout', async () => {
    const user = userEvent.setup()
    mockPostCheckout.mockResolvedValueOnce({
      data: { id: 'order-abc123', status: 'paid', total: 1800.0, createdAt: '', items: [] },
    })
    renderWithCart(<CheckoutPage />)

    await user.click(screen.getByRole('button', { name: /comprar/i }))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent(/pedido confirmado/i)
    expect(status).toHaveTextContent('ORDER-AB')   // first 8 chars of order id, uppercased
    expect(status).toHaveTextContent('$1800.00')
  })

  it('clears cart locally after successful checkout', async () => {
    const user = userEvent.setup()
    mockPostCheckout.mockResolvedValueOnce({
      data: { id: 'order-123', status: 'paid', total: 100.0, createdAt: '', items: [] },
    })
    renderWithCart(<CheckoutPage />)

    await user.click(screen.getByRole('button', { name: /comprar/i }))

    await screen.findByRole('status')
    expect(clearCartLocalMock).toHaveBeenCalledOnce()
  })

  it('shows backend error message on failed checkout', async () => {
    const user = userEvent.setup()
    mockPostCheckout.mockRejectedValueOnce({
      response: { data: { message: 'Stock insuficiente para el producto Laptop Pro' } },
    })
    renderWithCart(<CheckoutPage />)

    await user.click(screen.getByRole('button', { name: /comprar/i }))

    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent(/stock insuficiente/i)
  })

  it('shows generic error when backend message is missing', async () => {
    const user = userEvent.setup()
    mockPostCheckout.mockRejectedValueOnce(new Error('Network error'))
    renderWithCart(<CheckoutPage />)

    await user.click(screen.getByRole('button', { name: /comprar/i }))

    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent(/error al procesar/i)
  })

  it('disables buy button while submitting', async () => {
    let resolveCheckout!: (v: unknown) => void
    mockPostCheckout.mockReturnValueOnce(new Promise((r) => { resolveCheckout = r }))

    const user = userEvent.setup()
    renderWithCart(<CheckoutPage />)

    await user.click(screen.getByRole('button', { name: /comprar/i }))

    expect(screen.getByRole('button', { name: /procesando/i })).toBeDisabled()

    // Resolve to avoid act() warning
    resolveCheckout({ data: { id: 'x', status: 'paid', total: 0, createdAt: '', items: [] } })
    await screen.findByRole('status')
  })
})
