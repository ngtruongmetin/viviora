import { api } from '../api/client';

export type Achievement = { id: string; code: string; name: string; condition_text: string; exp_reward: number; sort_order: number; is_supported: boolean; support_note?: string | null; unlocked_count: number };
export type AchievementProgress = { stats: { total: number; supported: number; unsupported: number; unlocks: number }; top: { id: string; name: string; username: string; exp: number }[] };
export const achievementsApi = {
  list: () => api.get<{ items: Achievement[] }>('/admin/achievements'),
  progress: () => api.get<{ data: AchievementProgress }>('/admin/achievements/progress'),
  reset: () => api.post('/admin/achievements/reset'),
};
