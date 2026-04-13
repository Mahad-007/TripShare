import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, AlignLeft, Users } from 'lucide-react';
import { User, Expense, ExpenseFormData } from '../types';
import { addExpense, updateExpense } from '../services/expenseService';
import { useToast } from '../hooks/useToast';

interface AddExpenseModalProps {
  tripId: string;
  participants: User[];
  currentUserId: string;
  onClose: () => void;
  editingExpense?: Expense;
  participantIds?: string[];
  tripTitle?: string;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  tripId,
  participants,
  currentUserId,
  onClose,
  editingExpense,
  participantIds,
  tripTitle,
}) => {
  const isEdit = !!editingExpense;
  const { showToast } = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: editingExpense?.amount || 0,
    description: editingExpense?.description || '',
    payerId: editingExpense?.payerId || currentUserId,
    date: editingExpense?.date || new Date().toISOString().split('T')[0],
    participants: editingExpense?.participants || participants.map((p) => p.id),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.amount || formData.amount <= 0 || !Number.isFinite(formData.amount)) {
      newErrors.amount = 'Amount must be greater than 0.';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required.';
    } else if (formData.description.trim().length > 200) {
      newErrors.description = 'Description must be under 200 characters.';
    }
    if (!formData.date) {
      newErrors.date = 'Date is required.';
    }
    if (formData.participants.length === 0) {
      newErrors.participants = 'Select at least one participant.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const cleanData: ExpenseFormData = {
        ...formData,
        amount: Math.round(formData.amount),
        description: formData.description.trim(),
      };
      if (isEdit) {
        await updateExpense(tripId, editingExpense!.id, {
          amount: cleanData.amount,
          description: cleanData.description,
          payerId: cleanData.payerId,
          date: cleanData.date,
          participants: cleanData.participants,
        }, currentUserId, participantIds, tripTitle);
        showToast('Expense updated', 'success');
      } else {
        await addExpense(tripId, cleanData, currentUserId, participantIds, tripTitle);
        showToast('Expense added', 'success');
      }
      onClose();
    } catch {
      const msg = isEdit ? 'Failed to update expense.' : 'Failed to add expense.';
      setSubmitError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleParticipant = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      participants: prev.participants.includes(id)
        ? prev.participants.filter((p) => p !== id)
        : [...prev.participants, id],
    }));
    if (errors.participants) setErrors((prev) => ({ ...prev, participants: '' }));
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800">
            {isEdit ? 'Edit Expense' : 'Add Expense'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {submitError && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-sm font-medium">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Amount */}
          <div className="space-y-2">
            <label htmlFor="expense-amount" className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Amount (Rs.)</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500" size={18} />
              <input
                id="expense-amount"
                type="number"
                min="1"
                step="1"
                value={formData.amount || ''}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, amount: Number(e.target.value) }));
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
                }}
                placeholder="0"
                className={`w-full bg-slate-50 border py-3.5 pl-11 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all font-semibold ${errors.amount ? 'border-rose-300' : 'border-slate-100'}`}
              />
            </div>
            {errors.amount && <p className="text-rose-500 text-xs font-medium ml-1">{errors.amount}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="expense-description" className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Description</label>
            <div className="relative">
              <AlignLeft className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500" size={18} />
              <input
                id="expense-description"
                type="text"
                maxLength={200}
                value={formData.description}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, description: e.target.value }));
                  if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
                }}
                placeholder="What was this for?"
                className={`w-full bg-slate-50 border py-3.5 pl-11 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all font-semibold ${errors.description ? 'border-rose-300' : 'border-slate-100'}`}
              />
            </div>
            {errors.description && <p className="text-rose-500 text-xs font-medium ml-1">{errors.description}</p>}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <label htmlFor="expense-date" className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Date</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500" size={18} />
              <input
                id="expense-date"
                type="date"
                value={formData.date}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, date: e.target.value }));
                  if (errors.date) setErrors((prev) => ({ ...prev, date: '' }));
                }}
                className={`w-full bg-slate-50 border py-3.5 pl-11 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all font-semibold text-sm ${errors.date ? 'border-rose-300' : 'border-slate-100'}`}
              />
            </div>
            {errors.date && <p className="text-rose-500 text-xs font-medium ml-1">{errors.date}</p>}
          </div>

          {/* Payer */}
          <div className="space-y-2">
            <label htmlFor="expense-payer" className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Paid By</label>
            <select
              id="expense-payer"
              value={formData.payerId}
              onChange={(e) => setFormData((prev) => ({ ...prev, payerId: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-100 py-3.5 px-4 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all font-semibold text-sm"
            >
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id === currentUserId ? `${p.name} (You)` : p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Split Among */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center">
              <Users size={14} className="mr-1.5" />
              Split Among
            </label>
            <div className="space-y-2">
              {participants.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center space-x-3 p-3 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.participants.includes(p.id)}
                    onChange={() => toggleParticipant(p.id)}
                    className="w-5 h-5 rounded-lg border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-sm flex-shrink-0">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {p.id === currentUserId ? `${p.name} (You)` : p.name}
                  </span>
                </label>
              ))}
            </div>
            {errors.participants && <p className="text-rose-500 text-xs font-medium ml-1">{errors.participants}</p>}
          </div>

          {/* Per-person split preview */}
          {formData.amount > 0 && formData.participants.length > 0 && (
            <div className="bg-teal-50 rounded-2xl p-4 text-center">
              <p className="text-xs text-teal-400 font-bold uppercase tracking-widest">Per Person</p>
              <p className="text-2xl font-black text-teal-600 mt-1">
                Rs. {Math.round(formData.amount / formData.participants.length).toLocaleString()}
              </p>
              <p className="text-[10px] text-teal-400 font-medium mt-1">
                Split equally among {formData.participants.length} {formData.participants.length === 1 ? 'person' : 'people'}
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-teal-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-teal-100 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
            ) : (
              <span>{isEdit ? 'Save Changes' : 'Add Expense'}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddExpenseModal;
