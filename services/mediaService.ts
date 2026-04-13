import {
  collection,
  collectionGroup,
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
  // On mobile, file.type can be empty or generic — fall back to extension check
  const type = file.type || '';
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'mp4', 'mov', 'webm'];
  if (!ALL_ALLOWED_TYPES.includes(type) && !type.startsWith('image/') && !type.startsWith('video/') && !validExtensions.includes(ext)) {
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
  onProgress?: (pct: number) => void,
  contentType?: string
): Promise<string> {
  const storageRef = ref(storage, path);
  const metadata = contentType ? { contentType } : undefined;
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, data, metadata);
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

export interface UploadTripContext {
  title?: string;
  destination?: string;
  ownerId?: string;
  participantIds?: string[];
}

export async function uploadMedia(
  tripId: string,
  data: MediaFormData,
  uploadedBy: string,
  onProgress?: (pct: number) => void,
  tripContext?: UploadTripContext
): Promise<string> {
  validateFile(data.file);

  // Infer type from MIME or extension (mobile file pickers may omit MIME)
  const fileType = data.file.type || '';
  const ext = data.file.name.split('.').pop()?.toLowerCase() || '';
  const isVideo = fileType.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(ext);
  const compressed = isVideo ? data.file : await compressImage(data.file);
  const blockchainHash = await generateFileHash(compressed);
  const thumbnail = await generateThumbnail(data.file);

  const sanitized = sanitizeFilename(data.file.name);
  const timestamp = Date.now();
  const mainPath = `trips/${tripId}/media/${timestamp}_${sanitized}`;

  // Upload main file (80% of progress)
  const mainContentType = isVideo ? (fileType || 'video/mp4') : 'image/jpeg';
  const mainUrl = await uploadToStorage(mainPath, compressed, (pct) => {
    onProgress?.(Math.round(pct * 0.8));
  }, mainContentType);

  // Upload thumbnail (20% of progress)
  let thumbnailUrl = mainUrl;
  if (thumbnail) {
    try {
      const thumbPath = `trips/${tripId}/media/thumbs/${timestamp}_${sanitized}`;
      thumbnailUrl = await uploadToStorage(thumbPath, thumbnail, (pct) => {
        onProgress?.(80 + Math.round(pct * 0.2));
      }, 'image/jpeg');
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
    isPublic: data.isPublic,
    // Denormalize trip metadata so Explore can render without reading the parent trip
    tripTitle: tripContext?.title || '',
    tripDestination: tripContext?.destination || '',
    tripOwnerId: tripContext?.ownerId || '',
    date: data.date,
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(
    collection(db, 'trips', tripId, 'media'),
    firestoreData
  );

  logVerification(docRef.id, tripId, blockchainHash, uploadedBy, 'initial').catch(() => {});

  if (tripContext?.participantIds) {
    notifyTripParticipants(
      tripContext.participantIds,
      uploadedBy,
      'media_uploaded',
      `New photo uploaded to ${tripContext.title || 'a trip'}`,
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

function firestoreToMedia(docId: string, tripId: string, data: Record<string, unknown>): Media {
  return {
    id: docId,
    tripId,
    url: (data.url as string) || '',
    thumbnailUrl: (data.thumbnailUrl as string) || (data.url as string) || '',
    type: ((data.type as string) || 'image') as 'image' | 'video',
    caption: (data.caption as string) || '',
    uploadedBy: (data.uploadedBy as string) || '',
    storagePath: (data.storagePath as string) || undefined,
    blockchainHash: (data.blockchainHash as string) || undefined,
    isVerified: (data.isVerified as boolean) ?? false,
    isPublic: (data.isPublic as boolean) ?? false,
    tripTitle: (data.tripTitle as string) || undefined,
    tripDestination: (data.tripDestination as string) || undefined,
    tripOwnerId: (data.tripOwnerId as string) || undefined,
    date: (data.date as string) || '',
    createdAt: (data.createdAt as string) || '',
  };
}

export function subscribeToMedia(
  tripId: string,
  callback: (media: Media[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'trips', tripId, 'media'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const media: Media[] = snapshot.docs.map((docSnap) =>
      firestoreToMedia(docSnap.id, tripId, docSnap.data())
    );
    callback(media);
  });
}

// --- Public Media Feed (for ExplorePage) ---

export interface ExplorePost {
  id: string;
  tripId: string;
  mediaId: string;
  tripTitle: string;
  destination: string;
  startDate: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  media: Media;
}

/**
 * Fetch public media across all trips using a collection-group query.
 * Each media doc carries denormalized trip metadata (tripTitle, tripDestination,
 * tripOwnerId) so we don't need to read the parent trip — critical because a
 * non-member has no read permission on a private trip even if it hosts a public
 * photo.
 *
 * Owner display metadata (name/avatar/startDate) is fetched separately from
 * the users collection (any authed user can read). `startDate` is not needed
 * for non-member rendering; we leave it blank when the trip can't be read.
 */
export async function fetchPublicMedia(limitCount: number = 15): Promise<ExplorePost[]> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out')), 10000)
  );

  const fetchData = async (): Promise<ExplorePost[]> => {
    const mediaQuery = query(
      collectionGroup(db, 'media'),
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limitCount)
    );
    const mediaSnap = await getDocs(mediaQuery);
    if (mediaSnap.empty) return [];

    // Hydrate owner (name, avatar) — cached per owner to dedupe reads.
    const ownerCache = new Map<string, { name: string; avatar?: string }>();
    const resolveOwner = async (ownerId: string): Promise<{ name: string; avatar?: string }> => {
      if (!ownerId) return { name: 'Unknown' };
      const cached = ownerCache.get(ownerId);
      if (cached) return cached;
      try {
        const userSnap = await getDoc(doc(db, 'users', ownerId));
        if (userSnap.exists()) {
          const u = userSnap.data();
          const info = { name: u.name || 'Unknown', avatar: u.avatar as string | undefined };
          ownerCache.set(ownerId, info);
          return info;
        }
      } catch { /* ignore */ }
      const info = { name: 'Unknown' };
      ownerCache.set(ownerId, info);
      return info;
    };

    // Optional trip-startDate cache (only used if we can read the trip,
    // which is true for public trips). Non-blocking and best-effort.
    const tripStartCache = new Map<string, string>();
    const resolveStartDate = async (tripId: string): Promise<string> => {
      const cached = tripStartCache.get(tripId);
      if (cached !== undefined) return cached;
      try {
        const tripSnap = await getDoc(doc(db, 'trips', tripId));
        if (tripSnap.exists()) {
          const d = (tripSnap.data().startDate as string) || '';
          tripStartCache.set(tripId, d);
          return d;
        }
      } catch { /* no read permission for private parent trip — expected */ }
      tripStartCache.set(tripId, '');
      return '';
    };

    const posts: ExplorePost[] = [];
    for (const mediaDoc of mediaSnap.docs) {
      const data = mediaDoc.data();
      // CollectionGroup path: `trips/{tripId}/media/{mediaId}`
      const tripId = mediaDoc.ref.parent.parent?.id;
      if (!tripId) continue;

      const ownerId = (data.tripOwnerId as string) || (data.uploadedBy as string) || '';
      const owner = await resolveOwner(ownerId);
      const startDate = await resolveStartDate(tripId);

      posts.push({
        id: `${tripId}_${mediaDoc.id}`,
        tripId,
        mediaId: mediaDoc.id,
        tripTitle: (data.tripTitle as string) || '',
        destination: (data.tripDestination as string) || '',
        startDate,
        ownerId,
        ownerName: owner.name,
        ownerAvatar: owner.avatar,
        media: firestoreToMedia(mediaDoc.id, tripId, data),
      });
    }

    return posts;
  };

  return Promise.race([fetchData(), timeout]);
}

/** @deprecated use fetchPublicMedia — kept as a thin alias for any lingering callers */
export const fetchPublicTripMedia = fetchPublicMedia;
