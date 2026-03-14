import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, UserPlus, UserMinus, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToFollowers, subscribeToFollowing, followUser, unfollowUser } from '../services/socialService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { User } from '../types';

const TravelCirclePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers');
  const [followerIds, setFollowerIds] = useState<string[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [userCache, setUserCache] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const unsubFollowersRef = useRef<(() => void) | null>(null);
  const unsubFollowingRef = useRef<(() => void) | null>(null);
  const loadedOnce = useRef(false);

  useEffect(() => {
    if (!user) return;
    let firstFollowers = true;
    let firstFollowing = true;

    unsubFollowersRef.current = subscribeToFollowers(user.id, (ids) => {
      setFollowerIds(ids);
      if (firstFollowers) { firstFollowers = false; if (!firstFollowing || loadedOnce.current) setLoading(false); loadedOnce.current = true; }
    });
    unsubFollowingRef.current = subscribeToFollowing(user.id, (ids) => {
      setFollowingIds(ids);
      if (firstFollowing) { firstFollowing = false; if (!firstFollowers || loadedOnce.current) setLoading(false); loadedOnce.current = true; }
    });

    return () => {
      unsubFollowersRef.current?.();
      unsubFollowingRef.current?.();
    };
  }, [user]);

  // Hydrate user info for IDs not yet cached
  const hydrateUsers = useCallback(async (ids: string[]) => {
    const uncached = ids.filter((id) => !userCache.has(id));
    if (!uncached.length) return;

    const fetched = await Promise.all(
      uncached.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, 'users', id));
          if (snap.exists()) {
            const d = snap.data();
            return { id, name: d.name || 'Unknown', email: d.email || '', avatar: d.avatar } as User;
          }
        } catch { /* ignore */ }
        return { id, name: 'Unknown', email: '', avatar: undefined } as User;
      })
    );

    setUserCache((prev) => {
      const next = new Map(prev);
      fetched.forEach((u) => next.set(u.id, u));
      return next;
    });
  }, [userCache]);

  useEffect(() => {
    const allIds = [...new Set([...followerIds, ...followingIds])];
    if (allIds.length) hydrateUsers(allIds);
  }, [followerIds, followingIds]);

  const handleToggleFollow = async (targetId: string, currentlyFollowing: boolean) => {
    if (!user) return;
    setToggling((prev) => new Set(prev).add(targetId));
    try {
      if (currentlyFollowing) {
        await unfollowUser(user.id, targetId);
      } else {
        await followUser(user.id, targetId);
      }
    } catch { /* ignore */ }
    setToggling((prev) => { const n = new Set(prev); n.delete(targetId); return n; });
  };

  const activeIds = activeTab === 'followers' ? followerIds : followingIds;
  const followingSet = new Set(followingIds);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors">
          <ChevronLeft size={20} className="text-slate-600" />
        </button>
        <h2 className="font-bold text-slate-800">Travel Circle</h2>
        <div className="w-9" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white">
        {(['followers', 'following'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-bold capitalize transition-colors ${
              activeTab === tab
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-400'
            }`}
          >
            {tab} ({tab === 'followers' ? followerIds.length : followingIds.length})
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <Loader size={28} className="text-indigo-600 animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && activeIds.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
            <UserPlus size={32} />
          </div>
          <div className="text-center space-y-1">
            <p className="font-bold text-slate-800">
              {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone'}
            </p>
            <p className="text-sm text-slate-500">
              {activeTab === 'followers'
                ? 'Share your trips to grow your circle!'
                : 'Explore trips and connect with creators.'}
            </p>
          </div>
        </div>
      )}

      {/* User List */}
      {!loading && activeIds.length > 0 && (
        <div className="divide-y divide-slate-100">
          {activeIds.map((uid) => {
            const u = userCache.get(uid);
            const isFollowingUser = followingSet.has(uid);
            const isToggling = toggling.has(uid);

            return (
              <div key={uid} className="flex items-center justify-between p-4 bg-white">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-11 h-11 rounded-full border-2 border-indigo-100 p-0.5 overflow-hidden bg-indigo-50 flex-shrink-0">
                    {u?.avatar ? (
                      <img src={u.avatar} alt={u.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 font-bold text-sm">
                        {(u?.name || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{u?.name || 'Loading...'}</p>
                    {u?.email && <p className="text-xs text-slate-400 truncate">{u.email}</p>}
                  </div>
                </div>
                {uid !== user?.id && (
                  <button
                    onClick={() => handleToggleFollow(uid, isFollowingUser)}
                    disabled={isToggling}
                    className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${
                      isFollowingUser
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                    }`}
                  >
                    {isToggling ? (
                      <Loader size={14} className="animate-spin" />
                    ) : isFollowingUser ? (
                      <>
                        <UserMinus size={14} />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={14} />
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
  );
};

export default TravelCirclePage;
