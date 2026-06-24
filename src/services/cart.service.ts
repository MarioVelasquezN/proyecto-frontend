import api from './api'
import type { Cart } from '../types'

export function getCart() {
  return api.get<Cart>('/cart')
}

export function addToCart(productId: string, quantity: number) {
  return api.post<Cart>('/cart/add', { productId, quantity })
}

export function removeFromCart(productId: string) {
  return api.delete<Cart>('/cart/remove', { data: { productId } })
}
