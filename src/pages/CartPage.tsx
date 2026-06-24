import { Link, useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { useCart } from '../hooks/useCart'

export function CartPage() {
  const { cart, loading, error, removeItem, updateQuantity } = useCart()
  const navigate = useNavigate()

  const subtotal =
    cart?.items.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0,
    ) ?? 0

  if (loading) {
    return (
      <Layout hideSidebar>
        <p aria-label="Cargando carrito" className="cart-loading">
          Cargando carrito…
        </p>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout hideSidebar>
        <p role="alert" className="cart-error">
          {error}
        </p>
      </Layout>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Layout hideSidebar>
        <div className="cart-empty">
          <h1>Tu carrito</h1>
          <p>No tienes productos en el carrito.</p>
          <Link to="/products" className="btn-primary">
            Ver productos
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout hideSidebar>
      <div className="cart-page">
        <h1 className="cart-title">
          Tu carrito
          <span className="cart-title__count">
            {cart.items.reduce((s, i) => s + i.quantity, 0)} producto
            {cart.items.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''}
          </span>
        </h1>

        <div className="cart-items" role="list">
          {cart.items.map((item) => {
            const lineTotal = Number(item.product.price) * item.quantity
            const maxQty = item.product.stock
            return (
              <div
                key={item.productId}
                className="cart-item"
                role="listitem"
                data-testid="cart-item"
              >
                <div className="cart-item__info">
                  <span className="cart-item__name">{item.product.name}</span>
                  <span className="cart-item__unit-price">
                    ${Number(item.product.price).toFixed(2)} c/u
                  </span>
                </div>

                <div className="cart-item__controls">
                  <button
                    className="cart-item__qty-btn"
                    aria-label="Reducir cantidad"
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity - 1)
                    }
                    disabled={item.quantity <= 1}
                  >
                    −
                  </button>
                  <span
                    className="cart-item__qty"
                    aria-label={`Cantidad: ${item.quantity}`}
                  >
                    {item.quantity}
                  </span>
                  <button
                    className="cart-item__qty-btn"
                    aria-label="Aumentar cantidad"
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity + 1)
                    }
                    disabled={item.quantity >= maxQty}
                  >
                    +
                  </button>
                </div>

                <span className="cart-item__subtotal">
                  ${lineTotal.toFixed(2)}
                </span>

                <button
                  className="cart-item__remove"
                  aria-label={`Eliminar ${item.product.name}`}
                  onClick={() => removeItem(item.productId)}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>

        <div className="cart-summary">
          <div className="cart-summary__row">
            <span>Subtotal</span>
            <strong aria-label={`Subtotal: $${subtotal.toFixed(2)}`}>
              ${subtotal.toFixed(2)}
            </strong>
          </div>
          <div className="cart-summary__actions">
            <Link to="/products" className="btn-link">
              Seguir comprando
            </Link>
            <button
              className="btn-primary"
              onClick={() => navigate('/checkout')}
            >
              Ir a pagar →
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
