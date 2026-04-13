
import React, { useState, useEffect } from 'react';
import { Search, Heart, Share2, ShieldCheck, MapPin, Image as ImageIcon, Loader, UserPlus, UserMinus } from 'lucide-react';
import { fetchPublicMedia, backfillPublicMediaMirrors, ExplorePost } from '../services/mediaService';
import { toggleLike, fetchLikeStates, followUser, unfollowUser, fetchFollowStates } from '../services/socialService';
import { useAuth } from '../contexts/AuthContext';

const ExplorePage: React.FC = () => {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('Trending');
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [likeStates, setLikeStates] = useState<Map<string, { liked: boolean; count: number }>>(new Map());
  const [followStates, setFollowStates] = useState<Map<string, boolean>>(new Map());
  const [togglingLike, setTogglingLike] = useState<Set<string>>(new Set());
  const [togglingFollow, setTogglingFollow] = useState<Set<string>>(new Set());
  const [shareToast, setShareToast] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // One-time backfill of /publicMedia mirrors for this user's existing public
    // media. Idempotent, gated by localStorage — no-op after first successful run.
    const run = async () => {
      if (user?.id) {
        await backfillPublicMediaMirrors(user.id);
      }
      if (cancelled) return;
      try {
        const data = await fetchPublicMedia(15);
        if (!cancelled) setPosts(data);
      } catch (err) {
        console.error('[ExplorePage] fetchPublicMedia failed:', err);
        if (!cancelled) {
          const detail = err instanceof Error ? err.message : String(err);
          setError(`Could not load explore feed. (${detail})`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Fetch like & follow states after posts load
  useEffect(() => {
    if (!posts.length || !user) return;
    fetchLikeStates(
      posts.map((p) => ({ tripId: p.tripId, mediaId: p.mediaId, id: p.id })),
      user.id
    ).then(setLikeStates);
    const uniqueOwnerIds = Array.from(new Set<string>(posts.map((p) => p.ownerId)));
    fetchFollowStates(uniqueOwnerIds, user.id).then(setFollowStates);
  }, [posts, user]);

  const handleToggleLike = async (post: ExplorePost) => {
    if (!user) return;
    const key = post.id;
    setTogglingLike((prev) => new Set(prev).add(key));
    try {
      const nowLiked = await toggleLike(post.tripId, post.mediaId, user.id);
      setLikeStates((prev) => {
        const next = new Map<string, { liked: boolean; count: number }>(prev);
        const cur = next.get(key) || { liked: false, count: 0 };
        next.set(key, { liked: nowLiked, count: cur.count + (nowLiked ? 1 : -1) });
        return next;
      });
    } finally {
      setTogglingLike((prev) => { const n = new Set(prev); n.delete(key); return n; });
    }
  };

  const handleToggleFollow = async (ownerId: string) => {
    if (!user || ownerId === user.id) return;
    setTogglingFollow((prev) => new Set(prev).add(ownerId));
    try {
      const isCurrentlyFollowing = followStates.get(ownerId) || false;
      if (isCurrentlyFollowing) {
        await unfollowUser(user.id, ownerId);
      } else {
        await followUser(user.id, ownerId);
      }
      setFollowStates((prev) => {
        const next = new Map(prev);
        next.set(ownerId, !isCurrentlyFollowing);
        return next;
      });
    } finally {
      setTogglingFollow((prev) => { const n = new Set(prev); n.delete(ownerId); return n; });
    }
  };

  const handleShare = async (post: ExplorePost) => {
    const url = `${window.location.origin}/trip/${post.tripId}`;
    const shareData = { title: post.tripTitle, text: `Check out ${post.tripTitle} on TripShare!`, url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2000);
      }
    } catch {
      // User cancelled share
    }
  };

  // Filtering logic
  const today = new Date().toISOString().split('T')[0];

  let filteredPosts = posts;

  // Search filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredPosts = filteredPosts.filter(
      (p) =>
        p.tripTitle.toLowerCase().includes(q) ||
        p.destination.toLowerCase().includes(q) ||
        p.ownerName.toLowerCase().includes(q)
    );
  }

  // Tab filter
  if (activeFilter === 'Verified Only') {
    filteredPosts = filteredPosts.filter((p) => p.media.isVerified);
  } else if (activeFilter === 'Upcoming') {
    filteredPosts = filteredPosts.filter((p) => p.startDate > today);
  }

  // Creators view
  const isCreatorsView = activeFilter === 'Creators';
  const creatorsMap = new Map<string, { ownerId: string; ownerName: string; ownerAvatar?: string; postCount: number }>();
  if (isCreatorsView) {
    const source = searchQuery.trim() ? filteredPosts : posts;
    source.forEach((p) => {
      const existing = creatorsMap.get(p.ownerId);
      if (existing) {
        existing.postCount++;
      } else {
        creatorsMap.set(p.ownerId, { ownerId: p.ownerId, ownerName: p.ownerName, ownerAvatar: p.ownerAvatar, postCount: 1 });
      }
    });
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Share Toast */}
      {shareToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-sm font-bold px-5 py-2.5 rounded-2xl shadow-xl animate-pulse">
          Link copied!
        </div>
      )}

      <div className="px-6 pt-6 space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Explore Trips</h2>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search trips, places, creators..."
            className="w-full bg-white border border-slate-200 py-3.5 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm font-medium"
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
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-100'
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
          {[1, 2].map((i) => (
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
      {!loading && !error && !isCreatorsView && filteredPosts.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
            <ImageIcon size={32} />
          </div>
          <div className="text-center space-y-1">
            <p className="font-bold text-slate-800">No trips found</p>
            <p className="text-sm text-slate-500">
              {activeFilter === 'Verified Only'
                ? 'No verified media found. Check back later!'
                : activeFilter === 'Upcoming'
                ? 'No upcoming trips found.'
                : searchQuery
                ? 'Try a different search term.'
                : 'When trips are made public, their media will appear here.'}
            </p>
          </div>
        </div>
      )}

      {/* Creators Grid */}
      {!loading && !error && isCreatorsView && (
        <div className="p-6">
          {creatorsMap.size === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                <ImageIcon size={32} />
              </div>
              <p className="font-bold text-slate-800">No creators found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[...creatorsMap.values()].map((creator) => {
                const isFollowingCreator = followStates.get(creator.ownerId) || false;
                const isToggling = togglingFollow.has(creator.ownerId);
                const isSelf = creator.ownerId === user?.id;

                return (
                  <div key={creator.ownerId} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col items-center space-y-3">
                    <div className="w-14 h-14 rounded-full border-2 border-teal-100 p-0.5 overflow-hidden bg-teal-50">
                      {creator.ownerAvatar ? (
                        <img src={creator.ownerAvatar} alt={creator.ownerName} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-teal-100 flex items-center justify-center text-teal-500 font-bold text-lg">
                          {creator.ownerName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-slate-800 text-sm truncate max-w-[120px]">{creator.ownerName}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{creator.postCount} post{creator.postCount !== 1 ? 's' : ''}</p>
                    </div>
                    {!isSelf && (
                      <button
                        onClick={() => handleToggleFollow(creator.ownerId)}
                        disabled={isToggling}
                        className={`w-full flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${
                          isFollowingCreator
                            ? 'bg-teal-600 text-white'
                            : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                        }`}
                      >
                        {isToggling ? (
                          <Loader size={14} className="animate-spin" />
                        ) : isFollowingCreator ? (
                          <>
                            <UserMinus size={12} />
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <UserPlus size={12} />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Feed */}
      {!loading && !isCreatorsView && filteredPosts.length > 0 && (
        <div className="p-6 space-y-8">
          {filteredPosts.map((post) => {
            const likeState = likeStates.get(post.id) || { liked: false, count: 0 };
            const isLikeToggling = togglingLike.has(post.id);
            const isFollowingOwner = followStates.get(post.ownerId) || false;
            const isFollowToggling = togglingFollow.has(post.ownerId);
            const isSelf = post.ownerId === user?.id;

            return (
              <div key={post.id} className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100">
                {/* Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full border-2 border-teal-100 p-0.5 overflow-hidden bg-teal-50">
                      {post.ownerAvatar ? (
                        <img src={post.ownerAvatar} alt={post.ownerName} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-teal-100 flex items-center justify-center text-teal-500 font-bold text-sm">
                          {post.ownerName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1">
                        <span className="font-bold text-slate-800 text-sm">{post.ownerName}</span>
                        {post.media.isVerified && <ShieldCheck size={14} className="text-teal-600" />}
                      </div>
                      <div className="flex items-center text-slate-400 text-[10px] font-bold uppercase tracking-tight">
                        <MapPin size={10} className="mr-0.5" />
                        {post.destination}
                      </div>
                    </div>
                  </div>
                  {!isSelf && (
                    <button
                      onClick={() => handleToggleFollow(post.ownerId)}
                      disabled={isFollowToggling}
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${
                        isFollowingOwner
                          ? 'bg-teal-600 text-white'
                          : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                      }`}
                    >
                      {isFollowToggling ? '...' : isFollowingOwner ? 'Following' : 'Connect'}
                    </button>
                  )}
                </div>

                {/* Media Content */}
                <div className="relative aspect-[4/5]">
                  {post.media.type === 'video' ? (
                    <video src={post.media.url} className="w-full h-full object-cover" controls />
                  ) : (
                    <img src={post.media.url} alt={post.media.caption || post.tripTitle} className="w-full h-full object-cover" loading="lazy" />
                  )}
                  {post.media.isVerified && (
                    <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center space-x-2 shadow-lg">
                      <ShieldCheck size={14} className="text-teal-600" />
                      <span className="text-[10px] font-extrabold text-teal-900 uppercase tracking-tighter">On-Chain Verified</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleToggleLike(post)}
                      disabled={isLikeToggling}
                      className="flex items-center space-x-1.5 group disabled:opacity-50"
                    >
                      <Heart
                        size={20}
                        className={likeState.liked ? 'text-rose-500' : 'text-slate-400 group-hover:text-rose-500'}
                        fill={likeState.liked ? 'currentColor' : 'none'}
                      />
                      {likeState.count > 0 && (
                        <span className="text-xs font-bold text-slate-500">{likeState.count}</span>
                      )}
                    </button>
                    <button onClick={() => handleShare(post)} className="group">
                      <Share2 size={20} className="text-slate-400 group-hover:text-teal-600 transition-colors" />
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-800 mr-2">{post.ownerName}</span>
                    {post.media.caption || `${post.tripTitle} — ${post.destination}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExplorePage;
