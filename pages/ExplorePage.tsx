
import React, { useState } from 'react';
import { Search, Heart, MessageCircle, Share2, ShieldCheck, MapPin, Plus } from 'lucide-react';

const EXPLORE_DATA = [
  {
    id: 'e1',
    user: { name: 'Sarah Chen', avatar: 'https://picsum.photos/seed/s1/100/100' },
    image: 'https://picsum.photos/seed/bali/800/1000',
    location: 'Bali, Indonesia',
    caption: 'Found the most secret waterfall in Ubud! 🌊 Who wants the coordinates? #TravelVerified',
    likes: '1.2k',
    isVerified: true
  },
  {
    id: 'e2',
    user: { name: 'Marc Rosso', avatar: 'https://picsum.photos/seed/m1/100/100' },
    image: 'https://picsum.photos/seed/switzerland/800/800',
    location: 'Zermatt, CH',
    caption: 'Waking up to the Matterhorn is something else. Trip itinerary being minted on-chain tomorrow!',
    likes: '850',
    isVerified: true
  },
  {
    id: 'e3',
    user: { name: 'Ayesha Malik', avatar: 'https://picsum.photos/seed/ay1/100/100' },
    image: 'https://picsum.photos/seed/skardu/800/1000',
    location: 'Skardu, Pakistan',
    caption: 'The cold desert of Katpana. Absolute serenity. Planning a group trip here in August. Join me!',
    likes: '2.4k',
    isVerified: true
  }
];

const ExplorePage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('Trending');

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <div className="px-6 pt-6 space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Explore Trips</h2>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Find verified trip makers..." 
            className="w-full bg-white border border-slate-200 py-3.5 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
          />
        </div>

        {/* Filters */}
        <div className="flex space-x-3 overflow-x-auto no-scrollbar py-2">
          {['Trending', 'Verified Only', 'Upcoming', 'Creators'].map((f) => (
            <button 
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === f 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                  : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="p-6 space-y-8">
        {EXPLORE_DATA.map((post) => (
          <div key={post.id} className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100">
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full border-2 border-indigo-100 p-0.5">
                  <img src={post.user.avatar} alt={post.user.name} className="w-full h-full rounded-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center space-x-1">
                    <span className="font-bold text-slate-800 text-sm">{post.user.name}</span>
                    {post.isVerified && <ShieldCheck size={14} className="text-indigo-600" />}
                  </div>
                  <div className="flex items-center text-slate-400 text-[10px] font-bold uppercase tracking-tight">
                    <MapPin size={10} className="mr-0.5" />
                    {post.location}
                  </div>
                </div>
              </div>
              <button className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-100 transition-colors">
                Connect
              </button>
            </div>

            {/* Media Content */}
            <div className="relative aspect-[4/5]">
              <img src={post.image} alt="Trip Content" className="w-full h-full object-cover" />
              {/* Overlay verified badge */}
              <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center space-x-2 shadow-lg">
                <ShieldCheck size={14} className="text-indigo-600" />
                <span className="text-[10px] font-extrabold text-indigo-900 uppercase tracking-tighter">On-Chain Verified</span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button className="flex items-center space-x-1.5 group">
                    <Heart size={20} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
                    <span className="text-xs font-bold text-slate-600">{post.likes}</span>
                  </button>
                  <button className="flex items-center space-x-1.5 group">
                    <MessageCircle size={20} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    <span className="text-xs font-bold text-slate-600">42</span>
                  </button>
                  <button className="group">
                    <Share2 size={20} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  </button>
                </div>
                <button className="bg-slate-50 text-slate-600 p-2 rounded-xl">
                  <Plus size={20} />
                </button>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-800 mr-2">{post.user.name}</span>
                {post.caption}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExplorePage;
