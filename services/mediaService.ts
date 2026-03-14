import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  onSnapshot,
  limit as firestoreLimit,
  Unsubscribe,
  updateDoc,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import { Media, FirestoreMedia, MediaFormData } from '../types';
import { notifyTripParticipants } from './notificationService';
import { generateFileHash, logVerification } from './blockchainService';

// --- Constants ---

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ALL_ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const COMPRESSION_MAX_DIMENSION = 1920;
const COMPRESSION_QUALITY = 0.7;
const THUMBNAIL_MAX_DIMENSION = 400;
const THUMBNAIL_QUALITY = 0.6;
const COMPRESSION_SKIP_THRESHOLD = 500 * 1024; // 500KB

// --- Validation ---

export function validateFile(file: File): void {
  if (!file || file.size === 0) {
    throw new Error('Please select a file to upload.');
  }
  if (!ALL_ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Unsupported file type. Please upload a JPEG, PNG, or WebP image, or an MP4, MOV, or WebM video.');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File is too large. Maximum size is 10MB.');
  }
}

// --- Image Compression (Canvas API) ---

async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;
  if (file.size < COMPRESSION_SKIP_THRESHOLD) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    let targetW = width;
    let targetH = height;
    if (width > COMPRESSION_MAX_DIMENSION || height > COMPRESSION_MAX_DIMENSION) {
      const ratio = Math.min(COMPRESSION_MAX_DIMENSION / width, COMPRESSION_MAX_DIMENSION / height);
      targetW = Math.round(width * ratio);
      targetH = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();

    return await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob || file),
        'image/jpeg',
        COMPRESSION_QUALITY
      );
    });
  } catch {
    return file;
  }
}

async function generateThumbnail(file: File): Promise<Blob | null> {
  try {
    if (file.type.startsWith('image/')) {
      const bitmap = await createImageBitmap(file);
      const { width, height } = bitmap;
      const ratio = Math.min(THUMBNAIL_MAX_DIMENSION / width, THUMBNAIL_MAX_DIMENSION / height, 1);
      const targetW = Math.round(width * ratio);
      const targetH = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0, targetW, targetH);
      bitmap.close();

      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject()),
          'image/jpeg',
          THUMBNAIL_QUALITY
        );
      });
    }

    if (file.type.startsWith('video/')) {
      return await new Promise<Blob | null>((resolve) => {
        const video = document.createElement('video');
        video.muted = true;
        video.preload = 'metadata';

        const objectUrl = URL.createObjectURL(file);
        video.src = objectUrl;

        const cleanup = () => URL.revokeObjectURL(objectUrl);
        const timeout = setTimeout(() => { cleanup(); resolve(null); }, 10000);

        video.onloadeddata = () => {
          video.currentTime = Math.min(1, video.duration / 2);
        };

        video.onseeked = () => {
          clearTimeout(timeout);
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(THUMBNAIL_MAX_DIMENSION, video.videoWidth);
          canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          cleanup();
          canvas.toBlob(
            (blob) => resolve(blob),
            'image/jpeg',
            THUMBNAIL_QUALITY
          );
        };

        video.onerror = () => { clearTimeout(timeout); cleanup(); resolve(null); };
      });
    }

    return null;
  } catch {
    return null;
  }
}

// --- Storage Upload Helpers ---

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function uploadToStorage(
  path: string,
  data: Blob,
  onProgress?: (pct: number) => void
): Promise<string> {
  const storageRef = ref(storage, path);
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, data);
    task.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress?.(pct);
      },
      (error) => reject(error),
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

function deleteStorageFile(url: string): Promise<void> {
  return deleteObject(ref(storage, url)).catch(() => {});
}

// --- Main Upload Function ---

