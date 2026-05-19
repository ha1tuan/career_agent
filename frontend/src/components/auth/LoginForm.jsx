import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import Input from '../ui/Input';
import Button from '../ui/Button';

export default function LoginForm() {
  const navigate = useNavigate();
  const { login, loading } = useAuthStore();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.email.trim()) errs.email = 'Vui lòng nhập email';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Email không hợp lệ';
    if (!form.password) errs.password = 'Vui lòng nhập mật khẩu';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      await login(form);
      toast.success('Đăng nhập thành công!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((err) => ({ ...err, [field]: '' }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={form.email}
        onChange={handleChange('email')}
        error={errors.email}
        autoComplete="email"
      />
      <Input
        label="Mật khẩu"
        type="password"
        placeholder="••••••••"
        value={form.password}
        onChange={handleChange('password')}
        error={errors.password}
        autoComplete="current-password"
      />

      <Button type="submit" className="w-full" size="lg" loading={loading}>
        Đăng nhập
      </Button>

      <p className="text-center text-sm text-slate-400">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
          Đăng ký ngay
        </Link>
      </p>
    </form>
  );
}
