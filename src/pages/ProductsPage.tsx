import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { ProductCard } from '../components/products/ProductCard'
import { useProducts } from '../hooks/useProducts'
import { useDebounce } from '../hooks/useDebounce'
import { useAuth } from '../hooks/useAuth'
import { useCart } from '../hooks/useCart'
import type { Product } from '../types'

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Nombre A→Z' },
  { value: 'name-desc', label: 'Nombre Z→A' },
  { value: 'price-asc', label: 'Precio: menor a mayor' },
  { value: 'price-desc', label: 'Precio: mayor a menor' },
  { value: 'createdAt-desc', label: 'Más recientes' },
  { value: 'stock-desc', label: 'Mayor stock' },
]

function parseSortKey(key: string): { sortBy: string; sortOrder: 'asc' | 'desc' } {
  const idx = key.lastIndexOf('-')
  if (idx <= 0) return { sortBy: 'name', sortOrder: 'asc' }
  return {
    sortBy: key.slice(0, idx),
    sortOrder: key.slice(idx + 1) === 'asc' ? 'asc' : 'desc',
  }
}

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addItem } = useCart()

  const categoryId = searchParams.get('categoryId') ?? undefined
  const sortKey = searchParams.get('sort') ?? 'name-asc'
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))

  const { sortBy, sortOrder } = parseSortKey(sortKey)

  const [searchInput, setSearchInput] = useState('')
  const [cartError, setCartError] = useState<string | null>(null)
  const debouncedSearch = useDebounce(searchInput, 300)

  const { products, total, totalPages, loading, error } = useProducts({
    page,
    search: debouncedSearch,
    categoryId,
    sortBy,
    sortOrder,
  })

  const handleAddToCart = (product: Product) => {
    if (!user) {
      navigate('/login')
      return
    }
    setCartError(null)
    addItem(product.id).catch(() => {
      setCartError(`No se pudo agregar "${product.name}" al carrito.`)
    })
  }

  const goToPage = (p: number) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('page', String(p))
        return next
      },
      { replace: true },
    )

  const changeSort = (value: string) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('sort', value)
        next.delete('page')
        return next
      },
      { replace: true },
    )

  const clearCategory = () =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('categoryId')
        next.delete('page')
        return next
      },
      { replace: true },
    )

  return (
    <Layout>
      <div className="page-products">
        {/* ── Toolbar ── */}
        <div className="products-toolbar">
          <h1 className="products-title">
            Productos
            {!loading && total > 0 && (
              <span className="products-count">{total} resultado{total !== 1 ? 's' : ''}</span>
            )}
          </h1>
          <div className="products-controls">
            <input
              type="search"
              placeholder="Buscar productos…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Buscar productos"
              className="products-search"
            />
            <select
              value={sortKey}
              onChange={(e) => changeSort(e.target.value)}
              aria-label="Ordenar por"
              className="products-sort"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Cart error banner ── */}
        {cartError && (
          <p role="alert" className="products-cart-error">
            {cartError}
            <button
              className="btn-link products-cart-error__dismiss"
              onClick={() => setCartError(null)}
              aria-label="Cerrar aviso"
            >
              ×
            </button>
          </p>
        )}

        {/* ── Active filter chip ── */}
        {categoryId && (
          <div className="filter-chips">
            <span className="filter-chip">
              Filtrando por categoría
              <button
                className="filter-chip__remove"
                aria-label="Quitar filtro de categoría"
                onClick={clearCategory}
              >
                ×
              </button>
            </span>
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div className="products-grid products-grid--skeleton" aria-busy="true" aria-label="Cargando productos">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="product-card product-card--skeleton" />
            ))}
          </div>
        ) : error ? (
          <p className="products-error" role="alert">
            {error}
          </p>
        ) : products.length === 0 ? (
          <div className="products-empty">
            <p>No se encontraron productos.</p>
            {searchInput && (
              <button onClick={() => setSearchInput('')}>Limpiar búsqueda</button>
            )}
          </div>
        ) : (
          <div className="products-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <nav className="pagination" aria-label="Navegación de páginas">
            <button
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              aria-label="Página anterior"
            >
              ← Anterior
            </button>
            <span className="pagination-info">
              Página <strong>{page}</strong> de <strong>{totalPages}</strong>
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
              aria-label="Página siguiente"
            >
              Siguiente →
            </button>
          </nav>
        )}
      </div>
    </Layout>
  )
}
