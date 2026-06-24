import api from './api'
import type { Coupon } from '../types'

export function getCoupons() {
  return api.get<Coupon[]>('/coupons')
}
