
import React, { useState } from 'react';
import { Camera, ShieldCheck, Search, Image as ImageIcon } from 'lucide-react';
import { useTrips } from '../contexts/TripContext';

const GalleryPage: React.FC = () => {
  const { trips } = useTrips();
  const tripId = trips[0]?.id;
  const [activeTab, setActiveTab] = useState<'all' | 'verified'>('all');

  const media = [
    { id: '1', url: 'https://picsum.photos/seed/media1/400/600', verified: true, date: 'June 15' },
    { id: '2', url: 'https://picsum.photos/seed/media2/400/400', verified: true, date: 'June 16' },
    { id: '3', url: 'https://picsum.photos/seed/media3/600/400', verified: false, date: 'June 16' },
    { id: '4', url: 'https://picsum.photos/seed/media4/400/400', verified: true, date: 'June 17' },
    { id: '5', url: 'https://picsum.photos/seed/media5/400/600', verified: true, date: 'June 18' },
    { id: '6', url: 'https://picsum.photos/seed/media6/400/400', verified: false, date: 'June 19' },
  ];

  const filteredMedia = activeTab === 'verified' ? media.filter(m => m.verified) : media;

  return (
    <div className="p-6 space-y-6">
      <section className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Media Gallery</h2>
          <p className="text-slate-500 text-sm mt-1">Capture every moment</p>
        </div>
        <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-100">
          <Search size={20} className="text-slate-400" />
        </div>
      </section>

      {/* Tabs */}
      <div className="flex bg-slate-200/50 p-1.5 rounded-2xl">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
          }`}
        >
          All Photos
        </button>
        <button
          onClick={() => setActiveTab('verified')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-all ${
            activeTab === 'verified' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'
          }`}
        >
          <ShieldCheck size={16} />
          <span>Verified</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4">
        {filteredMedia.map((m) => (
          <div key={m.id} className="relative group rounded-3xl overflow-hidden aspect-[4/5] shadow-sm">
            <img
              src={m.url}
              alt="Memory"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            {m.verified && (
              <div className="absolute top-3 right-3 bg-indigo-600 text-white p-1.5 rounded-full shadow-lg">
                <ShieldCheck size={14} />
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
              <p className="text-white text-[10px] font-bold uppercase tracking-wider">{m.date}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredMedia.length === 0 && (
        <div className="py-20 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
            <ImageIcon size={32} />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-slate-800">No verified media yet</p>
            <p className="text-sm text-slate-500">Wait for blockchain verification or upload new photos.</p>
          </div>
        </div>
      )}

      {/* Floating Camera Button */}
      <button className="fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center active:scale-95 transition-transform z-40">
        <Camera size={28} />
      </button>
    </div>
  );
};

export default GalleryPage;
