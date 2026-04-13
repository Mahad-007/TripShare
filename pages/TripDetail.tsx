
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles, MapPin, Calendar, CheckCircle2, Pencil, Trash2, UserPlus, X, Users, Download, Copy, Share2, Ticket, Mail } from 'lucide-react';
import { getSmartItinerary } from '../services/geminiService';
import { useTrips } from '../contexts/TripContext';
import { useAuth } from '../contexts/AuthContext';
import { getUserRole, removeParticipant } from '../services/tripService';
import { sendInvitation } from '../services/invitationService';
import { ensureInviteCode } from '../services/inviteCodeService';
import { subscribeToExpenses } from '../services/expenseService';
import { generateTripReportPDF } from '../services/reportService';
import { Trip, Expense } from '../types';
import { useToast } from '../hooks/useToast';

const TripDetail: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { getTripById, refreshTrip, deleteTrip } = useTrips();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [trip, setTrip] = useState<Trip | null | undefined>(undefined);
  const [itinerary, setItinerary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Expenses for report export
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Participant management
  const [inviteMode, setInviteMode] = useState<'email' | 'code'>('email');
  const [participantEmail, setParticipantEmail] = useState('');
  const [participantError, setParticipantError] = useState('');
  const [participantSuccess, setParticipantSuccess] = useState('');
  const [participantWarning, setParticipantWarning] = useState('');
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeError, setCodeError] = useState('');

  useEffect(() => {
    if (!tripId) return;
    const cached = getTripById(tripId);
    if (cached) {
      setTrip(cached);
    } else {
      refreshTrip(tripId).then((fetched) => setTrip(fetched ?? null));
    }
  }, [tripId, getTripById, refreshTrip]);

  // Subscribe to expenses for report export
  useEffect(() => {
    if (!tripId) return;
    const unsub = subscribeToExpenses(tripId, (newExpenses) => {
      setExpenses(newExpenses);
    });
    return unsub;
  }, [tripId]);

  // Keep trip in sync with context updates
  const contextTrip = getTripById(tripId || '');
  useEffect(() => {
    if (contextTrip) setTrip(contextTrip);
  }, [contextTrip]);

  if (trip === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse" />
            <div className="ml-3 h-5 w-32 bg-slate-200 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
            <div className="aspect-video bg-slate-200 animate-pulse" />
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <div className="h-6 w-3/4 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-4 w-full bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-4 w-1/2 bg-slate-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <p className="text-slate-500 font-medium">Trip not found</p>
        <button onClick={() => navigate('/')} className="text-teal-600 font-bold hover:underline">Go back home</button>
      </div>
    );
  }

  const role = user ? getUserRole(trip, user.id) : 'none';
  const isOwner = role === 'owner';

  // Compute duration
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const durationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const generateItinerary = async () => {
    setIsLoading(true);
    const result = await getSmartItinerary(trip.destination, Math.min(durationDays, 7));
    setItinerary(result);
    setIsLoading(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTrip(trip.id);
      showToast('Trip deleted', 'success');
      navigate('/');
    } catch {
      showToast('Failed to delete trip', 'error');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantEmail.trim() || !user) return;
    setAddingParticipant(true);
    setParticipantError('');
    setParticipantSuccess('');
    setParticipantWarning('');
    try {
      const result = await sendInvitation(trip.id, trip.title, user.id, user.name, participantEmail.trim(), trip.destination);
      if (result.success) {
        if (result.emailSent) {
          setParticipantSuccess('Invitation sent — email delivered.');
        } else {
          setParticipantWarning("Invitation saved, but the email couldn't be delivered. Share the invite code below instead.");
        }
        setParticipantEmail('');
      } else {
        setParticipantError(result.error || 'Failed to send invitation.');
      }
    } catch {
      setParticipantError('Failed to send invitation.');
      showToast('Failed to send invitation', 'error');
    } finally {
      setAddingParticipant(false);
    }
  };

  const handleSwitchInviteMode = async (mode: 'email' | 'code') => {
    setInviteMode(mode);
    setParticipantError('');
    setParticipantSuccess('');
    setParticipantWarning('');
    setCodeError('');
    if (mode === 'code' && trip && user && !trip.inviteCode && isOwner) {
      setGeneratingCode(true);
      try {
        await ensureInviteCode(trip.id, user.id);
      } catch (err) {
        setCodeError(err instanceof Error ? err.message : 'Failed to generate invite code.');
      } finally {
        setGeneratingCode(false);
      }
    }
  };

  const handleCopyCode = async () => {
    if (!trip?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(trip.inviteCode);
      showToast('Code copied to clipboard', 'success');
    } catch {
      showToast('Failed to copy code', 'error');
    }
  };

  const handleShareCode = async () => {
    if (!trip?.inviteCode) return;
    const url = `${window.location.origin}/?join=${encodeURIComponent(trip.inviteCode)}`;
    const shareText = `Join my trip "${trip.title}" on TripShare. Use invite code ${trip.inviteCode} or tap: ${url}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `Join "${trip.title}"`, text: shareText, url });
        return;
      } catch {
        // user cancelled or share unsupported — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      showToast('Share text copied to clipboard', 'success');
    } catch {
      showToast('Unable to share', 'error');
    }
  };

  const handleExportReport = async () => {
    if (trip && expenses.length > 0) {
      try {
        await generateTripReportPDF(trip, expenses, trip.participants);
        showToast('PDF report downloaded', 'success');
      } catch (err) {
        console.error('[export report]', err);
        showToast('Failed to generate report', 'error');
      }
    }
  };

  const handleRemoveParticipant = async (userId: string) => {
    try {
      await removeParticipant(trip.id, userId);
      showToast('Participant removed', 'success');
    } catch {
      showToast('Failed to remove participant', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center min-w-0">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-slate-100 rounded-full flex-shrink-0" aria-label="Go back">
            <ChevronLeft size={24} />
          </button>
          <h2 className="ml-2 font-bold text-lg truncate">{trip.title}</h2>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={handleExportReport}
            disabled={expenses.length === 0}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"
            title={expenses.length === 0 ? 'No expenses to export' : 'Export PDF report'}
            aria-label="Export PDF report"
          >
            <Download size={18} />
          </button>
          {isOwner && (
            <>
              <button onClick={() => navigate(`/edit-trip/${trip.id}`)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500" aria-label="Edit trip">
                <Pencil size={18} />
              </button>
              <button onClick={() => setShowDeleteConfirm(true)} className="p-2 hover:bg-rose-50 rounded-full text-rose-500" aria-label="Delete trip">
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Delete Trip?</h3>
            <p className="text-slate-500 text-sm">This action cannot be undone. All trip data will be permanently deleted.</p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 py-3 rounded-2xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-2xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Header Info */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-800">{trip.destination}</h3>
            <p className="text-slate-500 mt-1">{trip.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
            <div className="flex items-center text-sm font-medium text-slate-600">
              <Calendar size={16} className="mr-2 text-teal-500" />
              {durationDays} {durationDays === 1 ? 'Day' : 'Days'}
            </div>
            <div className="flex items-center text-sm font-medium text-slate-600">
              <CheckCircle2 size={16} className="mr-2 text-green-500" />
              Blockchain Verified
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800 flex items-center">
              <Users size={18} className="mr-2 text-teal-600" />
              Participants ({trip.participants.length})
            </h4>
          </div>

          <div className="space-y-3">
            {trip.participants.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border border-slate-100">
                    {p.avatar ? (
                      <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">
                      {p.name}
                      {p.id === trip.ownerId && <span className="ml-2 text-[10px] bg-teal-100 text-teal-600 px-2 py-0.5 rounded-full font-bold uppercase">Owner</span>}
                    </p>
                    <p className="text-slate-400 text-xs">{p.email}</p>
                  </div>
                </div>
                {isOwner && p.id !== trip.ownerId && (
                  <button
                    onClick={() => handleRemoveParticipant(p.id)}
                    className="p-2 hover:bg-rose-50 rounded-full text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add participant (owner only) */}
          {isOwner && (
            <div className="pt-3 border-t border-slate-50 space-y-3">
              {/* Invite method selector */}
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleSwitchInviteMode('email')}
                  className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                    inviteMode === 'email'
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-100'
                      : 'bg-slate-50 text-slate-500 border border-slate-100'
                  }`}
                >
                  <Mail size={14} />
                  <span>By Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchInviteMode('code')}
                  className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                    inviteMode === 'code'
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-100'
                      : 'bg-slate-50 text-slate-500 border border-slate-100'
                  }`}
                >
                  <Ticket size={14} />
                  <span>By Code</span>
                </button>
              </div>

              {inviteMode === 'email' ? (
                <form onSubmit={handleAddParticipant}>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="email"
                        value={participantEmail}
                        onChange={(e) => {
                          setParticipantEmail(e.target.value);
                          setParticipantError('');
                          setParticipantSuccess('');
                          setParticipantWarning('');
                        }}
                        placeholder="Add by email..."
                        className="w-full bg-slate-50 border border-slate-100 py-2.5 pl-10 pr-4 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-sm font-medium"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={addingParticipant || !participantEmail.trim()}
                      className="bg-teal-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
                    >
                      {addingParticipant ? '...' : 'Invite'}
                    </button>
                  </div>
                  {participantError && <p className="text-rose-500 text-xs font-medium mt-2">{participantError}</p>}
                  {participantSuccess && <p className="text-emerald-500 text-xs font-medium mt-2">{participantSuccess}</p>}
                  {participantWarning && <p className="text-amber-600 text-xs font-medium mt-2">{participantWarning}</p>}
                </form>
              ) : (
                <div className="space-y-3">
                  {codeError && (
                    <p className="text-rose-500 text-xs font-medium">{codeError}</p>
                  )}
                  {generatingCode && !trip.inviteCode ? (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-5 text-center text-xs font-medium text-slate-500">
                      Generating invite code…
                    </div>
                  ) : trip.inviteCode ? (
                    <>
                      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 rounded-2xl p-4">
                        <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-1.5">Invite Code</p>
                        <p className="font-mono font-bold text-2xl text-slate-800 tracking-[0.3em] select-all">
                          {trip.inviteCode}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          className="flex-1 flex items-center justify-center space-x-1.5 bg-slate-50 border border-slate-100 text-slate-600 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-100 transition-colors"
                        >
                          <Copy size={14} />
                          <span>Copy</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleShareCode}
                          className="flex-1 flex items-center justify-center space-x-1.5 bg-teal-600 text-white py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-teal-700 transition-colors"
                        >
                          <Share2 size={14} />
                          <span>Share</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Anyone with this code can join this trip. Keep it safe.
                      </p>
                    </>
                  ) : (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-5 text-center text-xs font-medium text-slate-500">
                      No invite code yet. Tap retry to generate one.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Gemini AI Assistant */}
        <div className="bg-gradient-to-br from-teal-600 to-cyan-700 rounded-3xl p-6 text-white shadow-xl shadow-teal-100 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-3">
              <Sparkles size={20} className="text-teal-200" />
              <h4 className="font-bold text-lg">AI Trip Assistant</h4>
            </div>
            <p className="text-teal-100 text-sm mb-4 leading-relaxed">
              Let Gemini help you plan the perfect itinerary for {trip.destination}.
            </p>
            {!itinerary && !isLoading && (
              <button
                onClick={generateItinerary}
                className="bg-white text-teal-600 px-6 py-2.5 rounded-full font-bold text-sm shadow-lg hover:bg-teal-50 transition-colors"
              >
                Generate Itinerary
              </button>
            )}
            {isLoading && (
              <div className="flex items-center space-x-3 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                <span>Drafting your adventure...</span>
              </div>
            )}
          </div>
          <div className="absolute top-0 right-0 -mr-16 -mt-16 opacity-10 pointer-events-none">
            <svg width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="100" fill="white" /></svg>
          </div>
        </div>

        {/* Itinerary Display */}
        {itinerary && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <MapPin size={20} className="mr-2 text-teal-600" />
              Suggested Itinerary
            </h4>
            <div className="whitespace-pre-line text-slate-600 text-sm leading-relaxed">
              {itinerary}
            </div>
            <button
              onClick={() => setItinerary(null)}
              className="mt-6 text-slate-400 text-sm hover:text-teal-600 transition-colors"
            >
              Clear and start over
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripDetail;
