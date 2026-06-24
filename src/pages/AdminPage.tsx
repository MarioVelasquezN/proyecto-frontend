import { useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { useAuth } from '../hooks/useAuth'
import { DashboardTab } from '../components/admin/DashboardTab'
import { ProductsTab } from '../components/admin/ProductsTab'
import { CategoriesTab } from '../components/admin/CategoriesTab'
import { OrdersTab } from '../components/admin/OrdersTab'
import { CouponsTab } from '../components/admin/CouponsTab'

type Tab = 'dashboard' | 'products' | 'categories' | 'orders' | 'coupons'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'products', label: 'Productos' },
  { id: 'categories', label: 'Categorías' },
  { id: 'orders', label: 'Órdenes' },
  { id: 'coupons', label: 'Cupones' },
]

export function AdminPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  return (
    <Layout hideSidebar>
      <div className="page-admin">
        <div className="admin-header">
          <h1>Panel de Administración</h1>
          <p className="text-muted">
            Sesión como <strong>{user?.email}</strong>
            <span className="role-badge role-badge--admin" style={{ marginLeft: '0.5rem' }}>Admin</span>
          </p>
        </div>

        <nav className="admin-tabs" aria-label="Secciones del panel">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`admin-tab${activeTab === tab.id ? ' admin-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="admin-content">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'products' && <ProductsTab />}
          {activeTab === 'categories' && <CategoriesTab />}
          {activeTab === 'orders' && <OrdersTab />}
          {activeTab === 'coupons' && <CouponsTab />}
        </div>
      </div>
    </Layout>
  )
}
