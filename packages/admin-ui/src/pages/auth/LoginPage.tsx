import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const { register, handleSubmit } = useForm<{ username: string; password: string }>();

  const onSubmit = async (data: { username: string; password: string }) => {
    setError('');
    try {
      await login(data.username, data.password);
      navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cyber-dark p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Breach Protocol Admin</h1>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
          {error && <div className="p-3 bg-cyber-red/10 border border-cyber-red/20 rounded-lg text-cyber-red text-sm">{error}</div>}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Username</label>
            <input {...register('username')} className="input" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Password</label>
            <input type="password" {...register('password')} className="input" />
          </div>
          <button type="submit" className="btn-primary w-full">Sign in</button>
        </form>
      </div>
    </div>
  );
}
