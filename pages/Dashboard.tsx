
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, ChevronRight, PlusCircle, Mail, Check, X } from 'lucide-react';
import { useTrips } from '../contexts/TripContext';
import { useAuth } from '../contexts/AuthContext';
import { Invitation } from '../types';
import { subscribeToInvitations, acceptInvitation, declineInvitation } from '../services/invitationService';
import { Unsubscribe } from 'firebase/firestore';

const STATUS_OPTIONS = ['all', 'draft', 'active', 'completed', 'archived'] as const;

const Dashboard: React.FC = () => {
  const { trips, loading } = useTrips();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const unsubInvRef = useRef<Unsubscribe | null>(null);

  // Subscribe to pending invitations
  useEffect(() => {
    if (!user?.id) return;
    unsubInvRef.current = subscribeToInvitations(user.id, setInvitations);
    return () => {
      if (unsubInvRef.current) {
        unsubInvRef.current();
        unsubInvRef.current = null;
      }
    };
  }, [user?.id]);

  const handleAccept = async (id: string) => {
    setRespondingId(id);
    try {
      await acceptInvitation(id);
    } catch { /* real-time listener handles UI */ }
    setRespondingId(null);
  };

  const handleDecline = async (id: string) => {
    setRespondingId(id);
    try {
      await declineInvitation(id);
    } catch { /* real-time listener handles UI */ }
    setRespondingId(null);
  };

  const filteredTrips = statusFilter === 'all'
    ? trips
    : trips.filter(t => t.status === statusFilter);

  const completedCount = trips.filter(t => t.status === 'completed').length;
  const citiesCount = new Set(trips.map(t => t.destination)).size;

  const statusCounts: Record<string, number> = { all: trips.length };
  for (const t of trips) {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-slate-200 rounded-xl w-3/4 animate-pulse"></div>
        <div className="h-4 bg-slate-200 rounded-lg w-1/2 animate-pulse"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-slate-200 rounded-2xl animate-pulse"></div>
          <div className="h-24 bg-slate-200 rounded-2xl animate-pulse"></div>
        </div>
        <div className="h-64 bg-slate-200 rounded-3xl animate-pulse"></div>
        <div className="h-64 bg-slate-200 rounded-3xl animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <section>
        <h2 className="text-2xl font-bold text-slate-800">Welcome back, {user?.name || 'Traveler'}!</h2>
        <p className="text-slate-500 text-sm mt-1">Ready for your next journey?</p>
      </section>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center">
            <Mail size={14} className="mr-1.5" />
            Pending Invitations
          </h3>
          {invitations.map((inv) => (
            <div key={inv.id} className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100 flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">{inv.tripTitle}</p>
                <p className="text-xs text-slate-400 mt-0.5">From {inv.fromUserName}</p>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => handleAccept(inv.id)}
                  disabled={respondingId === inv.id}
                  className="p-2 bg-emerald-50 rounded-xl text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => handleDecline(inv.id)}
                  disabled={respondingId === inv.id}
                  className="p-2 bg-rose-50 rounded-xl text-rose-500 hover:bg-rose-100 transition-colors disabled:opacity-50"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg shadow-indigo-100">
          <p className="text-xs opacity-80 uppercase font-semibold">Trips Done</p>
          <p className="text-2xl font-bold">{completedCount}</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <p className="text-xs text-slate-400 uppercase font-semibold">Destinations</p>
          <p className="text-2xl font-bold text-slate-800">{citiesCount}</p>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="flex space-x-2 overflow-x-auto no-scrollbar py-1">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase whitespace-nowrap transition-all ${
              statusFilter === s
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                : 'bg-white text-slate-500 border border-slate-200'
            }`}
          >
            {s === 'all' ? 'All' : s} ({statusCounts[s] || 0})
          </button>
        ))}
      </div>

      {/* Trips */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Your Trips</h3>
          <span className="text-indigo-600 text-sm font-semibold">{filteredTrips.length} shown</span>
        </div>

        {trips.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
              <PlusCircle size={32} className="text-indigo-400" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-slate-800">No trips yet</p>
              <p className="text-sm text-slate-500">Create your first trip to get started!</p>
            </div>
            <button
              onClick={() => navigate('/add-trip')}
              className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-colors"
            >
              Plan a Trip
            </button>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center space-y-2">
            <p className="text-slate-500 font-medium text-sm">No {statusFilter} trips</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTrips.map((trip) => (
              <div
                key={trip.id}
                onClick={() => navigate(`/trip/${trip.id}`)}
                className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 active:scale-[0.98] transition-all cursor-pointer group"
              >
                <div className="h-40 relative">
                  <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-indigo-600 shadow-sm">
                    {trip.status}
                  </div>
                </div>
                <div className="p-5">
                  <h4 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    {trip.title}
                  </h4>
                  <div className="mt-3 flex flex-col space-y-2">
                    <div className="flex items-center text-slate-500 text-sm">
                      <MapPin size={16} className="mr-2 text-indigo-500" />
                      {trip.destination}
                    </div>
                    <div className="flex items-center text-slate-500 text-sm">
                      <Calendar size={16} className="mr-2 text-indigo-500" />
                      {trip.startDate} - {trip.endDate}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                    <div className="flex -space-x-2">
                      {trip.participants.map((p, idx) => (
                        <div key={idx} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                          {p.avatar ? (
                            <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <ChevronRight size={20} className="text-slate-300" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
