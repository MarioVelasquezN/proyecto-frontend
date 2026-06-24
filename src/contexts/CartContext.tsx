import {
  createContext,
  useCallback,
  useEffect,
  useReducer,
  type ReactNode,
} from 'react'
import type { Cart } from '../types'
import { getCart, addToCart, removeFromCart } from '../services/cart.service'
import { useAuth } from '../hooks/useAuth'

interface CartState {
  cart: Cart | null
  loading: boolean
  error: string | null
}

type CartAction =
  | { type: 'LOADING' }
  | { type: 'SET'; payload: Cart }
  | { type: 'ERROR'; payload: string }
  | { type: 'CLEAR' }

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'LOADING': return { ...state, loading: true, error: null }
    case 'SET': return { cart: action.payload, loading: false, error: null }
    case 'ERROR': return { ...state, loading: false, error: action.payload }
    case 'CLEAR': return { cart: null, loading: false, error: null }
  }
}

export interface CartContextValue {
  cart: Cart | null
  loading: boolean
  error: string | null
  itemCount: number
  addItem: (productId: string, quantity?: number) => Promise<void>
  removeItem: (productId: string) => Promise<void>
  updateQuantity: (productId: string, quantity: number) => Promise<void>
  refreshCart: () => Promise<void>
  clearCartLocal: () => void
}

export const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [state, dispatch] = useReducer(cartReducer, {
    cart: null,
    loading: false,
    error: null,
  })

  const fetchCart = useCallback(async () => {
    dispatch({ type: 'LOADING' })
    try {
      const res = await getCart()
      dispatch({ type: 'SET', payload: res.data })
    } catch {
      dispatch({ type: 'ERROR', payload: 'No se pudo cargar el carrito.' })
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchCart()
    } else {
      dispatch({ type: 'CLEAR' })
    }
  }, [user, fetchCart])

  const addItem = useCallback(
    async (productId: string, quantity = 1) => {
      await addToCart(productId, quantity)
      await fetchCart()
    },
    [fetchCart],
  )

  const removeItem = useCallback(
    async (productId: string) => {
      await removeFromCart(productId)
      await fetchCart()
    },
    [fetchCart],
  )

  const updateQuantity = useCallback(
    async (productId: string, quantity: number) => {
      if (quantity <= 0) {
        await removeFromCart(productId)
      } else {
        await addToCart(productId, quantity)
      }
      await fetchCart()
    },
    [fetchCart],
  )

  const clearCartLocal = useCallback(() => dispatch({ type: 'CLEAR' }), [])

  const itemCount =
    state.cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0

  return (
    <CartContext.Provider
      value={{
        cart: state.cart,
        loading: state.loading,
        error: state.error,
        itemCount,
        addItem,
        removeItem,
        updateQuantity,
        refreshCart: fetchCart,
        clearCartLocal,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}
