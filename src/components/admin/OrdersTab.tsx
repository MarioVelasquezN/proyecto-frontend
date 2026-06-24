import { useEffect, useState } from 'react'
import { getOrders, updateOrderStatus } from '../../services/orders.service'
import type { Order, OrderStatus } from '../../types'

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  cancelled: 'Cancelado',
  delivered: 'Entregado',
}

const STATUS_FILTERS: Array<{ value: OrderStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'paid', label: 'Pagados' },
  { value: 'cancelled', label: 'Cancelados' },
  { value: 'delivered', label: 'Entregados' },
]

const ALL_STATUSES: OrderStatus[] = ['pending', 'paid', 'cancelled', 'delivered']

function isTerminal(status: OrderStatus): boolean {
  return status === 'delivered' || status === 'cancelled'
}

function extractMessage(err: unknown): string {
  const raw = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message
  if (Array.isArray(raw)) return raw.join(', ')
  if (typeof raw === 'string') return raw
  return 'No se pudo actualizar el estado.'
}

export function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setLoading(true)
    setError(null)
    getOrders()
      .then((res) => setOrders(res.data))
      .catch(() => setError('No se pudieron cargar las órdenes.'))
      .finally(() => setLoading(false))
  }, [])

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setRowErrors((prev) => ({ ...prev, [orderId]: '' }))
    try {
      const res = await updateOrderStatus(orderId, newStatus)
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.data : o)))
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [orderId]: extractMessage(err) }))
    }
  }

  const visible = filter === 'all' ? orders : orders.filter((o) => o.status === filter)

  return (
    <div className="admin-section">
      <div className="admin-section__header">
        <h2 className="admin-section-title">
          Órdenes
          {!loading && (
            <span className="admin-section-title__count">{visible.length}</span>
          )}
        </h2>
      </div>

      <div className="order-filters" role="group" aria-label="Filtrar por estado">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            className={`order-filter-btn${filter === f.value ? ' order-filter-btn--active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="admin-error">{error}</p>}

      {loading ? (
        <p className="admin-loading">Cargando órdenes…</p>
      ) : visible.length === 0 ? (
        <p className="admin-empty">No hay órdenes con este filtro.</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Total</th>
                <th>Estado actual</th>
                <th>Fecha</th>
                <th>Cambiar estado</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((order) => (
                <tr key={order.id} data-testid="order-row">
                  <td className="order-id" title={order.id}>
                    {String(order.id).slice(0, 8).toUpperCase()}
                  </td>
                  <td>${Number(order.total).toFixed(2)}</td>
                  <td>
                    <span className={`status-badge status-badge--${order.status}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="order-date">
                    {new Date(order.createdAt).toLocaleDateString('es-MX')}
                  </td>
                  <td>
                    {isTerminal(order.status) ? (
                      <span className="text-muted">Estado final</span>
                    ) : (
                      <div className="order-status-control">
                        <select
                          value={order.status}
                          onChange={(e) =>
                            handleStatusChange(order.id, e.target.value as OrderStatus)
                          }
                          aria-label={`Estado de la orden ${String(order.id).slice(0, 8)}`}
                          className="order-status-select"
                        >
                          {ALL_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                        {rowErrors[order.id] && (
                          <span className="order-row-error" role="alert">
                            {rowErrors[order.id]}
                          </span>
                        )}
                      </div>
                    )}
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
