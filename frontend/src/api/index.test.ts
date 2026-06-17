import { describe, it, expect, vi, beforeEach } from 'vitest'

const { invoke } = vi.hoisted(() => ({
  invoke: vi.fn(),
}))

vi.mock('./client', () => ({
  supabase: { functions: { invoke } },
}))

import { accountApi } from './index'

beforeEach(() => vi.clearAllMocks())

describe('accountApi.deleteAccount', () => {
  it('invokes delete-account with the delete action', async () => {
    invoke.mockResolvedValue({ error: null })

    await accountApi.deleteAccount()

    expect(invoke).toHaveBeenCalledWith('delete-account', { body: { action: 'delete' } })
  })

  it('throws when the edge function errors', async () => {
    invoke.mockResolvedValue({ error: { message: 'not allowed' } })
    await expect(accountApi.deleteAccount()).rejects.toThrow('not allowed')
  })
})

describe('accountApi.resetData', () => {
  it('invokes delete-account with the reset action', async () => {
    invoke.mockResolvedValue({ error: null })

    await accountApi.resetData()

    expect(invoke).toHaveBeenCalledWith('delete-account', { body: { action: 'reset' } })
  })

  it('uses a fallback message when the error has no message', async () => {
    invoke.mockResolvedValue({ error: { message: '' } })
    await expect(accountApi.resetData()).rejects.toThrow('Failed to reset data')
  })
})
