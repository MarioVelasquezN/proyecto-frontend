import { useEffect, useState } from 'react'
import { getCoupons } from '../../services/coupons.service'
import type { Coupon } from '../../types'

export function CouponsTab() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCoupons()
      .then((res) => setCoupons(res.data))
      .catch(() => setError('No se pudieron cargar los cupones.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="admin-section">
      <div className="admin-section__header">
        <h2 className="admin-section-title">
          Cupones
          {!loading && (
            <span className="admin-section-title__count">{coupons.length}</span>
          )}
        </h2>
      </div>

      {error && <p role="alert" className="admin-error">{error}</p>}

      {loading ? (
        <p className="admin-loading">Cargando cupones…</p>
      ) : coupons.length === 0 ? (
        <p className="admin-empty">No hay cupones registrados.</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descuento</th>
                <th>Estado</th>
                <th>Expira</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td><code>{coupon.code}</code></td>
                  <td>{coupon.discount}%</td>
                  <td>
                    <span className={`status-badge status-badge--${coupon.isActive ? 'paid' : 'cancelled'}`}>
                      {coupon.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="order-date">
                    {coupon.expiresAt
                      ? new Date(coupon.expiresAt).toLocaleDateString('es-MX')
                      : <span className="text-muted">Sin expiración</span>}
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
