import { useCallback, useEffect, useState } from 'react'
import { deleteProduct, getProducts } from '../../services/products.service'
import type { Product } from '../../types'
import { ProductForm } from './ProductForm'

type FormMode = 'hidden' | 'create' | { edit: Product }

function extractMessage(err: unknown): string {
  const raw = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message
  if (Array.isArray(raw)) return raw.join(', ')
  if (typeof raw === 'string') return raw
  return 'Error inesperado.'
}

export function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<FormMode>('hidden')

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getProducts({ limit: 100, sortBy: 'createdAt', sortOrder: 'desc' })
      setProducts(res.data.data)
      setTotal(res.data.total)
    } catch {
      setError('No se pudieron cargar los productos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`)) return
    setDeleteError(null)
    try {
      await deleteProduct(product.id)
      await fetchProducts()
    } catch (err) {
      setDeleteError(extractMessage(err))
    }
  }

  const handleFormSuccess = async () => {
    setFormMode('hidden')
    await fetchProducts()
  }

  return (
    <div className="admin-section">
      <div className="admin-section__header">
        <h2 className="admin-section-title">
          Productos
          {!loading && <span className="admin-section-title__count">{total}</span>}
        </h2>
        {formMode === 'hidden' && (
          <button onClick={() => setFormMode('create')}>+ Nuevo producto</button>
        )}
      </div>

      {deleteError && (
        <p role="alert" className="admin-error">
          {deleteError}{' '}
          <button className="btn-link" onClick={() => setDeleteError(null)}>×</button>
        </p>
      )}

      {formMode !== 'hidden' && (
        <ProductForm
          initialValues={formMode === 'create' ? null : formMode.edit}
          onSuccess={handleFormSuccess}
          onCancel={() => setFormMode('hidden')}
        />
      )}

      {error && <p role="alert" className="admin-error">{error}</p>}

      {loading ? (
        <p className="admin-loading">Cargando productos…</p>
      ) : products.length === 0 ? (
        <p className="admin-empty">No hay productos. Crea el primero.</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Categoría</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} data-testid="product-row">
                  <td>{p.name}</td>
                  <td>${p.price.toFixed(2)}</td>
                  <td>
                    <span className={p.stock === 0 ? 'stock-badge stock-badge--out' : 'stock-badge'}>
                      {p.stock}
                    </span>
                  </td>
                  <td>{p.category?.name ?? <span className="text-muted">—</span>}</td>
                  <td className="admin-table__actions">
                    <button
                      className="btn-sm"
                      aria-label={`Editar ${p.name}`}
                      onClick={() => setFormMode({ edit: p })}
                    >
                      Editar
                    </button>
                    <button
                      className="btn-sm btn-sm--danger"
                      aria-label={`Eliminar ${p.name}`}
                      onClick={() => handleDelete(p)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
