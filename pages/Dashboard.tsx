
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, ChevronRight, PlusCircle } from 'lucide-react';
import { useTrips } from '../contexts/TripContext';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { trips, loading } = useTrips();
  const { user } = useAuth();
  const navigate = useNavigate();

  const completedCount = trips.filter(t => t.status === 'completed').length;
  const citiesCount = new Set(trips.map(t => t.destination)).size;

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

      {/* Trips */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Your Trips</h3>
          <span className="text-indigo-600 text-sm font-semibold">{trips.length} total</span>
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
        ) : (
          <div className="space-y-4">
            {trips.map((trip) => (
              <div
                key={trip.id}
                onClick={() => navigate(`/trip/${trip.id}`)}
                className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 active:scale-[0.98] transition-all cursor-pointer group"
              >
                <div className="h-40 relative">
                  <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover" />
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
