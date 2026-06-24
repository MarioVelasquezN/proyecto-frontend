import { useEffect, useState } from 'react'
import { getCategories } from '../services/categories.service'
import type { Category } from '../types'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getCategories()
      .then((res) => { if (!cancelled) setCategories(res.data) })
      .catch(() => { if (!cancelled) setError('No se pudieron cargar las categorías') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { categories, loading, error }
}
