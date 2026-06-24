import api from './api'

export interface HealthResponse {
  status: string
}

export const checkHealth = () => api.get<HealthResponse>('/health')
