import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./client', () => ({
  supabase: { rpc: vi.fn() },
  raiseError: (error: { message: string } | null) => {
    if (error) throw new Error(error.message)
  },
}))

import { dashboardApi } from './dashboard'
import { supabase } from './client'

const rpc = vi.mocked(supabase.rpc)

beforeEach(() => vi.clearAllMocks())

describe('dashboardApi.getStats', () => {
  it('calls get_dashboard_stats and returns parsed stats', async () => {
    rpc.mockResolvedValue({
      data: {
        projects: { KNITTING: 1, CROCHET: 2, SEWING: 0 },
        library: { YARN: 3, FABRIC: 1, KNITTING_NEEDLE: 0, CROCHET_HOOK: 2 },
        friends: 4,
        sentRequests: 1,
        incomingRequests: 2,
      },
      error: null,
    } as never)

    const stats = await dashboardApi.getStats()

    expect(rpc).toHaveBeenCalledWith('get_dashboard_stats')
    expect(stats.projects.KNITTING).toBe(1)
    expect(stats.library.YARN).toBe(3)
    expect(stats.friends).toBe(4)
    expect(stats.incomingRequests).toBe(2)
  })

  it('throws when the RPC errors', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'stats unavailable' } } as never)
    await expect(dashboardApi.getStats()).rejects.toThrow('stats unavailable')
  })
})
