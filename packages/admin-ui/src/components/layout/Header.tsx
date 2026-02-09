import { Bars3Icon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="h-16 bg-cyber-darker border-b border-gray-800 flex items-center justify-between px-4">
      <button onClick={onMenuClick} className="lg:hidden p-2"><Bars3Icon className="w-6 h-6 text-gray-400" /></button>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-300">{user?.username}</span>
        <button onClick={() => { logout(); navigate('/login'); }} className="text-sm text-gray-400 hover:text-white">Logout</button>
      </div>
    </header>
  );
}
