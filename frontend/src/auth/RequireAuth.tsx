import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="state-card">Đang kiểm tra phiên đăng nhập...</div>;
  return user ? <>{children}</> : <Navigate to="/dang-nhap" replace />;
}
