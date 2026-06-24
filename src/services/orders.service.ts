import api from './api'
import type { Order, OrderStatus } from '../types'

export function getOrders(params?: { status?: OrderStatus }) {
  return api.get<Order[]>('/orders', { params })
}

export function updateOrderStatus(id: string, status: OrderStatus) {
  return api.patch<Order>(`/orders/${id}/status`, { status })
}
