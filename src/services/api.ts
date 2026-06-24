import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Track in-flight refresh so concurrent 401s queue instead of racing
let isRefreshing = false
let pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

function flushQueue(token: string | null, err: unknown = null) {
  pendingQueue.forEach(({ resolve, reject }) => (token ? resolve(token) : reject(err)))
  pendingQueue = []
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalConfig: any = error?.config

    const is401 = error?.response?.status === 401
    const alreadyRetried = originalConfig?._retry === true
    const isRefreshEndpoint = (originalConfig?.url as string | undefined)?.includes('/auth/refresh')

    if (!is401 || alreadyRetried || isRefreshEndpoint) {
      return Promise.reject(error)
    }

    // Queue this request while a refresh is already in progress
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            originalConfig.headers['Authorization'] = `Bearer ${token}`
            resolve(api(originalConfig))
          },
          reject,
        })
      })
    }

    originalConfig._retry = true
    isRefreshing = true

    const storedRefresh = localStorage.getItem('refreshToken')

    if (!storedRefresh) {
      localStorage.removeItem('accessToken')
      flushQueue(null, error)
      isRefreshing = false
      window.dispatchEvent(new CustomEvent('auth:logout-required'))
      return Promise.reject(error)
    }

    try {
      // Raw axios call avoids our interceptors and prevents an infinite loop
      const { data } = await axios.post('/api/auth/refresh', { refreshToken: storedRefresh })
      localStorage.setItem('accessToken', data.accessToken)
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)

      flushQueue(data.accessToken)
      originalConfig.headers['Authorization'] = `Bearer ${data.accessToken}`
      return api(originalConfig)
    } catch (refreshErr) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      flushQueue(null, refreshErr)
      window.dispatchEvent(new CustomEvent('auth:logout-required'))
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  },
)

export default api
