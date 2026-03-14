
import React, { useState, useEffect, useRef } from 'react';
import { Expense } from '../types';
import { Plus, PieChart as ChartIcon, Sparkles, User as UserIcon, Trash2, Pencil, Receipt, Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { summarizeExpenses } from '../services/geminiService';
import { useTrips } from '../contexts/TripContext';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToExpenses, deleteExpense } from '../services/expenseService';
import { getUserRole } from '../services/tripService';
import { exportExpensesCSV } from '../services/reportService';
import AddExpenseModal from '../components/AddExpenseModal';
import { Unsubscribe } from 'firebase/firestore';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f97316', '#14b8a6'];

const ExpensesPage: React.FC = () => {
  const { trips } = useTrips();
  const { user } = useAuth();
  const [selectedTripId, setSelectedTripId] = useState<string>('');

  const activeTripId = selectedTripId || trips[0]?.id || '';
  const selectedTrip = trips.find(t => t.id === activeTripId);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Date filter
  const [dateFilter, setDateFilter] = useState('');

  const currentUserId = user?.id || '';
  const unsubRef = useRef<Unsubscribe | null>(null);

  // Firestore subscription
  useEffect(() => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    if (!activeTripId) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    unsubRef.current = subscribeToExpenses(activeTripId, (newExpenses) => {
      setExpenses(newExpenses);
      setLoading(false);
    });

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [activeTripId]);

  // Permission helpers
  const role = selectedTrip && user ? getUserRole(selectedTrip, user.id) : 'none';
  const canEditExpense = (exp: Expense): boolean => {
    return role === 'owner' || exp.payerId === currentUserId || exp.createdBy === currentUserId;
  };

  if (!selectedTrip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <p className="text-slate-500 font-medium">No trips yet. Create one to start tracking expenses.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-200 border-t-indigo-600"></div>
      </div>
    );
  }

  const handleTripChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTripId(e.target.value);
    setAiSummary(null);
    setDateFilter('');
  };

  // Date filtering
  const filteredExpenses = dateFilter
    ? expenses.filter(e => e.date.startsWith(dateFilter))
    : expenses;

  const calculateBalances = () => {
    const balances: Record<string, number> = {};
    selectedTrip.participants.forEach(p => balances[p.id] = 0);
    filteredExpenses.forEach(exp => {
      const share = exp.amount / exp.participants.length;
      balances[exp.payerId] += exp.amount;
      exp.participants.forEach(pId => {
        balances[pId] -= share;
      });
    });
    return balances;
  };

  const balances = calculateBalances();
  const userBalance = balances[currentUserId] || 0;
  const totalSpent = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  const chartData = filteredExpenses.reduce((acc: any[], exp) => {
    const existing = acc.find(item => item.name === exp.description);
    if (existing) {
      existing.value += exp.amount;
    } else {
      acc.push({ name: exp.description, value: exp.amount });
    }
    return acc;
  }, []);

  const handleSummarize = async () => {
    setIsSummarizing(true);
    const participantNames = selectedTrip.participants.map(p => p.name);
    const summary = await summarizeExpenses(filteredExpenses, participantNames);
    setAiSummary(summary);
    setIsSummarizing(false);
  };

  const handleExportCSV = () => {
    if (selectedTrip) {
      exportExpensesCSV(selectedTrip, filteredExpenses, selectedTrip.participants);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    setDeleting(true);
    try {
      await deleteExpense(activeTripId, expenseId, currentUserId, selectedTrip?.participantIds, selectedTrip?.title);
    } catch {
      // Error — the real-time listener will keep showing the expense
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(null);
    }
  };

  const getPayerName = (payerId: string): string => {
    if (payerId === currentUserId) return 'You paid';
    const payer = selectedTrip.participants.find(p => p.id === payerId);
    return payer ? `${payer.name} paid` : 'Someone paid';
  };

  const hasExpenses = filteredExpenses.length > 0;

  return (
    <div className="p-6 space-y-6 pb-32">
      <section>
        <h2 className="text-2xl font-bold text-slate-800">Split Expenses</h2>
        <p className="text-slate-500 text-sm mt-1">{selectedTrip.title} • {selectedTrip.participants.length} Members</p>
      </section>

      {/* Trip Selector */}
      {trips.length > 1 && (
        <select
          value={activeTripId}
          onChange={handleTripChange}
          className="w-full bg-white border border-slate-200 py-3 px-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold text-sm text-slate-700"
        >
          {trips.map(t => (
            <option key={t.id} value={t.id}>{t.title} — {t.destination}</option>
          ))}
        </select>
      )}

      {hasExpenses ? (
        <>
          {/* Overview Card */}
          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Total Group Spend</p>
                <h3 className="text-3xl font-black text-slate-800 mt-1">Rs. {totalSpent.toLocaleString()}</h3>
              </div>
              <div className="bg-indigo-50 p-3 rounded-2xl">
                <ChartIcon className="text-indigo-600" size={24} />
              </div>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Your Personal Balance */}
          <div className={`p-6 rounded-[32px] border flex flex-col items-center text-center space-y-2 ${
            userBalance >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
          }`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${userBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              Your Net Position
            </p>
            <h4 className={`text-3xl font-black ${userBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {userBalance >= 0 ? '+' : ''}Rs. {Math.abs(userBalance).toLocaleString()}
            </h4>
            <p className="text-xs font-medium text-slate-500">
              {userBalance >= 0 ? 'Others owe you money' : 'You owe money to the group'}
            </p>
          </div>
        </>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
            <Receipt size={32} className="text-slate-300" />
          </div>
          <p className="text-slate-500 font-medium text-sm">No expenses recorded yet</p>
          <p className="text-slate-400 text-xs">Tap + to add your first expense</p>
        </div>
      )}

      {/* AI Insights Section */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[32px] p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-3">
            <Sparkles size={20} className="text-indigo-200" />
            <h4 className="font-bold text-lg">AI Expense Analyst</h4>
          </div>

          {aiSummary ? (
            <div className="text-indigo-50 text-xs leading-relaxed space-y-2">
              <p className="whitespace-pre-line">{aiSummary}</p>
              <button
                onClick={() => setAiSummary(null)}
                className="text-[10px] uppercase font-bold tracking-widest text-white/60 pt-2 hover:text-white"
              >
                Recalculate
              </button>
            </div>
          ) : (
            <>
              <p className="text-indigo-100 text-sm mb-4">
                Get a smart breakdown of who owes what and spending habits.
              </p>
              <button
                onClick={handleSummarize}
                disabled={isSummarizing || !hasExpenses}
                className="bg-white text-indigo-600 px-6 py-2.5 rounded-full font-bold text-xs shadow-lg hover:bg-indigo-50 disabled:opacity-50 transition-all"
              >
                {isSummarizing ? 'Analyzing...' : 'Generate Summary'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Settlement Advice */}
      {hasExpenses && (
        <section className="space-y-4">
          <h4 className="text-lg font-bold text-slate-800 px-1">Settlement List</h4>
          <div className="space-y-3">
            {selectedTrip.participants.filter(p => p.id !== currentUserId).map(participant => {
              const bal = balances[participant.id];
              return (
                <div key={participant.id} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                      {participant.avatar ? (
                        <img src={participant.avatar} alt={participant.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                          {participant.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{participant.name}</p>
                      <p className={`text-[10px] font-bold uppercase ${bal >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {bal >= 0 ? 'Is owed' : 'Owes'} money
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-black text-sm ${bal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      Rs. {Math.abs(bal).toFixed(0)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent History */}
      {hasExpenses && (
        <section className="space-y-4 pb-12">
          <div className="flex justify-between items-center px-1">
            <h4 className="text-lg font-bold text-slate-800">Recent Transactions</h4>
            <div className="flex items-center space-x-2">
              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="text-indigo-600 text-[10px] font-bold uppercase"
                >
                  Clear
                </button>
              )}
              <input
                type="month"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-white border border-slate-100 py-2 px-3 rounded-xl text-xs font-medium text-slate-500 outline-none"
              />
              <button
                onClick={handleExportCSV}
                className="p-2 bg-white rounded-xl border border-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                title="Export CSV"
              >
                <Download size={16} />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredExpenses.map((expense) => (
              <div key={expense.id} className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-100 flex items-center justify-between">
                <div
                  className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                  onClick={() => { if (canEditExpense(expense)) setEditingExpense(expense); }}
                >
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl flex-shrink-0">
                    {expense.description.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{expense.description}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {expense.date} • {getPayerName(expense.payerId)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="font-black text-slate-800 text-sm">Rs. {expense.amount.toLocaleString()}</p>
                    <div className="flex items-center justify-end space-x-1 mt-1">
                       <UserIcon size={10} className="text-slate-300" />
                       <span className="text-[10px] text-slate-400 font-bold">Split {expense.participants.length}</span>
                    </div>
                  </div>
                  {canEditExpense(expense) && (
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => setEditingExpense(expense)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(expense.id)}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Delete Expense?</h3>
            <p className="text-slate-500 text-sm">This action cannot be undone.</p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 py-3 rounded-2xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteExpense(showDeleteConfirm)}
                disabled={deleting}
                className="flex-1 py-3 rounded-2xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Expense Modal */}
      {(showModal || editingExpense) && selectedTrip && (
        <AddExpenseModal
          tripId={activeTripId}
          participants={selectedTrip.participants}
          currentUserId={currentUserId}
          onClose={() => { setShowModal(false); setEditingExpense(null); }}
          editingExpense={editingExpense || undefined}
          participantIds={selectedTrip.participantIds}
          tripTitle={selectedTrip.title}
        />
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 right-6 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-300 flex items-center justify-center active:scale-90 transition-all z-40"
      >
        <Plus size={32} strokeWidth={3} />
      </button>
    </div>
  );
};

export default ExpensesPage;
