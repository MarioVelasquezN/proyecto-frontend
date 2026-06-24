import api from './api'
import type { AuthTokens, User } from '../types'

export interface LoginDto {
  email: string
  password: string
}

export interface RegisterDto {
  email: string
  password: string
  name: string
}

export const login = (dto: LoginDto) =>
  api.post<AuthTokens>('/auth/login', dto)

export const register = (dto: RegisterDto) =>
  api.post<AuthTokens>('/auth/register', dto)

export const refresh = (refreshToken: string) =>
  api.post<AuthTokens>('/auth/refresh', { refreshToken })

export const me = () => api.get<User>('/auth/me')

export const logout = () => {
  const refreshToken = localStorage.getItem('refreshToken')
  // Fire-and-forget: invalidate the refresh token on the server
  if (refreshToken) {
    api.post('/auth/logout', { refreshToken })?.catch(() => {})
  }
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}
