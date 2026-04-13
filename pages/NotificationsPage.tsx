import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Mail, DollarSign, Image, UserPlus, CheckCheck, ChevronLeft, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notificationService';
import { Notification, NotificationType } from '../types';

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'invitation':
    case 'invitation_accepted':
      return { icon: Mail, color: 'text-teal-600', bg: 'bg-teal-50' };
    case 'expense_added':
    case 'expense_updated':
    case 'expense_deleted':
      return { icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' };
    case 'media_uploaded':
      return { icon: Image, color: 'text-violet-600', bg: 'bg-violet-50' };
    case 'new_follower':
      return { icon: UserPlus, color: 'text-rose-600', bg: 'bg-rose-50' };
    default:
      return { icon: Bell, color: 'text-slate-600', bg: 'bg-slate-50' };
  }
}

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!user) return;
    unsubRef.current = subscribeToNotifications(user.id, (notifs) => {
      setNotifications(notifs);
      setLoading(false);
    });
    return () => { unsubRef.current?.(); };
  }, [user]);

  const handleTap = async (notif: Notification) => {
    if (!user) return;
    if (!notif.read) {
      markNotificationRead(user.id, notif.id).catch(() => {});
    }
    if (notif.data?.tripId) {
      navigate(`/trip/${notif.data.tripId}`);
    } else {
      navigate('/');
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.id).catch(() => {});
  };

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors" aria-label="Go back">
          <ChevronLeft size={20} className="text-slate-600" />
        </button>
        <h2 className="font-bold text-slate-800">Notifications</h2>
        <button
          onClick={handleMarkAllRead}
          disabled={!hasUnread}
          className="p-2 -mr-2 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-30"
          title="Mark all read"
          aria-label="Mark all as read"
        >
          <CheckCheck size={20} className="text-teal-600" />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <Loader size={28} className="text-teal-600 animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && notifications.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
            <Bell size={32} />
          </div>
          <div className="text-center space-y-1">
            <p className="font-bold text-slate-800">No notifications yet</p>
            <p className="text-sm text-slate-500">When something happens, you'll see it here.</p>
          </div>
        </div>
      )}

      {/* List */}
      {!loading && notifications.length > 0 && (
        <div className="divide-y divide-slate-100">
          {notifications.map((notif) => {
            const { icon: Icon, color, bg } = getNotificationIcon(notif.type);
            return (
              <button
                key={notif.id}
                onClick={() => handleTap(notif)}
                className={`w-full flex items-start space-x-3 p-4 text-left hover:bg-slate-50 transition-colors ${
                  !notif.read ? 'bg-teal-50/40' : ''
                }`}
              >
                <div className={`${bg} ${color} p-2.5 rounded-xl flex-shrink-0 mt-0.5`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${!notif.read ? 'font-bold text-slate-800' : 'text-slate-600'}`}>
                    {notif.message}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">{timeAgo(notif.createdAt)}</p>
                </div>
                {!notif.read && (
                  <div className="w-2.5 h-2.5 bg-teal-600 rounded-full flex-shrink-0 mt-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
