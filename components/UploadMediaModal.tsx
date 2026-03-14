import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Calendar, AlignLeft, Upload, Loader } from 'lucide-react';
import { uploadMedia, validateFile } from '../services/mediaService';

interface UploadMediaModalProps {
  tripId: string;
  currentUserId: string;
  onClose: () => void;
  participantIds?: string[];
  tripTitle?: string;
}

const UploadMediaModal: React.FC<UploadMediaModalProps> = ({
  tripId,
  currentUserId,
  onClose,
  participantIds,
  tripTitle,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        { file, caption, date },
        currentUserId,
        setUploadProgress,
        participantIds,
        tripTitle
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  const isVideo = file?.type.startsWith('video/');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
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
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center space-y-3 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all"
            >
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
                <Camera size={28} className="text-indigo-500" />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-700 text-sm">Tap to capture or select</p>
                <p className="text-xs text-slate-400 mt-1">JPEG, PNG, WebP, MP4, MOV, WebM (max 10MB)</p>
              </div>
            </button>
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
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  disabled={uploading}
                  className="text-xs text-indigo-600 font-bold hover:text-indigo-800"
                >
                  Change
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
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
              className="w-full bg-slate-50 border border-slate-100 py-3.5 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-medium transition-all"
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
              className="w-full bg-slate-50 border border-slate-100 py-3.5 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-medium transition-all"
            />
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-1.5">
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
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
            className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
