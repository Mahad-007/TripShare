
import React, { useState, useEffect } from 'react';
import { Search, Heart, MessageCircle, Share2, ShieldCheck, MapPin, Plus, Image as ImageIcon, Loader } from 'lucide-react';
import { fetchPublicTripMedia, ExplorePost } from '../services/mediaService';

const ExplorePage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('Trending');
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPublicTripMedia(15)
      .then((data) => { if (!cancelled) setPosts(data); })
      .catch(() => { if (!cancelled) setError('Could not load explore feed.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filteredPosts = activeFilter === 'Verified Only'
    ? posts.filter(p => p.media.isVerified)
    : posts;

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

      {/* Loading */}
      {loading && (
        <div className="p-6 space-y-8">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100">
              <div className="p-4 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-slate-200 rounded-full w-24 animate-pulse" />
                  <div className="h-2 bg-slate-200 rounded-full w-16 animate-pulse" />
                </div>
              </div>
              <div className="aspect-[4/5] bg-slate-200 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-slate-200 rounded-full w-3/4 animate-pulse" />
                <div className="h-3 bg-slate-200 rounded-full w-1/2 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="p-6">
          <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium p-4 rounded-2xl text-center">
            {error}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredPosts.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
            <ImageIcon size={32} />
          </div>
          <div className="text-center space-y-1">
            <p className="font-bold text-slate-800">No public trips yet</p>
            <p className="text-sm text-slate-500">
              {activeFilter === 'Verified Only'
                ? 'No verified media found. Check back later!'
                : 'When trips are made public, their media will appear here.'}
            </p>
          </div>
        </div>
      )}

      {/* Feed */}
      {!loading && filteredPosts.length > 0 && (
        <div className="p-6 space-y-8">
          {filteredPosts.map((post) => (
            <div key={post.id} className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100">
              {/* Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full border-2 border-indigo-100 p-0.5 overflow-hidden bg-indigo-50">
                    {post.ownerAvatar ? (
                      <img src={post.ownerAvatar} alt={post.ownerName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 font-bold text-sm">
                        {post.ownerName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1">
                      <span className="font-bold text-slate-800 text-sm">{post.ownerName}</span>
                      {post.media.isVerified && <ShieldCheck size={14} className="text-indigo-600" />}
                    </div>
                    <div className="flex items-center text-slate-400 text-[10px] font-bold uppercase tracking-tight">
                      <MapPin size={10} className="mr-0.5" />
                      {post.destination}
                    </div>
                  </div>
                </div>
                <button className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-100 transition-colors">
                  Connect
                </button>
              </div>

              {/* Media Content */}
              <div className="relative aspect-[4/5]">
                {post.media.type === 'video' ? (
                  <video src={post.media.url} className="w-full h-full object-cover" controls />
                ) : (
                  <img src={post.media.url} alt={post.media.caption || post.tripTitle} className="w-full h-full object-cover" />
                )}
                {post.media.isVerified && (
                  <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center space-x-2 shadow-lg">
                    <ShieldCheck size={14} className="text-indigo-600" />
                    <span className="text-[10px] font-extrabold text-indigo-900 uppercase tracking-tighter">On-Chain Verified</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button className="flex items-center space-x-1.5 group">
                      <Heart size={20} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
                    </button>
                    <button className="flex items-center space-x-1.5 group">
                      <MessageCircle size={20} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
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
                  <span className="font-bold text-slate-800 mr-2">{post.ownerName}</span>
                  {post.media.caption || `${post.tripTitle} — ${post.destination}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExplorePage;
