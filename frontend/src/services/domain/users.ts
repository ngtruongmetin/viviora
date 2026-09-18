import { api } from '../api/client';
import type { PublicUserProfile } from '../../types/models';

export const usersApi = {
  get: (id: string) => api.get<{ data: PublicUserProfile }>(`/users/${id}`),
};
