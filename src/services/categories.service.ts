import api from './api'
import type { Category } from '../types'

export const getCategories = () => api.get<Category[]>('/categories')

export const createCategory = (name: string) =>
  api.post<Category>('/categories', { name })
