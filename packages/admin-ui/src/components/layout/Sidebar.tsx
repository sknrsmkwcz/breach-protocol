import { NavLink } from 'react-router-dom';
import { HomeIcon, CreditCardIcon, UserGroupIcon, BeakerIcon, XMarkIcon } from '@heroicons/react/24/outline';

const nav = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Cards', href: '/cards', icon: CreditCardIcon },
  { name: 'Factions', href: '/factions', icon: UserGroupIcon },
  { name: 'Simulations', href: '/simulations', icon: BeakerIcon },
];

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-cyber-darker border-r border-gray-800 transform transition-transform lg:translate-x-0 lg:static ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
          <span className="font-bold text-white">BP Admin</span>
          <button onClick={onClose} className="lg:hidden p-2"><XMarkIcon className="w-5 h-5 text-gray-400" /></button>
        </div>
        <nav className="p-4 space-y-1">
          {nav.map(item => (
            <NavLink key={item.name} to={item.href} onClick={onClose}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${isActive ? 'bg-cyber-purple/20 text-cyber-purple' : 'text-gray-400 hover:bg-gray-800'}`}>
              <item.icon className="w-5 h-5" />{item.name}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
