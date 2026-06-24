import { Link, useSearchParams } from 'react-router-dom'
import { useCategories } from '../../hooks/useCategories'

export function Sidebar() {
  const { categories, loading, error } = useCategories()
  const [searchParams] = useSearchParams()
  const activeCategoryId = searchParams.get('categoryId')

  return (
    <aside className="sidebar">
      <h3 className="sidebar-title">Categorías</h3>

      {loading ? (
        <p className="sidebar-loading">Cargando…</p>
      ) : error ? (
        <p className="sidebar-error">{error}</p>
      ) : (
        <ul className="sidebar-list">
          <li>
            <Link
              to="/products"
              className={!activeCategoryId ? 'active' : undefined}
            >
              Todos
            </Link>
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link
                to={`/products?categoryId=${cat.id}`}
                className={activeCategoryId === cat.id.toString() ? 'active' : undefined}
              >
                {cat.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
