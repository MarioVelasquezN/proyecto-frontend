import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { useCart } from '../hooks/useCart'
import { postCheckout, type CheckoutResult } from '../services/checkout.service'

export function CheckoutPage() {
  const { cart, clearCartLocal } = useCart()
  const navigate = useNavigate()
  const [couponCode, setCouponCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<CheckoutResult | null>(null)

  const subtotal =
    cart?.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    ) ?? 0

  const handleCheckout = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const res = await postCheckout(couponCode.trim() || undefined)
      setOrder(res.data)
      clearCartLocal()
    } catch (err: unknown) {
      const raw =
        (err as { response?: { data?: { message?: unknown } } })?.response?.data
          ?.message
      const msg =
        Array.isArray(raw)
          ? raw.join(', ')
          : typeof raw === 'string'
            ? raw
            : 'Error al procesar el pedido. Intente de nuevo.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (order) {
    return (
      <Layout hideSidebar>
        <div className="checkout-success" role="status">
          <div className="checkout-success__icon" aria-hidden="true">✓</div>
          <h1>¡Pedido confirmado!</h1>
          <p className="checkout-success__id">
            Orden #{order.id.slice(0, 8).toUpperCase()}
          </p>
          <p className="checkout-success__total">
            Total cobrado:{' '}
            <strong>${order.total.toFixed(2)}</strong>
          </p>
          <div className="checkout-success__actions">
            <button className="btn-primary" onClick={() => navigate('/products')}>
              Seguir comprando
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Layout hideSidebar>
        <div className="checkout-empty">
          <h1>Checkout</h1>
          <p>Tu carrito está vacío.</p>
          <button className="btn-primary" onClick={() => navigate('/products')}>
            Ver productos
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout hideSidebar>
      <div className="checkout-page">
        <h1 className="checkout-title">Checkout</h1>

        <section className="checkout-section" aria-label="Resumen de productos">
          <h2>Resumen del pedido</h2>
          <ul className="checkout-items">
            {cart.items.map((item) => (
              <li key={item.productId} className="checkout-item">
                <span className="checkout-item__name">
                  {item.product.name}
                  <span className="checkout-item__qty"> × {item.quantity}</span>
                </span>
                <span className="checkout-item__price">
                  ${(item.product.price * item.quantity).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
          <div className="checkout-subtotal">
            <span>Subtotal</span>
            <strong>${subtotal.toFixed(2)}</strong>
          </div>
        </section>

        <section className="checkout-section">
          <h2>Cupón de descuento</h2>
          <div className="checkout-coupon">
            <input
              type="text"
              placeholder="Código de cupón (opcional)"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              aria-label="Código de cupón"
              className="checkout-coupon__input"
              disabled={submitting}
            />
          </div>
        </section>

        {error && (
          <p className="checkout-error" role="alert">
            {error}
          </p>
        )}

        <div className="checkout-actions">
          <button
            className="checkout-actions__btn"
            onClick={handleCheckout}
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? 'Procesando…' : 'Comprar'}
          </button>
        </div>
      </div>
    </Layout>
  )
}
