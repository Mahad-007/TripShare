
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, ChevronRight } from 'lucide-react';
import { useTrips } from '../contexts/TripContext';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { trips } = useTrips();
  const { user } = useAuth();
  const navigate = useNavigate();

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
          <p className="text-2xl font-bold">12</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <p className="text-xs text-slate-400 uppercase font-semibold">Cities Visited</p>
          <p className="text-2xl font-bold text-slate-800">45</p>
        </div>
      </div>

      {/* Active Trips */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Your Trips</h3>
          <button className="text-indigo-600 text-sm font-semibold">View All</button>
        </div>

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
                        <img src={p.avatar} alt={p.name} />
                      </div>
                    ))}
                  </div>
                  <ChevronRight size={20} className="text-slate-300" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
