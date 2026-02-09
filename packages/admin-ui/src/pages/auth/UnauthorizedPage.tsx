import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-cyber-dark">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
        <p className="text-gray-400 mb-6">Admin access required.</p>
        <button onClick={() => { logout(); navigate('/login'); }} className="btn-secondary">Sign out</button>
      </div>
    </div>
  );
}
