
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, Bell, Shield, HelpCircle, ChevronRight, Grid, Bookmark, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { icon: Bell, label: 'Notifications', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { icon: Shield, label: 'Trust & Safety', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: Users, label: 'Travel Circle', color: 'text-violet-600', bg: 'bg-violet-50' },
    { icon: HelpCircle, label: 'Get Help', color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  if (!user) return null;

  return (
    <div className="p-6 space-y-8">
      {/* Profile Card */}
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="relative">
          <div className="w-28 h-28 rounded-full border-4 border-white shadow-xl overflow-hidden ring-4 ring-indigo-50">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-3xl font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="absolute bottom-1 right-1 bg-indigo-600 text-white p-2 rounded-full border-2 border-white shadow-lg cursor-pointer">
            <Settings size={14} />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{user.name}</h2>
          <p className="text-slate-400 text-sm font-medium">{user.email}</p>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Grid, label: 'My Trips', count: '12' },
          { icon: Bookmark, label: 'Saved', count: '48' },
          { icon: Users, label: 'Followers', count: '1.2k' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center space-y-1 shadow-sm">
            <stat.icon size={18} className="text-indigo-600 mb-1" />
            <span className="text-lg font-bold text-slate-800">{stat.count}</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Menu List */}
      <section className="space-y-4">
        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest px-2">Account Hub</h3>
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              className={`w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors ${
                idx !== menuItems.length - 1 ? 'border-b border-slate-50' : ''
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className={`${item.bg} ${item.color} p-2.5 rounded-xl`}>
                  <item.icon size={20} />
                </div>
                <span className="font-bold text-slate-700">{item.label}</span>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
          ))}
        </div>
      </section>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full bg-rose-50 text-rose-600 font-bold py-4 rounded-3xl flex items-center justify-center space-x-2 active:scale-[0.98] transition-all border border-rose-100/50"
      >
        <LogOut size={20} />
        <span>Log Out</span>
      </button>

      {/* Version Info */}
      <p className="text-center text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em] pt-4">
        TripShare Global • Build 1042
      </p>
    </div>
  );
};

export default ProfilePage;
