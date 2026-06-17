import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./client', () => ({
  supabase: { rpc: vi.fn(), from: vi.fn() },
  raiseError: (error: { message: string } | null) => {
    if (error) throw new Error(error.message)
  },
}))

import { friendsApi } from './friends'
import { supabase } from './client'

const rpc = vi.mocked(supabase.rpc)
const from = vi.mocked(supabase.from)

beforeEach(() => vi.clearAllMocks())

describe('friendsApi.getPendingRequests', () => {
  it('calls get_pending_requests and returns the rows', async () => {
    rpc.mockResolvedValue({
      data: [
        {
          friendshipId: 2,
          requesterId: 'u3',
          requesterDisplayName: 'Three',
          requesterEmail: 'three@test.com',
          createdAt: 50,
        },
      ],
      error: null,
    } as never)

    const requests = await friendsApi.getPendingRequests()

    expect(rpc).toHaveBeenCalledWith('get_pending_requests')
    expect(requests).toHaveLength(1)
    expect(requests[0].requesterEmail).toBe('three@test.com')
  })
})

describe('friendsApi.getSentRequests', () => {
  it('calls get_sent_requests and returns the rows', async () => {
    rpc.mockResolvedValue({
      data: [
        {
          friendshipId: 4,
          recipientId: 'u4',
          recipientDisplayName: null,
          recipientEmail: 'four@test.com',
          createdAt: 100,
        },
      ],
      error: null,
    } as never)

    const requests = await friendsApi.getSentRequests()

    expect(rpc).toHaveBeenCalledWith('get_sent_requests')
    expect(requests).toHaveLength(1)
    expect(requests[0].recipientEmail).toBe('four@test.com')
  })
})

describe('friendsApi.getFriends', () => {
  it('calls the get_friends RPC and returns the rows', async () => {
    rpc.mockResolvedValue({
      data: [{ friendshipId: 1, userId: 'u2', displayName: 'Two', email: 'two@test.com' }],
      error: null,
    } as never)

    const friends = await friendsApi.getFriends()

    expect(rpc).toHaveBeenCalledWith('get_friends')
    expect(friends).toHaveLength(1)
    expect(friends[0].email).toBe('two@test.com')
  })

  it('throws when the RPC errors', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'nope' } } as never)
    await expect(friendsApi.getFriends()).rejects.toThrow('nope')
  })
})

describe('friendsApi.sendRequest', () => {
  it('passes the target email to send_friend_request', async () => {
    rpc.mockResolvedValue({
      data: {
        status: 'PENDING',
        friendshipId: 5,
        userId: 'u2',
        displayName: null,
        email: 'two@test.com',
      },
      error: null,
    } as never)

    await friendsApi.sendRequest('two@test.com')

    expect(rpc).toHaveBeenCalledWith('send_friend_request', { target_email: 'two@test.com' })
  })

  it('surfaces the database error message (e.g. self-add)', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'You cannot add yourself as a friend.' },
    } as never)
    await expect(friendsApi.sendRequest('me@test.com')).rejects.toThrow('cannot add yourself')
  })
})

describe('friendsApi.acceptRequest', () => {
  it('passes the friendship id to accept_friend_request', async () => {
    rpc.mockResolvedValue({
      data: { friendshipId: 7, userId: 'u1', displayName: 'One', email: 'one@test.com' },
      error: null,
    } as never)

    await friendsApi.acceptRequest(7)

    expect(rpc).toHaveBeenCalledWith('accept_friend_request', { p_friendship_id: 7 })
  })
})

describe('friendsApi.getFriendProjects', () => {
  it('maps RPC rows into camelCase projects', async () => {
    rpc.mockResolvedValue({
      data: [
        {
          id: 1,
          user_id: 'u2',
          name: 'Hat',
          category: 'KNITTING',
          is_public: true,
          created_at: 1,
          updated_at: 2,
          notes: '',
          recipe_text: '',
          pinterest_board_urls: '[]',
          craft_details: '{}',
        },
      ],
      error: null,
    } as never)

    const projects = await friendsApi.getFriendProjects('u2')

    expect(rpc).toHaveBeenCalledWith('get_friend_projects', { friend_user_id: 'u2' })
    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe('Hat')
  })
})

describe('friendsApi.getFriendProject', () => {
  it('maps the snake_case RPC payload into a camelCase project', async () => {
    rpc.mockResolvedValue({
      data: {
        id: 3,
        user_id: 'u2',
        name: 'Shared',
        category: 'KNITTING',
        is_public: true,
        created_at: 1,
        updated_at: 2,
        notes: '',
        recipe_text: '',
        pinterest_board_urls: '[]',
        craft_details: '{}',
      },
      error: null,
    } as never)

    const project = await friendsApi.getFriendProject('u2', 3)

    expect(rpc).toHaveBeenCalledWith('get_friend_project', { friend_user_id: 'u2', p_project_id: 3 })
    expect(project.name).toBe('Shared')
    expect(project.isPublic).toBe(true)
  })
})

describe('friendsApi.remove', () => {
  it('deletes the friendship row by id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const del = vi.fn().mockReturnValue({ eq })
    from.mockReturnValue({ delete: del } as never)

    await friendsApi.remove(9)

    expect(from).toHaveBeenCalledWith('friendships')
    expect(del).toHaveBeenCalled()
    expect(eq).toHaveBeenCalledWith('id', 9)
  })
})
