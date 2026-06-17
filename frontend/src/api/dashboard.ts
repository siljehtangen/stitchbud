import type { DashboardStats } from '../types'
import { supabase, raiseError } from './client'
import { dashboardStatsSchema, safeParsed } from './schemas'

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const { data, error } = await supabase.rpc('get_dashboard_stats')
    raiseError(error, 'Failed to load dashboard stats')
    return safeParsed(dashboardStatsSchema, data, 'DashboardStats')
  },
}
