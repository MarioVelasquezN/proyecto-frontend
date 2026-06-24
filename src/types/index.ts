export type Role = 'user' | 'admin'

export interface User {
  sub: string
  email: string
  role: Role
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface Category {
  id: number
  name: string
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  stock: number
  categoryId: number | null
  category: Category | null
  createdAt: string
}

export interface PaginatedProducts {
  data: Product[]
  total: number
  page: number
  limit: number
}

export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'delivered'

export interface Order {
  id: string
  status: OrderStatus
  total: number
  createdAt: string
}

export interface CreateProductDto {
  name: string
  description?: string
  price: number
  stock: number
  categoryId?: number
}

export type UpdateProductDto = Partial<CreateProductDto>

export interface CartItem {
  productId: string
  quantity: number
  product: Pick<Product, 'id' | 'name' | 'price' | 'stock'>
}

export interface Cart {
  id: string
  items: CartItem[]
}
