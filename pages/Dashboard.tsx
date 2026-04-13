
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, MapPin, ChevronRight, PlusCircle, Mail, Check, X, Ticket } from 'lucide-react';
import { useTrips } from '../contexts/TripContext';
import { useAuth } from '../contexts/AuthContext';
import { Invitation } from '../types';
import { subscribeToInvitations, acceptInvitation, declineInvitation } from '../services/invitationService';
import { useToast } from '../hooks/useToast';
import { Unsubscribe } from 'firebase/firestore';
import JoinByCodeModal from '../components/JoinByCodeModal';
import { normalizeInviteCode } from '../utils/generateCode';

const STATUS_OPTIONS = ['all', 'draft', 'active', 'completed', 'archived'] as const;

const Dashboard: React.FC = () => {
  const { trips, loading } = useTrips();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinInitialCode, setJoinInitialCode] = useState('');
  const [highlightedInvitationId, setHighlightedInvitationId] = useState<string | null>(null);
  const unsubInvRef = useRef<Unsubscribe | null>(null);
  const invitationRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

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

  // Handle ?join=<code> — open modal with prefilled code
  useEffect(() => {
    const joinCode = searchParams.get('join');
    if (joinCode) {
      setJoinInitialCode(normalizeInviteCode(joinCode));
      setJoinModalOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('join');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Handle ?invite=<id> — scroll matching invitation card into view
  useEffect(() => {
    const inviteId = searchParams.get('invite');
    if (!inviteId || invitations.length === 0) return;
    const match = invitations.find((inv) => inv.id === inviteId);
    if (!match) return;

    setHighlightedInvitationId(inviteId);
    const el = invitationRefs.current.get(inviteId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const next = new URLSearchParams(searchParams);
    next.delete('invite');
    setSearchParams(next, { replace: true });

    const timer = setTimeout(() => setHighlightedInvitationId(null), 3000);
    return () => clearTimeout(timer);
  }, [searchParams, invitations, setSearchParams]);

  const handleAccept = async (id: string) => {
    setRespondingId(id);
    try {
      await acceptInvitation(id);
      showToast('Invitation accepted', 'success');
    } catch {
      showToast('Failed to accept invitation', 'error');
    }
    setRespondingId(null);
  };

  const handleDecline = async (id: string) => {
    setRespondingId(id);
    try {
      await declineInvitation(id);
      showToast('Invitation declined', 'info');
    } catch {
      showToast('Failed to decline invitation', 'error');
    }
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

      {/* Invitations + Join by Code — header is always visible */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center">
            <Mail size={14} className="mr-1.5" />
            Invitations
          </h3>
          <button
            onClick={() => { setJoinInitialCode(''); setJoinModalOpen(true); }}
            className="flex items-center space-x-1.5 bg-teal-600 text-white px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-md shadow-teal-100 hover:bg-teal-700 transition-colors"
          >
            <Ticket size={12} />
            <span>Join by Code</span>
          </button>
        </div>

        {invitations.length > 0 ? (
          invitations.map((inv) => (
            <div
              key={inv.id}
              ref={(el) => { invitationRefs.current.set(inv.id, el); }}
              className={`bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between transition-all ${
                highlightedInvitationId === inv.id
                  ? 'border-2 border-teal-400 shadow-lg shadow-teal-100'
                  : 'border border-teal-100'
              }`}
            >
              <div className="min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">{inv.tripTitle}</p>
                <p className="text-xs text-slate-400 mt-0.5">From {inv.fromUserName}</p>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => handleAccept(inv.id)}
                  disabled={respondingId === inv.id}
                  className="p-2 bg-emerald-50 rounded-xl text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  aria-label="Accept invitation"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => handleDecline(inv.id)}
                  disabled={respondingId === inv.id}
                  className="p-2 bg-rose-50 rounded-xl text-rose-500 hover:bg-rose-100 transition-colors disabled:opacity-50"
                  aria-label="Decline invitation"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-4 rounded-2xl border border-dashed border-slate-200 text-center">
            <p className="text-xs text-slate-400">No pending invitations. Got an invite code? Tap <span className="font-bold text-teal-600">Join by Code</span>.</p>
          </div>
        )}
      </section>

      {joinModalOpen && (
        <JoinByCodeModal
          initialCode={joinInitialCode}
          onClose={() => setJoinModalOpen(false)}
        />
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-teal-600 text-white p-4 rounded-2xl shadow-lg shadow-teal-100">
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
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-100'
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
          <span className="text-teal-600 text-sm font-semibold">{filteredTrips.length} shown</span>
        </div>

        {trips.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center">
              <PlusCircle size={32} className="text-teal-400" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-slate-800">No trips yet</p>
              <p className="text-sm text-slate-500">Create your first trip to get started!</p>
            </div>
            <button
              onClick={() => navigate('/add-trip')}
              className="bg-teal-600 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-teal-100 hover:bg-teal-700 transition-colors"
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
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-teal-600 shadow-sm">
                    {trip.status}
                  </div>
                </div>
                <div className="p-5">
                  <h4 className="text-lg font-bold text-slate-800 group-hover:text-teal-600 transition-colors">
                    {trip.title}
                  </h4>
                  <div className="mt-3 flex flex-col space-y-2">
                    <div className="flex items-center text-slate-500 text-sm">
                      <MapPin size={16} className="mr-2 text-teal-500" />
                      {trip.destination}
                    </div>
                    <div className="flex items-center text-slate-500 text-sm">
                      <Calendar size={16} className="mr-2 text-teal-500" />
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
                            <div className="w-full h-full bg-teal-100 flex items-center justify-center text-teal-600 text-xs font-bold">
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
