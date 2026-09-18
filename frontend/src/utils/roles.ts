import type { Role } from '../types/models';
export const roleLabel = (role: Role) =>
  role === 'ADMIN' ? 'Thủ thư' : role === 'TEACHER' ? 'Giáo viên' : 'Học sinh';
