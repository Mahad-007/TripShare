
import React from 'react';
import { Search, Navigation, MapPin, List } from 'lucide-react';
import { useTrips } from '../contexts/TripContext';

const MapsPage: React.FC = () => {
  const { trips } = useTrips();
  const destination = trips[0]?.destination || 'your destination';

  return (
    <div className="h-full flex flex-col relative">
      {/* Map Placeholder */}
      <div className="flex-1 bg-slate-200 relative overflow-hidden">
        <img
          src="https://picsum.photos/seed/map/800/1200"
          alt="Map"
          className="w-full h-full object-cover opacity-50 grayscale"
        />

        {/* Mock Markers */}
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 flex flex-col items-center">
          <div className="bg-white px-3 py-1 rounded-full shadow-lg text-[10px] font-bold mb-1 border border-indigo-100">
            Hotel Serena
          </div>
          <MapPin className="text-indigo-600 fill-indigo-200" size={32} />
        </div>

        <div className="absolute top-1/4 right-1/4 flex flex-col items-center">
          <div className="bg-white px-3 py-1 rounded-full shadow-lg text-[10px] font-bold mb-1 border border-rose-100">
            Attabad Lake
          </div>
          <MapPin className="text-rose-600 fill-rose-200" size={32} />
        </div>
      </div>

      {/* Top Search Bar Overlay */}
      <div className="absolute top-6 left-6 right-6 z-10">
        <div className="bg-white rounded-2xl shadow-xl p-1.5 flex items-center border border-slate-100">
          <div className="p-2 text-slate-400">
            <Search size={20} />
          </div>
          <input
            type="text"
            placeholder={`Search in ${destination}...`}
            className="flex-1 bg-transparent border-none outline-none text-sm py-2 font-medium"
          />
          <button className="bg-indigo-600 text-white p-2.5 rounded-xl">
            <Navigation size={18} />
          </button>
        </div>
      </div>

      {/* Bottom Sheet Overlay */}
      <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in slide-in-from-bottom-10 duration-500">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800">Nearby Attractions</h3>
          <List size={20} className="text-slate-400" />
        </div>

        <div className="space-y-4">
          {[
            { name: 'Baltit Fort', dist: '1.2 km', time: '15 min walk' },
            { name: 'Eagle\'s Nest', dist: '4.5 km', time: '12 min drive' },
          ].map((place, idx) => (
            <div key={idx} className="flex justify-between items-center p-3 rounded-2xl hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{place.name}</p>
                  <p className="text-xs text-slate-400 font-medium">{place.dist} away</p>
                </div>
              </div>
              <div className="bg-slate-50 px-3 py-1.5 rounded-full text-[10px] font-bold text-slate-600 uppercase">
                {place.time}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapsPage;
