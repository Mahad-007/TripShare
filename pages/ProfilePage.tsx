import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, Bell, Shield, HelpCircle, ChevronRight, Grid, Camera, CheckCircle, Users, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTrips } from '../contexts/TripContext';
import { uploadAvatar } from '../services/storageService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getFollowerCount, getFollowingCount } from '../services/socialService';

const ProfilePage: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const { trips } = useTrips();
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  // Edit name state
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Photo count
  const [photoCount, setPhotoCount] = useState(0);
  const [loadingPhotos, setLoadingPhotos] = useState(true);

  // Circle count
  const [circleCount, setCircleCount] = useState(0);

  useEffect(() => {
    if (!trips.length) {
      setLoadingPhotos(false);
      return;
    }
    let cancelled = false;
    const fetchPhotoCounts = async () => {
      try {
        const counts = await Promise.all(
          trips.map(async (trip) => {
            const snap = await getDocs(collection(db, 'trips', trip.id, 'media'));
            return snap.size;
          })
        );
        if (!cancelled) setPhotoCount(counts.reduce((a, b) => a + b, 0));
      } catch {
        // Best-effort
      } finally {
        if (!cancelled) setLoadingPhotos(false);
      }
    };
    fetchPhotoCounts();
    return () => { cancelled = true; };
  }, [trips]);

  // Fetch circle counts
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([getFollowerCount(user.id), getFollowingCount(user.id)])
      .then(([followers, following]) => { if (!cancelled) setCircleCount(followers + following); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  const completedCount = trips.filter((t) => t.status === 'completed').length;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    setAvatarError('');
    try {
      const url = await uploadAvatar(file, user.id);
      await updateProfile({ photoURL: url });
    } catch (err: unknown) {
      setAvatarError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleStartEditName = () => {
    if (!user) return;
    setNewName(user.name);
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setSavingName(true);
    try {
      await updateProfile({ displayName: newName.trim() });
      setEditingName(false);
    } catch {
      // Keep editing open on error
    } finally {
      setSavingName(false);
    }
  };

  const handleCancelEditName = () => {
    setEditingName(false);
    setNewName('');
  };

  const menuItems = [
    { icon: Bell, label: 'Notifications', color: 'text-indigo-600', bg: 'bg-indigo-50', action: () => navigate('/notifications') },
    { icon: Shield, label: 'Trust & Safety', color: 'text-emerald-600', bg: 'bg-emerald-50', action: () => navigate('/settings') },
    { icon: Users, label: 'Travel Circle', color: 'text-violet-600', bg: 'bg-violet-50', action: () => navigate('/travel-circle') },
    { icon: HelpCircle, label: 'Get Help', color: 'text-amber-600', bg: 'bg-amber-50', disabled: true },
  ];

  const stats = [
    { icon: Grid, label: 'My Trips', count: String(trips.length) },
    { icon: Camera, label: 'Photos', count: loadingPhotos ? '...' : String(photoCount) },
    { icon: CheckCircle, label: 'Completed', count: String(completedCount) },
    { icon: Users, label: 'Circle', count: String(circleCount) },
  ];

  if (!user) return null;

  return (
    <div className="p-6 space-y-8">
      {/* Profile Card */}
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="relative">
          <div className="w-28 h-28 rounded-full border-4 border-white shadow-xl overflow-hidden ring-4 ring-indigo-50">
            {uploadingAvatar ? (
              <div className="w-full h-full bg-indigo-50 flex items-center justify-center">
                <Loader size={28} className="text-indigo-600 animate-spin" />
              </div>
            ) : user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-3xl font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <button
            onClick={handleAvatarClick}
            disabled={uploadingAvatar}
            className="absolute bottom-1 right-1 bg-indigo-600 text-white p-2 rounded-full border-2 border-white shadow-lg cursor-pointer hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Camera size={14} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
        {avatarError && <p className="text-rose-500 text-xs font-medium">{avatarError}</p>}
        <div>
          {editingName ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-white border border-slate-200 py-2 px-3 rounded-xl text-center font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') handleCancelEditName(); }}
              />
              <button
                onClick={handleSaveName}
                disabled={savingName || !newName.trim()}
                className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
              >
                {savingName ? '...' : 'Save'}
              </button>
              <button
                onClick={handleCancelEditName}
                disabled={savingName}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                Cancel
              </button>
            </div>
          ) : (
            <h2
              className="text-2xl font-bold text-slate-800 cursor-pointer hover:text-indigo-600 transition-colors"
              onClick={handleStartEditName}
              title="Click to edit name"
            >
              {user.name}
            </h2>
          )}
          <p className="text-slate-400 text-sm font-medium">{user.email}</p>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map((stat, i) => (
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
              onClick={item.action}
              disabled={item.disabled}
              className={`w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors ${
                idx !== menuItems.length - 1 ? 'border-b border-slate-50' : ''
              } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center space-x-4">
                <div className={`${item.bg} ${item.color} p-2.5 rounded-xl`}>
                  <item.icon size={20} />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-700">{item.label}</span>
                  {item.disabled && (
                    <span className="text-[9px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-bold uppercase">Soon</span>
                  )}
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
          ))}
        </div>
      </section>

      {/* Settings Link */}
      <button
        onClick={() => navigate('/settings')}
        className="w-full bg-white text-slate-700 font-bold py-4 rounded-3xl flex items-center justify-center space-x-2 border border-slate-100 shadow-sm hover:bg-slate-50 transition-colors"
      >
        <Settings size={20} />
        <span>Settings</span>
      </button>

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
        TripShare Global • v1.0
      </p>
    </div>
  );
};

export default ProfilePage;
