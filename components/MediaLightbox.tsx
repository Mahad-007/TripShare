import React, { useState } from 'react';
import { X, Trash2, ShieldCheck, ShieldAlert, Fingerprint, ChevronDown, ChevronUp, Loader, Play } from 'lucide-react';
import { Media, VerificationResult } from '../types';
import { verifyMediaIntegrity, generateHashForExistingMedia } from '../services/blockchainService';

interface MediaLightboxProps {
  media: Media;
  uploaderName: string;
  onClose: () => void;
  onDelete?: () => void;
  canDelete: boolean;
  tripId: string;
  currentUserId: string;
}

const MediaLightbox: React.FC<MediaLightboxProps> = ({
  media,
  uploaderName,
  onClose,
  onDelete,
  canDelete,
  tripId,
  currentUserId,
}) => {
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [generatingHash, setGeneratingHash] = useState(false);

  const handleVerify = async () => {
    setVerifying(true);
    setVerificationResult(null);
    try {
      const result = await verifyMediaIntegrity(
        tripId,
        media.id,
        media.storagePath,
        media.blockchainHash,
        currentUserId
      );
      setVerificationResult(result);
    } catch (err) {
      setVerificationResult({
        status: 'error',
        message: err instanceof Error ? err.message : 'Verification failed.',
        timestamp: new Date().toISOString(),
      });
    }
    setVerifying(false);
  };

  const handleGenerateHash = async () => {
    setGeneratingHash(true);
    try {
      await generateHashForExistingMedia(
        tripId,
        media.id,
        media.storagePath,
        media.url,
        currentUserId
      );
      setVerificationResult({
        status: 'valid',
        message: 'Hash generated and stored successfully.',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setVerificationResult({
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to generate hash.',
        timestamp: new Date().toISOString(),
      });
    }
    setGeneratingHash(false);
  };

  const truncateHash = (hash: string) => `${hash.slice(0, 8)}...${hash.slice(-8)}`;

  const getStatusBadge = () => {
    if (!media.blockchainHash && !verificationResult) return null;

    if (verificationResult) {
      const cfg = {
        valid: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', icon: ShieldCheck, label: 'Verified' },
        tampered: { bg: 'bg-rose-500/20', text: 'text-rose-300', icon: ShieldAlert, label: 'Tampered' },
        error: { bg: 'bg-amber-500/20', text: 'text-amber-300', icon: ShieldAlert, label: 'Error' },
        no_hash: { bg: 'bg-slate-500/20', text: 'text-slate-300', icon: ShieldAlert, label: 'No Hash' },
      }[verificationResult.status];
      const Icon = cfg.icon;
      return (
        <div className={`flex items-center space-x-1 ${cfg.bg} px-2.5 py-1 rounded-full`}>
          <Icon size={12} className={cfg.text} />
          <span className={`text-[10px] font-bold uppercase tracking-tight ${cfg.text}`}>{cfg.label}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-1 bg-indigo-500/20 px-2.5 py-1 rounded-full">
        <ShieldCheck size={12} className="text-indigo-400" />
        <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-tight">Hash Stored</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black z-[110] flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 z-10">
        <button
          onClick={onClose}
          className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
        >
          <X size={22} className="text-white" />
        </button>
        {canDelete && onDelete && (
          <button
            onClick={onDelete}
            className="p-2 bg-white/10 rounded-full hover:bg-rose-500/80 transition-colors"
          >
            <Trash2 size={20} className="text-white" />
          </button>
        )}
      </div>

      {/* Media Content */}
      <div className="flex-1 flex items-center justify-center px-4" onClick={onClose}>
        {media.type === 'video' ? (
          <video
            src={media.url}
            controls
            autoPlay
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <img
            src={media.url}
            alt={media.caption || 'Media'}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>

      {/* Bottom Info Bar */}
      <div className="p-4 bg-gradient-to-t from-black/80 to-transparent" onClick={(e) => e.stopPropagation()}>
        {media.caption && (
          <p className="text-white text-sm font-medium mb-2">{media.caption}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-white/70 text-xs font-bold">{uploaderName}</span>
            <span className="text-white/40 text-[10px] uppercase tracking-wider font-bold">{media.date}</span>
          </div>
          {getStatusBadge()}
        </div>

        {/* Verification Panel */}
        <div className="mt-3 space-y-2">
          {media.blockchainHash ? (
            <>
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                {verifying ? (
                  <Loader size={14} className="animate-spin" />
                ) : (
                  <Fingerprint size={14} />
                )}
                <span>{verifying ? 'Verifying...' : 'Verify Integrity'}</span>
              </button>

              {/* Expandable Hash Details */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-center space-x-1 py-1.5 text-white/50 text-[10px] font-bold uppercase tracking-wider hover:text-white/70 transition-colors"
              >
                <span>Hash Details</span>
                {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {showDetails && (
                <div className="bg-white/5 rounded-xl p-3 space-y-2">
                  <div>
                    <p className="text-white/40 text-[10px] uppercase tracking-wider font-bold mb-0.5">Stored Hash</p>
                    <p className="text-white/80 text-[11px] font-mono break-all">{media.blockchainHash}</p>
                  </div>
                  {verificationResult?.currentHash && verificationResult.status === 'tampered' && (
                    <div>
                      <p className="text-rose-400/80 text-[10px] uppercase tracking-wider font-bold mb-0.5">Current Hash</p>
                      <p className="text-rose-300/80 text-[11px] font-mono break-all">{verificationResult.currentHash}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <button
              onClick={handleGenerateHash}
              disabled={generatingHash}
              className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600/30 hover:bg-indigo-600/50 rounded-xl text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              {generatingHash ? (
                <Loader size={14} className="animate-spin" />
              ) : (
                <Fingerprint size={14} />
              )}
              <span>{generatingHash ? 'Generating Hash...' : 'Generate Hash'}</span>
            </button>
          )}

          {/* Verification Result Message */}
          {verificationResult && (
            <div className={`rounded-xl px-3 py-2 text-xs font-medium ${
              verificationResult.status === 'valid' ? 'bg-emerald-500/10 text-emerald-300' :
              verificationResult.status === 'tampered' ? 'bg-rose-500/10 text-rose-300' :
              'bg-amber-500/10 text-amber-300'
            }`}>
              {verificationResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaLightbox;
