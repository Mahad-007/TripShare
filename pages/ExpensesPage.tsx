
import React, { useState } from 'react';
import { Expense } from '../types';
import { Plus, Filter, PieChart as ChartIcon, Sparkles, User as UserIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { summarizeExpenses } from '../services/geminiService';
import { useTrips } from '../contexts/TripContext';
import { useAuth } from '../contexts/AuthContext';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f97316', '#14b8a6'];

const ExpensesPage: React.FC = () => {
  const { trips } = useTrips();
  const { user } = useAuth();
  const [selectedTripId, setSelectedTripId] = useState<string>('');

  const activeTripId = selectedTripId || trips[0]?.id || '';
  const selectedTrip = trips.find(t => t.id === activeTripId);

  const [expenses, setExpenses] = useState<Expense[]>(
    selectedTrip
      ? [
          { id: 'e1', tripId: selectedTrip.id, amount: 1500, description: 'Hotel Booking', payerId: selectedTrip.participants[0]?.id || '', date: '2024-06-15', participants: selectedTrip.participantIds },
          { id: 'e2', tripId: selectedTrip.id, amount: 600, description: 'Dinner Hunza', payerId: selectedTrip.participants[1]?.id || selectedTrip.participants[0]?.id || '', date: '2024-06-16', participants: selectedTrip.participantIds },
          { id: 'e3', tripId: selectedTrip.id, amount: 200, description: 'Gas refill', payerId: selectedTrip.participants[0]?.id || '', date: '2024-06-17', participants: selectedTrip.participantIds },
        ]
      : []
  );

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const currentUserId = user?.id || '';

  if (!selectedTrip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <p className="text-slate-500 font-medium">No trips yet. Create one to start tracking expenses.</p>
      </div>
    );
  }

  const handleTripChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTripId(e.target.value);
    setAiSummary(null);
  };

  const calculateBalances = () => {
    const balances: Record<string, number> = {};
    selectedTrip.participants.forEach(p => balances[p.id] = 0);
    expenses.forEach(exp => {
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
  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  const chartData = expenses.reduce((acc: any[], exp) => {
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
    const summary = await summarizeExpenses(expenses, participantNames);
    setAiSummary(summary);
    setIsSummarizing(false);
  };

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
                disabled={isSummarizing}
                className="bg-white text-indigo-600 px-6 py-2.5 rounded-full font-bold text-xs shadow-lg hover:bg-indigo-50 disabled:opacity-50 transition-all"
              >
                {isSummarizing ? 'Analyzing...' : 'Generate Summary'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Settlement Advice */}
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
                  <button className="text-[10px] font-bold text-indigo-600 uppercase mt-1">Settle</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent History */}
      <section className="space-y-4 pb-12">
        <div className="flex justify-between items-center px-1">
          <h4 className="text-lg font-bold text-slate-800">Recent Transactions</h4>
          <button className="text-slate-400 p-2 bg-white rounded-xl border border-slate-100">
            <Filter size={16} />
          </button>
        </div>

        <div className="space-y-3">
          {expenses.slice().reverse().map((expense) => (
            <div key={expense.id} className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-100 flex items-center justify-between active:scale-[0.98] transition-transform">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl">
                  {expense.description.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{expense.description}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {expense.date} • {expense.payerId === currentUserId ? 'You paid' : 'Someone paid'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-slate-800 text-sm">Rs. {expense.amount}</p>
                <div className="flex items-center justify-end space-x-1 mt-1">
                   <UserIcon size={10} className="text-slate-300" />
                   <span className="text-[10px] text-slate-400 font-bold">Split with {expense.participants.length}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Floating Action Button */}
      <button className="fixed bottom-24 right-6 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-300 flex items-center justify-center active:scale-90 transition-all z-40">
        <Plus size={32} strokeWidth={3} />
      </button>
    </div>
  );
};

export default ExpensesPage;
