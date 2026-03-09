
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, MapPin, AlignLeft, Image as ImageIcon, ChevronRight } from 'lucide-react';
import { useTrips } from '../contexts/TripContext';

const AddTripPage: React.FC = () => {
  const navigate = useNavigate();
  const { addTrip } = useTrips();
  const [formData, setFormData] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    description: '',
    coverImage: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTrip(formData);
    navigate('/');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white sticky top-0 z-10">
        <h2 className="text-xl font-bold text-slate-800">Plan New Trip</h2>
        <button onClick={() => navigate('/')} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 transition-colors">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto no-scrollbar">
        {/* Banner Preview */}
        <div className="relative h-44 rounded-3xl overflow-hidden group cursor-pointer">
          <img
            src={formData.coverImage}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl text-white flex items-center space-x-2">
              <ImageIcon size={20} />
              <span className="text-xs font-bold uppercase tracking-wider">Change Cover</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Trip Name</label>
            <div className="relative">
              <input
                required
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                type="text"
                placeholder="Summer Vacay 2024"
                className="w-full bg-slate-50 border border-slate-100 py-3.5 px-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Destination</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
              <input
                required
                name="destination"
                value={formData.destination}
                onChange={handleInputChange}
                type="text"
                placeholder="Where are we going?"
                className="w-full bg-slate-50 border border-slate-100 py-3.5 pl-11 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                <input
                  required
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  type="date"
                  className="w-full bg-slate-50 border border-slate-100 py-3.5 pl-11 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">End Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                <input
                  required
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  type="date"
                  className="w-full bg-slate-50 border border-slate-100 py-3.5 pl-11 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Description</label>
            <div className="relative">
              <AlignLeft className="absolute left-4 top-4 text-indigo-500" size={18} />
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                placeholder="What's the vibe of this trip?"
                className="w-full bg-slate-50 border border-slate-100 py-3.5 pl-11 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm resize-none"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-indigo-100 active:scale-[0.98] transition-all"
        >
          <span>Start Exploring</span>
          <ChevronRight size={18} />
        </button>
      </form>
    </div>
  );
};

export default AddTripPage;
