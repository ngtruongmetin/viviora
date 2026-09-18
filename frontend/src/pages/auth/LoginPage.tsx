import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../auth/AuthContext';
import { AuthLayout } from '../../layouts/AuthLayout';

const schema = z.object({
  username: z.string().min(1, 'Nhập tên đăng nhập'),
  password: z.string().min(1, 'Nhập mật khẩu'),
});
type FormValue = z.infer<typeof schema>;

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValue>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  });
  if (user) return <Navigate to="/bang-tin" replace />;
  const onSubmit = async (value: FormValue) => {
    try {
      await login(value.username, value.password);
      navigate('/bang-tin');
    } catch {
      toast.error('Tên đăng nhập hoặc mật khẩu không đúng');
    }
  };
  return (
    <AuthLayout>
      <form className="login-card" onSubmit={handleSubmit(onSubmit)}>
        <Link className="auth-back" to="/"><ArrowRight size={15} /> VỀ TRANG CHỦ</Link>
        <div className="wordmark">VIVIORA</div>
        <span className="eyebrow">ĐỌC ĐỂ KHÁM PHÁ</span>
        <h1>ĐĂNG NHẬP</h1>
        <label>
          Tên đăng nhập
          <input autoComplete="username" {...register('username')} />
          {errors.username && <small className="error">{errors.username.message}</small>}
        </label>
        <label>
          Mật khẩu
          <input type="password" autoComplete="current-password" {...register('password')} />
          {errors.password && <small className="error">{errors.password.message}</small>}
        </label>
        <button className="button primary" disabled={isSubmitting}>
          VÀO CỘNG ĐỒNG
        </button>
        <p className="auth-switch">Chưa có tài khoản? <Link to="/dang-ky">ĐĂNG KÝ NGAY</Link></p>
      </form>
    </AuthLayout>
  );
}