export async function uploadMedia(
  tripId: string,
  data: MediaFormData,
  uploadedBy: string,
  onProgress?: (pct: number) => void,
  tripParticipantIds?: string[],
  tripTitle?: string
): Promise<string> {
  validateFile(data.file);

  const isVideo = data.file.type.startsWith('video/');
  const compressed = isVideo ? data.file : await compressImage(data.file);
  const blockchainHash = await generateFileHash(compressed);
  const thumbnail = await generateThumbnail(data.file);

  const sanitized = sanitizeFilename(data.file.name);
  const timestamp = Date.now();
  const mainPath = `trips/${tripId}/media/${timestamp}_${sanitized}`;

  // Upload main file (80% of progress)
  const mainUrl = await uploadToStorage(mainPath, compressed, (pct) => {
    onProgress?.(Math.round(pct * 0.8));
  });

  // Upload thumbnail (20% of progress)
  let thumbnailUrl = mainUrl;
  if (thumbnail) {
    try {
      const thumbPath = `trips/${tripId}/media/thumbs/${timestamp}_${sanitized}`;
      thumbnailUrl = await uploadToStorage(thumbPath, thumbnail, (pct) => {
        onProgress?.(80 + Math.round(pct * 0.2));
      });
    } catch {
      // Use main URL as fallback
    }
  }
  onProgress?.(100);

  const firestoreData: FirestoreMedia = {
    url: mainUrl,
    thumbnailUrl,
    storagePath: mainPath,
    type: isVideo ? 'video' : 'image',
    caption: data.caption || '',
    uploadedBy,
    blockchainHash,
    isVerified: true,
    date: data.date,
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(
    collection(db, 'trips', tripId, 'media'),
    firestoreData
  );

  logVerification(docRef.id, tripId, blockchainHash, uploadedBy, 'initial').catch(() => {});

  if (tripParticipantIds) {
    notifyTripParticipants(
      tripParticipantIds,
      uploadedBy,
      'media_uploaded',
      `New photo uploaded to ${tripTitle || 'a trip'}`,
      { tripId, mediaId: docRef.id }
    ).catch(() => {});
  }

  return docRef.id;
}

// --- Delete ---

export async function deleteMedia(
  tripId: string,
  mediaId: string,
  mediaUrl: string,
  thumbnailUrl: string
): Promise<void> {
  await deleteStorageFile(mediaUrl);
  if (thumbnailUrl && thumbnailUrl !== mediaUrl) {
    await deleteStorageFile(thumbnailUrl);
  }
  await deleteDoc(doc(db, 'trips', tripId, 'media', mediaId));
}

// --- Real-time Subscription ---

export function subscribeToMedia(
  tripId: string,
  callback: (media: Media[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'trips', tripId, 'media'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const media: Media[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        tripId,
        url: data.url || '',
        thumbnailUrl: data.thumbnailUrl || data.url || '',
        type: data.type || 'image',
        caption: data.caption || '',
        uploadedBy: data.uploadedBy || '',
        storagePath: data.storagePath || undefined,
        blockchainHash: data.blockchainHash || undefined,
        isVerified: data.isVerified ?? false,
        date: data.date || '',
        createdAt: data.createdAt || '',
      };
    });
    callback(media);
  });
}

// --- Public Trip Media (for ExplorePage) ---

export interface ExplorePost {
  id: string;
  tripTitle: string;
  destination: string;
  ownerName: string;
  ownerAvatar?: string;
  media: Media;
}

export async function fetchPublicTripMedia(limitCount: number = 15): Promise<ExplorePost[]> {
  // 1. Get public trips
  const tripsQuery = query(
    collection(db, 'trips'),
    where('isPublic', '==', true),
    firestoreLimit(20)
  );
  const tripsSnap = await getDocs(tripsQuery);
  if (tripsSnap.empty) return [];

  // 2. Fetch media from each public trip
  const posts: ExplorePost[] = [];

  for (const tripDoc of tripsSnap.docs) {
    const tripData = tripDoc.data();
    const mediaQuery = query(
      collection(db, 'trips', tripDoc.id, 'media'),
      orderBy('createdAt', 'desc'),
      firestoreLimit(3)
    );
    const mediaSnap = await getDocs(mediaQuery);

    // Get owner name from users collection
    let ownerName = 'Unknown';
    let ownerAvatar: string | undefined;
    try {
      const userSnap = await getDoc(doc(db, 'users', tripData.ownerId));
      if (userSnap.exists()) {
        const userData = userSnap.data();
        ownerName = userData.name || 'Unknown';
        ownerAvatar = userData.avatar;
      }
    } catch { /* ignore */ }

    for (const mediaDoc of mediaSnap.docs) {
      const data = mediaDoc.data();
      posts.push({
        id: `${tripDoc.id}_${mediaDoc.id}`,
        tripTitle: tripData.title || '',
        destination: tripData.destination || '',
        ownerName,
        ownerAvatar,
        media: {
          id: mediaDoc.id,
          tripId: tripDoc.id,
          url: data.url || '',
          thumbnailUrl: data.thumbnailUrl || data.url || '',
          type: data.type || 'image',
          caption: data.caption || '',
          uploadedBy: data.uploadedBy || '',
          storagePath: data.storagePath || undefined,
          blockchainHash: data.blockchainHash || undefined,
          isVerified: data.isVerified ?? false,
          date: data.date || '',
          createdAt: data.createdAt || '',
        },
      });
    }
  }

  // Sort by newest first and limit
  posts.sort((a, b) => b.media.createdAt.localeCompare(a.media.createdAt));
  return posts.slice(0, limitCount);
}
