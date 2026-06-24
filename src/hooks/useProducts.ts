import { useEffect, useState } from 'react'
import { getProducts, type GetProductsParams } from '../services/products.service'
import type { Product } from '../types'

const LIMIT = 12

export interface UseProductsOptions {
  page: number
  search: string
  categoryId?: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export interface UseProductsResult {
  products: Product[]
  total: number
  totalPages: number
  loading: boolean
  error: string | null
}

export function useProducts(options: UseProductsOptions): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { page, search, categoryId, sortBy, sortOrder } = options

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const params: GetProductsParams = {
      page,
      limit: LIMIT,
      sortBy: sortBy || undefined,
      sortOrder,
    }
    if (search.trim()) params.search = search.trim()
    if (categoryId) params.categoryId = Number(categoryId)

    getProducts(params)
      .then((res) => {
        if (!cancelled) {
          setProducts(res.data.data)
          setTotal(res.data.total)
        }
      })
      .catch(() => {
        if (!cancelled) setError('Error al cargar productos. Intente de nuevo.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [page, search, categoryId, sortBy, sortOrder])

  return { products, total, totalPages: Math.ceil(total / LIMIT) || 0, loading, error }
}
