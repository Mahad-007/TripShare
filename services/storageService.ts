import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function uploadCoverImage(
  file: File,
  userId: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
  }
  if (file.size > MAX_SIZE) {
    throw new Error('File is too large. Maximum size is 5MB.');
  }

  const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `covers/${userId}/${Date.now()}_${sanitized}`;
  const storageRef = ref(storage, path);

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);

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

export async function deleteCoverImage(imageUrl: string): Promise<void> {
  try {
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
  } catch (error: unknown) {
    // Silently succeed if object not found
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'storage/object-not-found') {
      return;
    }
    // Best-effort — never throw to callers
  }
}

export async function uploadAvatar(
  file: File,
  userId: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
  }
  if (file.size > MAX_SIZE) {
    throw new Error('File is too large. Maximum size is 5MB.');
  }

  const path = `avatars/${userId}/${Date.now()}_avatar`;
  const storageRef = ref(storage, path);

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);
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

export function isStorageUrl(url: string): boolean {
  return url.includes('firebasestorage.googleapis.com') || url.includes('firebasestorage.app');
}
