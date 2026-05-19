import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import Input from '../ui/Input';
import Button from '../ui/Button';

export default function RegisterForm() {
  const navigate = useNavigate();
  const { register, loading } = useAuthStore();

  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = 'Vui lòng nhập họ tên';
    if (!form.email.trim()) errs.email = 'Vui lòng nhập email';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Email không hợp lệ';
    if (!form.password) errs.password = 'Vui lòng nhập mật khẩu';
    else if (form.password.length < 6) errs.password = 'Mật khẩu tối thiểu 6 ký tự';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      await register(form);
      toast.success('Đăng ký thành công!');
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
        label="Họ và tên"
        type="text"
        placeholder="Nguyễn Văn A"
        value={form.full_name}
        onChange={handleChange('full_name')}
        error={errors.full_name}
        autoComplete="name"
      />
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
        placeholder="Tối thiểu 6 ký tự"
        value={form.password}
        onChange={handleChange('password')}
        error={errors.password}
        autoComplete="new-password"
      />

      <Button type="submit" className="w-full" size="lg" loading={loading}>
        Tạo tài khoản
      </Button>

      <p className="text-center text-sm text-slate-400">
        Đã có tài khoản?{' '}
        <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
