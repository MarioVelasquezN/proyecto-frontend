import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { useAuth } from '../hooks/useAuth'
import { getOrders, getOrder } from '../services/orders.service'
import type { Order, OrderStatus } from '../types'

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  cancelled: 'Cancelado',
  delivered: 'Entregado',
}

export function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.role !== 'user') return
    setOrdersLoading(true)
    setOrdersError(null)
    getOrders()
      .then((res) => setOrders(res.data))
      .catch(() => setOrdersError('No se pudieron cargar tus pedidos.'))
      .finally(() => setOrdersLoading(false))
  }, [user])

  const handleToggleDetail = async (orderId: string) => {
    if (expandedId === orderId) {
      setExpandedId(null)
      return
    }
    const cached = orders.find((o) => o.id === orderId)
    if (cached?.items) {
      setExpandedId(orderId)
      return
    }
    setDetailLoading(true)
    setDetailError(null)
    try {
      const res = await getOrder(orderId)
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.data : o)))
      setExpandedId(orderId)
    } catch {
      setDetailError('No se pudo cargar el detalle de la orden.')
    } finally {
      setDetailLoading(false)
    }
  }

  if (!user) return null

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <Layout hideSidebar>
      <div className="page-profile">
        <h1>Mi perfil</h1>

        <div className="profile-card">
          <div className="profile-row">
            <span className="profile-label">Email</span>
            <span>{user.email}</span>
          </div>
          <div className="profile-row">
            <span className="profile-label">Rol</span>
            <span className={`role-badge role-badge--${user.role}`}>
              {user.role === 'admin' ? 'Administrador' : 'Usuario'}
            </span>
          </div>
        </div>

        {user.role === 'admin' && (
          <section className="profile-section profile-section--admin">
            <h2>Panel de administración</h2>
            <p>Tienes acceso completo para gestionar productos, categorías y órdenes.</p>
            <Link to="/admin" className="btn-primary">Ir al panel</Link>
          </section>
        )}

        {user.role === 'user' && (
          <section className="profile-section">
            <h2>Mis pedidos</h2>

            {ordersLoading && <p className="text-muted">Cargando pedidos…</p>}
            {ordersError && <p role="alert" className="admin-error">{ordersError}</p>}
            {detailError && <p role="alert" className="admin-error">{detailError}</p>}

            {!ordersLoading && orders.length === 0 && !ordersError && (
              <p className="text-muted">Aún no tienes pedidos realizados.</p>
            )}

            {orders.length > 0 && (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Fecha</th>
                      <th>Total</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <React.Fragment key={order.id}>
                        <tr>
                          <td className="order-id" title={order.id}>
                            {String(order.id).slice(0, 8).toUpperCase()}
                          </td>
                          <td className="order-date">
                            {new Date(order.createdAt).toLocaleDateString('es-MX')}
                          </td>
                          <td>${Number(order.total).toFixed(2)}</td>
                          <td>
                            <span className={`status-badge status-badge--${order.status}`}>
                              {STATUS_LABELS[order.status]}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn-link"
                              onClick={() => handleToggleDetail(order.id)}
                              disabled={detailLoading}
                            >
                              {expandedId === order.id ? 'Ocultar' : 'Ver detalle'}
                            </button>
                          </td>
                        </tr>
                        {expandedId === order.id && order.items && (
                          <tr>
                            <td colSpan={5} className="order-detail-cell">
                              <table className="order-items-table">
                                <thead>
                                  <tr>
                                    <th>Producto</th>
                                    <th>Precio unit.</th>
                                    <th>Cantidad</th>
                                    <th>Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {order.items.map((item) => (
                                    <tr key={item.productId}>
                                      <td>{item.product?.name ?? String(item.productId)}</td>
                                      <td>${Number(item.price).toFixed(2)}</td>
                                      <td>{item.quantity}</td>
                                      <td>${(Number(item.price) * item.quantity).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <button className="btn-danger" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </Layout>
  )
}
