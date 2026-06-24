import api from './api'

export interface CheckoutResult {
  id: string
  status: string
  total: number
  createdAt: string
  items: Array<{ productId: string; quantity: number; price: number }>
}

export function postCheckout(couponCode?: string) {
  return api.post<CheckoutResult>('/checkout', couponCode ? { couponCode } : {})
}
