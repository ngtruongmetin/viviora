import { api } from '../api/client';
import type { CurrentUser } from '../../types/models';

export type ProfileUpdate = {
  name: string;
  email: string | null;
  bio: string | null;
  gender: string | null;
};

export const profileApi = {
  get: () => api.get<{ data: CurrentUser }>('/profile'),
  update: (data: ProfileUpdate) => api.patch<{ data: CurrentUser }>('/profile', data),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post<{ data: CurrentUser }>('/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  removeAvatar: () => api.delete<{ data: CurrentUser }>('/profile/avatar'),
  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => api.post('/profile/password', data),
};
