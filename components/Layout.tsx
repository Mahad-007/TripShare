
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, Compass, Receipt, Image, User, PlusCircle, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import { subscribeToUnreadCount } from '../services/notificationService';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useBackButton } from '../hooks/useBackButton';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/explore', icon: Compass, label: 'Explore' },
  { path: '/expenses', icon: Receipt, label: 'Split' },
  { path: '/gallery', icon: Image, label: 'Vault' },
  { path: '/profile', icon: User, label: 'You' },
];

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const unsubRef = useRef<(() => void) | null>(null);
  const isOnline = useOnlineStatus();
  useBackButton();

  useEffect(() => {
    if (!user) return;
    unsubRef.current = subscribeToUnreadCount(user.id, setUnreadCount);
    return () => { unsubRef.current?.(); };
  }, [user]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 w-full relative overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 pt-2 pb-4 flex justify-between items-center safe-top">
        <Logo size={30} showText />
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={20} className="text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[9px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/add-trip')}
            className="bg-teal-600 p-2 rounded-full text-white shadow-lg shadow-teal-200 active:scale-90 transition-transform"
            aria-label="Create new trip"
          >
            <PlusCircle size={20} />
          </button>
        </div>
      </header>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-xs font-bold text-center py-1.5">
          You're offline — changes will sync when reconnected
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-28 no-scrollbar">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 w-full bg-white border-t border-slate-200 px-4 pt-3 pb-2 flex justify-between items-center z-50 safe-bottom">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center space-y-1 transition-all duration-300 ${
                isActive ? 'text-teal-600 scale-110' : 'text-slate-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} fill={isActive ? "currentColor" : "none"} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
