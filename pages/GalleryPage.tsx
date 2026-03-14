
import React, { useState, useEffect, useRef } from 'react';
import { Camera, ShieldCheck, ShieldQuestion, Image as ImageIcon, Trash2, Loader, Play } from 'lucide-react';
import { Unsubscribe } from 'firebase/firestore';
import { useTrips } from '../contexts/TripContext';
import { useAuth } from '../contexts/AuthContext';
import { getUserRole } from '../services/tripService';
import { subscribeToMedia, deleteMedia } from '../services/mediaService';
import UploadMediaModal from '../components/UploadMediaModal';
import MediaLightbox from '../components/MediaLightbox';
import { Media } from '../types';
import { useToast } from '../hooks/useToast';

const GalleryPage: React.FC = () => {
  const { trips } = useTrips();
  const { user } = useAuth();
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'verified'>('all');
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<Media | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { showToast } = useToast();
  const activeTripId = selectedTripId || trips[0]?.id || '';
  const selectedTrip = trips.find(t => t.id === activeTripId);
  const role = selectedTrip && user ? getUserRole(selectedTrip, user.id) : 'none';

  // Real-time subscription
  const unsubRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    if (!activeTripId) { setMedia([]); setLoading(false); return; }

    setLoading(true);
    unsubRef.current = subscribeToMedia(activeTripId, (newMedia) => {
      setMedia(newMedia);
      setLoading(false);
    });

    return () => { if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; } };
  }, [activeTripId]);

  const canDeleteMedia = (m: Media): boolean => {
    if (!user) return false;
    return role === 'owner' || m.uploadedBy === user.id;
  };

  const handleDeleteMedia = async (m: Media) => {
    setDeleting(true);
    try {
      await deleteMedia(activeTripId, m.id, m.url, m.thumbnailUrl);
      showToast('Media deleted', 'success');
    } catch {
      showToast('Failed to delete media', 'error');
    }
    setDeleting(false);
    setShowDeleteConfirm(null);
    if (lightboxMedia?.id === m.id) setLightboxMedia(null);
  };

  const filteredMedia = activeTab === 'verified' ? media.filter(m => m.isVerified) : media;

  const getUploaderName = (uploadedBy: string): string => {
    const participant = selectedTrip?.participants.find(p => p.id === uploadedBy);
    return participant?.name || 'Unknown';
  };

  return (
    <div className="p-6 space-y-6">
      <section className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Media Gallery</h2>
          <p className="text-slate-500 text-sm mt-1">{selectedTrip ? selectedTrip.title : 'Capture every moment'}</p>
        </div>
      </section>

      {/* Trip Selector */}
      {trips.length > 1 && (
        <select
          value={activeTripId}
          onChange={(e) => setSelectedTripId(e.target.value)}
          className="w-full bg-white border border-slate-200 py-3 px-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold text-sm text-slate-700"
        >
          {trips.map(t => (
            <option key={t.id} value={t.id}>{t.title} — {t.destination}</option>
          ))}
        </select>
      )}

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

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse bg-slate-200 rounded-3xl aspect-[4/5]" />
          ))}
        </div>
      )}

      {/* Grid */}
      {!loading && filteredMedia.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {filteredMedia.map((m) => (
            <div
              key={m.id}
              className="relative group rounded-3xl overflow-hidden aspect-[4/5] shadow-sm cursor-pointer"
              onClick={() => setLightboxMedia(m)}
            >
              <img
                src={m.thumbnailUrl || m.url}
                alt={m.caption || 'Memory'}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
              />
              {m.type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                    <Play size={20} className="text-white ml-0.5" />
                  </div>
                </div>
              )}
              {m.blockchainHash && m.isVerified ? (
                <div className="absolute top-3 right-3 bg-emerald-600 text-white p-1.5 rounded-full shadow-lg">
                  <ShieldCheck size={14} />
                </div>
              ) : !m.blockchainHash ? (
                <div className="absolute top-3 right-3 bg-slate-400 text-white p-1.5 rounded-full shadow-lg opacity-70">
                  <ShieldQuestion size={14} />
                </div>
              ) : null}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-white text-[10px] font-bold uppercase tracking-wider">{m.date}</p>
                {m.caption && (
                  <p className="text-white/80 text-[10px] truncate mt-0.5">{m.caption}</p>
                )}
              </div>
              {canDeleteMedia(m) && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(m.id); }}
                  className="absolute top-3 left-3 p-1.5 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500"
                  aria-label="Delete media"
                >
                  <Trash2 size={14} className="text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredMedia.length === 0 && (
        <div className="py-20 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
            <ImageIcon size={32} />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-slate-800">
              {activeTab === 'verified' ? 'No verified media yet' : 'No photos yet'}
            </p>
            <p className="text-sm text-slate-500">
              {activeTab === 'verified'
                ? 'Verified media will appear here. New uploads are automatically verified.'
                : 'Tap the camera button to upload your first photo.'}
            </p>
          </div>
        </div>
      )}

      {/* Floating Camera Button */}
      {role !== 'none' && (
        <button
          onClick={() => setShowUploadModal(true)}
          className="fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center active:scale-95 transition-transform z-40"
          aria-label="Upload media"
        >
          <Camera size={28} />
        </button>
      )}

      {/* Upload Modal */}
      {showUploadModal && selectedTrip && user && (
        <UploadMediaModal
          tripId={activeTripId}
          currentUserId={user.id}
          onClose={() => setShowUploadModal(false)}
          participantIds={selectedTrip.participantIds}
          tripTitle={selectedTrip.title}
        />
      )}

      {/* Lightbox */}
      {lightboxMedia && (
        <MediaLightbox
          media={lightboxMedia}
          uploaderName={getUploaderName(lightboxMedia.uploadedBy)}
          onClose={() => setLightboxMedia(null)}
          canDelete={canDeleteMedia(lightboxMedia)}
          onDelete={() => setShowDeleteConfirm(lightboxMedia.id)}
          tripId={activeTripId}
          currentUserId={user!.id}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Delete Media?</h3>
            <p className="text-sm text-slate-500">This will permanently remove this photo/video. This action cannot be undone.</p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const m = media.find(item => item.id === showDeleteConfirm);
                  if (m) handleDeleteMedia(m);
                }}
                disabled={deleting}
                className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-bold text-sm hover:bg-rose-600 transition-colors flex items-center justify-center space-x-2"
              >
                {deleting ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                <span>{deleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryPage;
