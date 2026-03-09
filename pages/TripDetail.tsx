
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import { getSmartItinerary } from '../services/geminiService';
import { useTrips } from '../contexts/TripContext';

const TripDetail: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { trips } = useTrips();
  const trip = trips.find((t) => t.id === tripId);

  const [itinerary, setItinerary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <p className="text-slate-500 font-medium">Trip not found</p>
        <button onClick={() => navigate('/')} className="text-indigo-600 font-bold hover:underline">
          Go back home
        </button>
      </div>
    );
  }

  const generateItinerary = async () => {
    setIsLoading(true);
    const result = await getSmartItinerary(trip.destination, 3);
    setItinerary(result);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md px-6 py-4 flex items-center border-b border-slate-200">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h2 className="ml-2 font-bold text-lg truncate">{trip.title}</h2>
      </div>

      <div className="p-6 space-y-6">
        {/* Header Info */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold text-slate-800">{trip.destination}</h3>
              <p className="text-slate-500 mt-1">{trip.description}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
            <div className="flex items-center text-sm font-medium text-slate-600">
              <Calendar size={16} className="mr-2 text-indigo-500" />
              7 Days
            </div>
            <div className="flex items-center text-sm font-medium text-slate-600">
              <CheckCircle2 size={16} className="mr-2 text-green-500" />
              Blockchain Verified
            </div>
          </div>
        </div>

        {/* Gemini AI Assistant */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-3">
              <Sparkles size={20} className="text-indigo-200" />
              <h4 className="font-bold text-lg">AI Trip Assistant</h4>
            </div>
            <p className="text-indigo-100 text-sm mb-4 leading-relaxed">
              Let Gemini help you plan the perfect itinerary for {trip.destination}.
            </p>
            {!itinerary && !isLoading && (
              <button
                onClick={generateItinerary}
                className="bg-white text-indigo-600 px-6 py-2.5 rounded-full font-bold text-sm shadow-lg hover:bg-indigo-50 transition-colors"
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

          {/* Abstract SVG Background */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 opacity-10 pointer-events-none">
            <svg width="200" height="200" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="100" fill="white" />
            </svg>
          </div>
        </div>

        {/* Itinerary Display */}
        {itinerary && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <MapPin size={20} className="mr-2 text-indigo-600" />
              Suggested Itinerary
            </h4>
            <div className="prose prose-slate prose-sm max-w-none prose-p:my-2 prose-ul:list-disc">
              <div className="whitespace-pre-line text-slate-600 text-sm leading-relaxed">
                {itinerary}
              </div>
            </div>
            <button
              onClick={() => setItinerary(null)}
              className="mt-6 text-slate-400 text-sm hover:text-indigo-600 transition-colors"
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
