import type { Friend, FriendRequest, Project } from '../types'
import { normalizeProject } from '../projectOverviewMedia'
import { supabase, raiseError } from './client'
import { friendSchema, friendRequestSchema, projectSchema, safeParsed } from './schemas'
import { rowToProject, type DbProject } from './mappers'
import { withSignedProjectMedia, withSignedProjectsMedia } from './media'
import { z } from 'zod'

export const friendsApi = {
  getFriends: async (): Promise<Friend[]> => {
    const { data, error } = await supabase.rpc('get_friends')
    raiseError(error, 'Failed to load friends')
    return safeParsed(z.array(friendSchema), data ?? [], 'Friend[]')
  },

  getPendingRequests: async (): Promise<FriendRequest[]> => {
    const { data, error } = await supabase.rpc('get_pending_requests')
    raiseError(error, 'Failed to load friend requests')
    return safeParsed(z.array(friendRequestSchema), data ?? [], 'FriendRequest[]')
  },

  sendRequest: async (email: string): Promise<Friend> => {
    const { data, error } = await supabase.rpc('send_friend_request', { target_email: email })
    raiseError(error, 'Failed to send friend request')
    return safeParsed(friendSchema, data, 'Friend')
  },

  acceptRequest: async (friendshipId: number): Promise<Friend> => {
    const { data, error } = await supabase.rpc('accept_friend_request', { p_friendship_id: friendshipId })
    raiseError(error, 'Failed to accept friend request')
    return safeParsed(friendSchema, data, 'Friend')
  },

  remove: async (friendshipId: number): Promise<void> => {
    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
    raiseError(error, 'Failed to remove friend')
  },

  getFriendProjects: async (friendUserId: string): Promise<Project[]> => {
    const { data, error } = await supabase.rpc('get_friend_projects', { friend_user_id: friendUserId })
    raiseError(error, 'Failed to load friend projects')
    const mapped = ((data as DbProject[]) ?? []).map(rowToProject)
    const projects = safeParsed(z.array(projectSchema), mapped, 'Project[]').map(normalizeProject)
    return withSignedProjectsMedia(projects)
  },

  getFriendProject: async (friendUserId: string, projectId: number): Promise<Project> => {
    const { data, error } = await supabase.rpc('get_friend_project', {
      friend_user_id: friendUserId,
      p_project_id: projectId,
    })
    raiseError(error, 'Failed to load friend project')
    return withSignedProjectMedia(
      normalizeProject(safeParsed(projectSchema, rowToProject(data as DbProject), 'Project'))
    )
  },
}
