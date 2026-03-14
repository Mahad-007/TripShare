
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, MapPin, AlignLeft, Image as ImageIcon, ChevronRight, Globe } from 'lucide-react';
import { useTrips } from '../contexts/TripContext';
import { useAuth } from '../contexts/AuthContext';
import { Trip } from '../types';
import { uploadCoverImage, deleteCoverImage, isStorageUrl } from '../services/storageService';

const EditTripPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { getTripById, refreshTrip, updateTrip } = useTrips();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [trip, setTrip] = useState<Trip | null | undefined>(undefined);
  const [formData, setFormData] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    description: '',
    coverImage: '',
    isPublic: false,
    status: 'draft' as 'draft' | 'active' | 'completed' | 'archived',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  useEffect(() => {
    if (!tripId) return;
    const cached = getTripById(tripId);
    if (cached) {
      setTrip(cached);
      setFormData({
        title: cached.title,
        destination: cached.destination,
        startDate: cached.startDate,
        endDate: cached.endDate,
        description: cached.description,
        coverImage: cached.coverImage,
        isPublic: cached.isPublic,
        status: cached.status,
      });
      setPreviewUrl(cached.coverImage);
    } else {
      refreshTrip(tripId).then((fetched) => {
        if (fetched) {
          setTrip(fetched);
          setFormData({
            title: fetched.title,
            destination: fetched.destination,
            startDate: fetched.startDate,
            endDate: fetched.endDate,
            description: fetched.description,
            coverImage: fetched.coverImage,
            isPublic: fetched.isPublic,
            status: fetched.status,
          });
          setPreviewUrl(fetched.coverImage);
        } else {
          setTrip(null);
        }
      });
    }
  }, [tripId, getTripById, refreshTrip]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (selectedFile && previewUrl && !previewUrl.startsWith('http')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [selectedFile, previewUrl]);

  // Owner check
  if (trip && user && trip.ownerId !== user.id) {
    navigate(`/trip/${tripId}`, { replace: true });
    return null;
  }

  if (trip === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-200 border-t-indigo-600"></div>
      </div>
    );
  }

  if (trip === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <p className="text-slate-500 font-medium">Trip not found</p>
        <button onClick={() => navigate('/')} className="text-indigo-600 font-bold hover:underline">Go back home</button>
      </div>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setSubmitError('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('File is too large. Maximum size is 5MB.');
      return;
    }

    setSubmitError('');
    // Revoke old object URL preview if exists
    if (selectedFile && previewUrl && !previewUrl.startsWith('http')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim() || formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters.';
    } else if (formData.title.trim().length > 100) {
      newErrors.title = 'Title must be under 100 characters.';
    }
    if (!formData.destination.trim()) newErrors.destination = 'Destination is required.';
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required.';
    } else if (formData.startDate < new Date().toISOString().split('T')[0]) {
      newErrors.startDate = 'Start date cannot be in the past.';
    }
    if (!formData.endDate) newErrors.endDate = 'End date is required.';
    if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
      newErrors.endDate = 'End date must be on or after start date.';
    }
    if (formData.description.length > 500) {
      newErrors.description = `Description too long (${formData.description.length}/500).`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      let coverImage = formData.coverImage;
      const oldCoverImage = trip.coverImage;

      if (selectedFile && user) {
        setUploadProgress(0);
        coverImage = await uploadCoverImage(selectedFile, user.id, setUploadProgress);
      }

      await updateTrip(tripId!, {
        title: formData.title,
        destination: formData.destination,
        startDate: formData.startDate,
        endDate: formData.endDate,
        description: formData.description,
        coverImage,
        isPublic: formData.isPublic,
        status: formData.status,
      });

      // Clean up old cover image after successful update
      if (selectedFile && oldCoverImage && isStorageUrl(oldCoverImage)) {
        deleteCoverImage(oldCoverImage).catch(() => {});
      }

      navigate(`/trip/${tripId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to update trip. Please try again.');
      setUploadProgress(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="px-6 py-4 flex items-center border-b border-slate-100 bg-white sticky top-0 z-10">
        <button onClick={() => navigate(`/trip/${tripId}`)} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h2 className="ml-2 text-xl font-bold text-slate-800">Edit Trip</h2>
      </div>

      {submitError && (
        <div className="mx-6 mt-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-sm font-medium">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto no-scrollbar">
        {/* Banner Preview */}
        <div
          className="relative h-44 rounded-3xl overflow-hidden group cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <img
            src={previewUrl}
            alt="Cover preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl text-white flex items-center space-x-2">
              <ImageIcon size={20} />
              <span className="text-xs font-bold uppercase tracking-wider">Change Cover</span>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Trip Name</label>
            <input
              required
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              type="text"
              className={`w-full bg-slate-50 border py-3.5 px-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold ${errors.title ? 'border-rose-300' : 'border-slate-100'}`}
            />
            {errors.title && <p className="text-rose-500 text-xs font-medium ml-1">{errors.title}</p>}
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
                className={`w-full bg-slate-50 border py-3.5 pl-11 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold ${errors.destination ? 'border-rose-300' : 'border-slate-100'}`}
              />
            </div>
            {errors.destination && <p className="text-rose-500 text-xs font-medium ml-1">{errors.destination}</p>}
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
                  className={`w-full bg-slate-50 border py-3.5 pl-11 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold text-sm ${errors.startDate ? 'border-rose-300' : 'border-slate-100'}`}
                />
              </div>
              {errors.startDate && <p className="text-rose-500 text-xs font-medium ml-1">{errors.startDate}</p>}
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
                  className={`w-full bg-slate-50 border py-3.5 pl-11 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold text-sm ${errors.endDate ? 'border-rose-300' : 'border-slate-100'}`}
                />
              </div>
              {errors.endDate && <p className="text-rose-500 text-xs font-medium ml-1">{errors.endDate}</p>}
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
                className={`w-full bg-slate-50 border py-3.5 pl-11 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm resize-none ${errors.description ? 'border-rose-300' : 'border-slate-100'}`}
              />
            </div>
            {errors.description && <p className="text-rose-500 text-xs font-medium ml-1">{errors.description}</p>}
          </div>

          {/* Status selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, status: e.target.value as 'draft' | 'active' | 'completed' | 'archived' }));
              }}
              className="w-full bg-slate-50 border border-slate-100 py-3.5 px-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold text-sm"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <label className="flex items-center space-x-3 px-1 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isPublic}
              onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
              className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div className="flex items-center space-x-2">
              <Globe size={16} className="text-indigo-500" />
              <span className="text-sm font-medium text-slate-700">Make this trip public on Explore</span>
            </div>
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-indigo-100 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {submitting ? (
            uploadProgress !== null ? (
              <span>Uploading... {uploadProgress}%</span>
            ) : (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
            )
          ) : (
            <>
              <span>Save Changes</span>
              <ChevronRight size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default EditTripPage;
