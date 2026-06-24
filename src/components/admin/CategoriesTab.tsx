import { type FormEvent, useEffect, useState } from 'react'
import { createCategory, getCategories } from '../../services/categories.service'
import type { Category } from '../../types'

export function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const res = await getCategories()
      setCategories(res.data)
    } catch {
      setError('No se pudieron cargar las categorías.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    setCreateError(null)
    setCreating(true)
    try {
      await createCategory(trimmed)
      setNewName('')
      await fetchCategories()
    } catch (err) {
      const raw = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message
      setCreateError(typeof raw === 'string' ? raw : 'Error al crear la categoría.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">Categorías</h2>

      <form className="category-form" onSubmit={handleCreate} aria-label="Nueva categoría">
        <div className="category-form__row">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre de categoría"
            aria-label="Nombre de la nueva categoría"
            disabled={creating}
            className="category-form__input"
          />
          <button type="submit" disabled={creating || !newName.trim()}>
            {creating ? 'Creando…' : 'Crear categoría'}
          </button>
        </div>
        {createError && (
          <p role="alert" className="admin-error">{createError}</p>
        )}
      </form>

      {error && <p role="alert" className="admin-error">{error}</p>}

      {loading ? (
        <p className="admin-loading">Cargando categorías…</p>
      ) : categories.length === 0 ? (
        <p className="admin-empty">No hay categorías aún.</p>
      ) : (
        <ul className="categories-list">
          {categories.map((c) => (
            <li key={c.id} className="categories-list__item" data-testid="category-item">
              {c.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
