import { api } from '../api/client';
import type {
  ManagedUser,
  ManagedUserListResponse,
  Role,
  Specialization,
} from '../../types/models';

export type ManagedUserInput = {
  name: string;
  username: string;
  email?: string | null;
  password?: string | null;
  role: Role;
  gender?: 'Nam' | 'Nữ' | null;
  className?: string | null;
  specialization?: Specialization | null;
  avatarUrl?: string | null;
  bio?: string | null;
  isActive: boolean;
};

export const adminUsersApi = {
  list: (
    params: { page?: number; limit?: number; search?: string; role?: string; status?: string } = {},
  ) => api.get<ManagedUserListResponse>('/admin/users', { params }),
  get: (id: string) => api.get<{ data: ManagedUser }>(`/admin/users/${id}`),
  create: (data: ManagedUserInput) => api.post<{ data: ManagedUser }>('/admin/users', data),
  update: (id: string, data: ManagedUserInput) => {
    const updateData = Object.fromEntries(
      Object.entries(data).filter(([key]) => key !== 'username'),
    );
    return api.patch<{ data: ManagedUser }>(`/admin/users/${id}`, updateData);
  },
  remove: (id: string) => api.delete(`/admin/users/${id}`),
};
