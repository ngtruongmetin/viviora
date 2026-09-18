import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function RedirectByRole() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'ADMIN' ? '/quan-tri' : '/'} replace />;
}
