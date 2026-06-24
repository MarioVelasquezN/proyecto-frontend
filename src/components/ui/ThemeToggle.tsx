import { useContext } from 'react'
import { ThemeContext } from '../../contexts/ThemeContext'

export function ThemeToggle() {
  const ctx = useContext(ThemeContext)
  if (!ctx) return null
  return (
    <button
      onClick={ctx.toggle}
      aria-label="Toggle theme"
      style={{ cursor: 'pointer', background: 'none', border: '1px solid currentColor', borderRadius: 4, padding: '4px 10px' }}
    >
      {ctx.theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}
