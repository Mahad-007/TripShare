import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Image as ImageIcon, Calendar, AlignLeft, Upload, Loader, Lock, Globe } from 'lucide-react';
import { uploadMedia, validateFile } from '../services/mediaService';

interface UploadMediaModalProps {
  tripId: string;
  currentUserId: string;
  onClose: () => void;
  participantIds?: string[];
  tripTitle?: string;
  tripDestination?: string;
  tripOwnerId?: string;
  tripIsPublic?: boolean;
}

const UploadMediaModal: React.FC<UploadMediaModalProps> = ({
  tripId,
  currentUserId,
  onClose,
  participantIds,
  tripTitle,
  tripDestination,
  tripOwnerId,
  tripIsPublic,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  // Default the visibility to the trip's own setting so the user's prior choice
  // carries through. Owner can override per-photo.
  const [isPublic, setIsPublic] = useState<boolean>(tripIsPublic ?? false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    try {
      validateFile(selected);
      setError('');
      if (preview) URL.revokeObjectURL(preview);
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    } catch (err: any) {
      setError(err.message);
      setFile(null);
      setPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      await uploadMedia(
        tripId,
        { file, caption, date, isPublic },
        currentUserId,
        setUploadProgress,
        {
          title: tripTitle,
          destination: tripDestination,
          ownerId: tripOwnerId,
          participantIds,
        }
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  const fileExt = file?.name.split('.').pop()?.toLowerCase() || '';
  const isVideo = file?.type.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(fileExt);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Upload Media</h3>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* File Selection / Preview */}
          {!file ? (
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-700 text-center">Add Photo or Video</p>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center space-y-2 hover:border-teal-300 hover:bg-teal-50/50 transition-all"
                >
                  <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center">
                    <Camera size={24} className="text-teal-500" />
                  </div>
                  <p className="font-bold text-slate-700 text-xs">Camera</p>
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex-1 border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center space-y-2 hover:border-teal-300 hover:bg-teal-50/50 transition-all"
                >
                  <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center">
                    <ImageIcon size={24} className="text-teal-500" />
                  </div>
                  <p className="font-bold text-slate-700 text-xs">Gallery</p>
                </button>
              </div>
              <p className="text-xs text-slate-400 text-center">JPEG, PNG, WebP, MP4, MOV, WebM (max 10MB)</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative rounded-2xl overflow-hidden bg-slate-100">
                {isVideo ? (
                  <video
                    src={preview!}
                    controls
                    className="w-full max-h-64 object-contain"
                  />
                ) : (
                  <img
                    src={preview!}
                    alt="Preview"
                    className="w-full max-h-64 object-contain"
                  />
                )}
              </div>
              <div className="flex items-center justify-between px-1">
                <p className="text-xs text-slate-500 truncate max-w-[200px]">
                  {file.name} ({(file.size / (1024 * 1024)).toFixed(1)}MB)
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (preview) URL.revokeObjectURL(preview);
                    setFile(null);
                    setPreview(null);
                    if (cameraInputRef.current) cameraInputRef.current.value = '';
                    if (galleryInputRef.current) galleryInputRef.current.value = '';
                  }}
                  disabled={uploading}
                  className="text-xs text-teal-600 font-bold hover:text-teal-800"
                >
                  Change
                </button>
              </div>
            </div>
          )}

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Caption */}
          <div className="relative">
            <AlignLeft size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Add a caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 200))}
              disabled={uploading}
              className="w-full bg-slate-50 border border-slate-100 py-3.5 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-sm font-medium transition-all"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-300">
              {caption.length}/200
            </span>
          </div>

          {/* Date */}
          <div className="relative">
            <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={uploading}
              className="w-full bg-slate-50 border border-slate-100 py-3.5 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-sm font-medium transition-all"
            />
          </div>

          {/* Visibility Toggle */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Visibility</p>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                disabled={uploading}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
                  !isPublic
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-100'
                    : 'bg-slate-50 text-slate-500 border border-slate-100'
                }`}
              >
                <Lock size={14} />
                <span>Private</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                disabled={uploading}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
                  isPublic
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-100'
                    : 'bg-slate-50 text-slate-500 border border-slate-100'
                }`}
              >
                <Globe size={14} />
                <span>Public</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed ml-1">
              {isPublic
                ? 'This photo will appear in the public Explore feed once it\'s verified.'
                : 'Only trip members can see this photo.'}
            </p>
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-1.5">
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-teal-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 text-center font-medium">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium p-3 rounded-2xl">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full bg-teal-600 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {uploading ? (
              <>
                <Loader size={18} className="animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload size={18} />
                <span>Upload</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadMediaModal;
