import type { Product } from '../../types'

interface ProductCardProps {
  product: Product
  onAddToCart?: (product: Product) => void
}

function PlaceholderImage() {
  return (
    <svg
      width="52"
      height="52"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  )
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const isOutOfStock = product.stock === 0

  return (
    <article className="product-card" data-testid="product-card">
      <div className="product-card__image">
        <PlaceholderImage />
      </div>

      <div className="product-card__body">
        {product.category && (
          <span className="product-card__category">{product.category.name}</span>
        )}

        <h3 className="product-card__name">{product.name}</h3>

        <p className="product-card__price">${Number(product.price).toFixed(2)}</p>

        <div className="product-card__footer">
          <span
            className={`product-card__stock${isOutOfStock ? ' product-card__stock--out' : ''}`}
          >
            {isOutOfStock ? 'Sin stock' : `${product.stock} disponibles`}
          </span>

          {onAddToCart && (
            <button
              className="product-card__btn"
              disabled={isOutOfStock}
              onClick={() => onAddToCart(product)}
              aria-label={`Agregar ${product.name} al carrito`}
            >
              Agregar
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
