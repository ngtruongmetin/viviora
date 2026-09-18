import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function RequireStaff({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user?.role === 'ADMIN' || user?.role === 'TEACHER' ? <>{children}</> : <Navigate to="/" replace />;
}
