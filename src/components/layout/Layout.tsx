import type { ReactNode } from 'react'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { Footer } from './Footer'

interface LayoutProps {
  children: ReactNode
  hideSidebar?: boolean
}

export function Layout({ children, hideSidebar = false }: LayoutProps) {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-body">
        {!hideSidebar && <Sidebar />}
        <main className="app-main">{children}</main>
      </div>
      <Footer />
    </div>
  )
}
