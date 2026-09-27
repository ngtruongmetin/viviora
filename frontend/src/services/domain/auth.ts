import { api } from '../api/client';
import type { CurrentUser } from '../../types/models';
import type { AchievementEventPayload } from '../../components/achievements/AchievementCelebrationProvider';

export type RegisterInput = {
  name: string;
  username: string;
  email?: string | null;
  password: string;
  confirmPassword: string;
  role: 'STUDENT' | 'TEACHER';
  className?: string | null;
  specialization?: string | null;
  gender?: 'Nam' | 'Nữ' | null;
};

export const authApi = {
  current: () => api.get<{ data: CurrentUser | null }>('/auth/me'),
  login: (username: string, password: string) =>
    api.post<{ data: CurrentUser & { achievementEvents?: AchievementEventPayload } }>(
      '/auth/login',
      { username, password },
    ),
  register: (data: RegisterInput) =>
    api.post<{ data: CurrentUser & { achievementEvents?: AchievementEventPayload } }>(
      '/auth/register',
      data,
    ),
  logout: () => api.post('/auth/logout'),
};
