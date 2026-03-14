import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { ref, getBytes } from 'firebase/storage';
import { db, storage } from './firebase';
import { VerificationResult, VerificationLogEntry, FirestoreVerificationLog } from '../types';

// --- SHA-256 Hashing ---

export async function generateFileHash(data: Blob): Promise<string> {
  const buffer = await data.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// --- Verification Log ---

export async function logVerification(
  mediaId: string,
  tripId: string,
  hash: string,
  verifiedBy: string,
  status: FirestoreVerificationLog['status']
): Promise<void> {
  const entry: FirestoreVerificationLog = {
    mediaId,
    tripId,
    hash,
    verifiedBy,
    status,
    timestamp: new Date().toISOString(),
  };
  await addDoc(collection(db, 'verificationLog'), entry);
}

export async function getVerificationHistory(mediaId: string): Promise<VerificationLogEntry[]> {
  const q = query(
    collection(db, 'verificationLog'),
    where('mediaId', '==', mediaId),
    orderBy('timestamp', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as FirestoreVerificationLog),
  }));
}

// --- Verify Media Integrity ---

export async function verifyMediaIntegrity(
  tripId: string,
  mediaId: string,
  storagePath: string | undefined,
  storedHash: string | undefined,
  verifiedBy: string
): Promise<VerificationResult> {
  const timestamp = new Date().toISOString();

  if (!storedHash) {
    return { status: 'no_hash', message: 'No hash stored for this media. Generate a hash first.', timestamp };
  }

  if (!storagePath) {
    return { status: 'error', message: 'No storage path available. Try regenerating the hash.', timestamp };
  }

  try {
    const fileRef = ref(storage, storagePath);
    const bytes = await getBytes(fileRef);
    const blob = new Blob([bytes]);
    const currentHash = await generateFileHash(blob);

    const status = currentHash === storedHash ? 'valid' : 'tampered';
    const message = status === 'valid'
      ? 'File integrity verified — content matches the stored hash.'
      : 'Hash mismatch detected — file content differs from the original upload.';

    await logVerification(mediaId, tripId, currentHash, verifiedBy, status);

    return { status, currentHash, storedHash, message, timestamp };
  } catch (err) {
    const message = `Verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
    await logVerification(mediaId, tripId, '', verifiedBy, 'error').catch(() => {});
    return { status: 'error', message, timestamp };
  }
}

// --- Generate Hash for Pre-Phase-6 Media ---

export async function generateHashForExistingMedia(
  tripId: string,
  mediaId: string,
  storagePath: string | undefined,
  mediaUrl: string,
  userId: string
): Promise<string> {
  let blob: Blob;

  if (storagePath) {
    const fileRef = ref(storage, storagePath);
    const bytes = await getBytes(fileRef);
    blob = new Blob([bytes]);
  } else {
    const response = await fetch(mediaUrl);
    if (!response.ok) throw new Error('Failed to download media file.');
    blob = await response.blob();
  }

  const hash = await generateFileHash(blob);

  // Update the media document
  const mediaDocRef = doc(db, 'trips', tripId, 'media', mediaId);
  await updateDoc(mediaDocRef, {
    blockchainHash: hash,
    isVerified: true,
  });

  await logVerification(mediaId, tripId, hash, userId, 'hash_generated');

  return hash;
}
