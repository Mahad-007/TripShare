import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Ticket } from 'lucide-react';
import { joinByCode } from '../services/inviteCodeService';
import { useAuth } from '../contexts/AuthContext';
import { useTrips } from '../contexts/TripContext';
import { useToast } from '../hooks/useToast';
import { normalizeInviteCode, isValidInviteCode, INVITE_CODE_LENGTH } from '../utils/generateCode';

interface JoinByCodeModalProps {
  onClose: () => void;
  initialCode?: string;
}

const JoinByCodeModal: React.FC<JoinByCodeModalProps> = ({ onClose, initialCode }) => {
  const { user } = useAuth();
  const { trips } = useTrips();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [code, setCode] = useState(initialCode ? normalizeInviteCode(initialCode) : '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const normalized = normalizeInviteCode(code);
    if (!isValidInviteCode(normalized)) {
      setError(`Invite codes are ${INVITE_CODE_LENGTH} characters long.`);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const knownTripIds = trips.map((t) => t.id);
      const result = await joinByCode(normalized, user.id, knownTripIds);
      if (!result.ok) {
        setError(result.error || 'Failed to join trip.');
        setSubmitting(false);
        return;
      }
      if (result.alreadyMember) {
        showToast("You're already part of this trip", 'info');
      } else {
        showToast('Joined trip successfully', 'success');
      }
      onClose();
      if (result.tripId) navigate(`/trip/${result.tripId}`);
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800">Join by Invite Code</h3>
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-5 leading-relaxed">
          Enter the {INVITE_CODE_LENGTH}-character code shared with you to join the trip.
        </p>

        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="invite-code" className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
              Invite Code
            </label>
            <div className="relative">
              <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500" size={18} />
              <input
                id="invite-code"
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(normalizeInviteCode(e.target.value));
                  if (error) setError('');
                }}
                placeholder="ABC23XYZ"
                maxLength={INVITE_CODE_LENGTH}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="w-full bg-slate-50 border border-slate-100 py-3.5 pl-11 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all font-mono font-bold text-lg tracking-[0.3em] uppercase"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || code.length !== INVITE_CODE_LENGTH}
            className="w-full bg-teal-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-teal-100 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Joining…' : 'Join Trip'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinByCodeModal;
