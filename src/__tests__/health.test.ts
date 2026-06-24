import { vi } from 'vitest'

const mockGet = vi.fn()

vi.mock('../services/api', () => ({
  default: { get: mockGet, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
}))

// Import after mock is registered
const { checkHealth } = await import('../services/health.service')

describe('health.service.checkHealth', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it('calls GET /health and resolves with { status: "ok" }', async () => {
    mockGet.mockResolvedValue({ data: { status: 'ok' } })

    const res = await checkHealth()

    expect(mockGet).toHaveBeenCalledWith('/health')
    expect(res.data.status).toBe('ok')
  })

  it('rejects when the backend is unreachable', async () => {
    mockGet.mockRejectedValue(new Error('Network Error'))

    await expect(checkHealth()).rejects.toThrow('Network Error')
  })
})
