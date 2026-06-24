import api from './api'
import type { PaginatedProducts, Product, CreateProductDto, UpdateProductDto } from '../types'

export interface GetProductsParams {
  page?: number
  limit?: number
  search?: string
  categoryId?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export const getProducts = (params?: GetProductsParams) =>
  api.get<PaginatedProducts>('/products', { params })

export const createProduct = (dto: CreateProductDto) =>
  api.post<Product>('/products', dto)

export const updateProduct = (id: string, dto: UpdateProductDto) =>
  api.patch<Product>(`/products/${id}`, dto)

export const deleteProduct = (id: string) =>
  api.delete<void>(`/products/${id}`)
