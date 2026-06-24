import { useEffect, useState } from 'react'
import { getProducts } from '../../services/products.service'
import { getOrders } from '../../services/orders.service'

interface Metrics {
  productCount: number
  totalStock: number
  pendingOrders: number
  totalOrders: number
}

interface MetricCardProps {
  label: string
  value: number | null
  testId: string
  loading: boolean
}

function MetricCard({ label, value, testId, loading }: MetricCardProps) {
  return (
    <div className="metric-card">
      <span className="metric-card__label">{label}</span>
      <span className="metric-card__value" data-testid={testId}>
        {loading ? '…' : value ?? '—'}
      </span>
    </div>
  )
}

export function DashboardTab() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getProducts({ limit: 100 }), getOrders()])
      .then(([productsRes, ordersRes]) => {
        const products = productsRes.data
        const orders = ordersRes.data
        setMetrics({
          productCount: products.meta.total,
          totalStock: products.data.reduce((sum, p) => sum + p.stock, 0),
          pendingOrders: orders.filter((o) => o.status === 'pending').length,
          totalOrders: orders.length,
        })
      })
      .catch(() => setError('No se pudieron cargar las métricas.'))
      .finally(() => setLoading(false))
  }, [])

  if (error) {
    return <p role="alert" className="admin-error">{error}</p>
  }

  return (
    <div className="dashboard">
      <h2 className="admin-section-title">Resumen</h2>
      <div className="dashboard-grid">
        <MetricCard label="Total Productos" value={metrics?.productCount ?? null} testId="metric-products" loading={loading} />
        <MetricCard label="Unidades en Stock" value={metrics?.totalStock ?? null} testId="metric-stock" loading={loading} />
        <MetricCard label="Órdenes Pendientes" value={metrics?.pendingOrders ?? null} testId="metric-pending" loading={loading} />
        <MetricCard label="Total Órdenes" value={metrics?.totalOrders ?? null} testId="metric-orders" loading={loading} />
      </div>
    </div>
  )
}
