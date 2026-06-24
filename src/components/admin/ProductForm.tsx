import { type FormEvent, useEffect, useState } from 'react'
import { getCategories } from '../../services/categories.service'
import { createProduct, updateProduct } from '../../services/products.service'
import type { Category, Product } from '../../types'

interface ProductFormProps {
  initialValues: Product | null
  onSuccess: (product: Product) => void
  onCancel: () => void
}

function extractMessage(err: unknown): string {
  const raw = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message
  if (Array.isArray(raw)) return raw.join(', ')
  if (typeof raw === 'string') return raw
  return 'Error al guardar el producto.'
}

export function ProductForm({ initialValues, onSuccess, onCancel }: ProductFormProps) {
  const isEdit = initialValues !== null

  const [name, setName] = useState(initialValues?.name ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [price, setPrice] = useState(initialValues?.price.toString() ?? '')
  const [stock, setStock] = useState(initialValues?.stock.toString() ?? '')
  const [categoryId, setCategoryId] = useState(initialValues?.categoryId?.toString() ?? '')
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryLoadError, setCategoryLoadError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCategories()
      .then((res) => setCategories(res.data))
      .catch(() => setCategoryLoadError(true))
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const parsedPrice = parseFloat(price)
    const parsedStock = parseInt(stock, 10)
    if (!name.trim() || isNaN(parsedPrice) || isNaN(parsedStock)) {
      setError('Nombre, precio y stock son obligatorios.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const dto = {
        name: name.trim(),
        description: description.trim() || undefined,
        price: parsedPrice,
        stock: parsedStock,
        categoryId: categoryId ? Number(categoryId) : undefined,
      }
      const res = isEdit
        ? await updateProduct(initialValues!.id, dto)
        : await createProduct(dto)
      onSuccess(res.data)
    } catch (err) {
      setError(extractMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="product-form" onSubmit={handleSubmit} aria-label={isEdit ? 'Editar producto' : 'Nuevo producto'}>
      <h3 className="product-form__title">{isEdit ? 'Editar producto' : 'Nuevo producto'}</h3>

      <div className="product-form__group">
        <label htmlFor="pf-name">Nombre *</label>
        <input
          id="pf-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={submitting}
        />
      </div>

      <div className="product-form__group">
        <label htmlFor="pf-desc">Descripción</label>
        <input
          id="pf-desc"
          type="text"
          value={description ?? ''}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="product-form__row">
        <div className="product-form__group">
          <label htmlFor="pf-price">Precio *</label>
          <input
            id="pf-price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            disabled={submitting}
          />
        </div>
        <div className="product-form__group">
          <label htmlFor="pf-stock">Stock *</label>
          <input
            id="pf-stock"
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
            disabled={submitting}
          />
        </div>
      </div>

      <div className="product-form__group">
        <label htmlFor="pf-category">Categoría</label>
        {categoryLoadError && (
          <p className="product-form__error" role="alert">No se pudieron cargar las categorías.</p>
        )}
        <select
          id="pf-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={submitting}
        >
          <option value="">Sin categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="product-form__error" role="alert">
          {error}
        </p>
      )}

      <div className="product-form__actions">
        <button type="button" className="btn-link" onClick={onCancel} disabled={submitting}>
          Cancelar
        </button>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
