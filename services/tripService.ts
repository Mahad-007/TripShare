import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  arrayRemove,
  orderBy,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import { Trip, FirestoreTrip, TripFormData, User } from '../types';
import { deleteCoverImage, isStorageUrl } from './storageService';

// Module-level user cache to avoid redundant reads
const userCache = new Map<string, User>();

export function clearUserCache() {
  userCache.clear();
}

async function hydrateParticipants(participantIds: string[]): Promise<User[]> {
  const users: User[] = [];
  const uncachedIds = participantIds.filter((id) => !userCache.has(id));

  // Fetch uncached users
  if (uncachedIds.length > 0) {
    const promises = uncachedIds.map(async (uid) => {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
          const data = snap.data();
          const user: User = {
            id: uid,
            name: data.name || 'Unknown User',
            email: data.email || '',
            avatar: data.avatar || undefined,
          };
          userCache.set(uid, user);
        } else {
          userCache.set(uid, { id: uid, name: 'Unknown User', email: '' });
        }
      } catch {
        userCache.set(uid, { id: uid, name: 'Unknown User', email: '' });
      }
    });
    await Promise.all(promises);
  }

  for (const id of participantIds) {
    const cached = userCache.get(id);
    if (cached) users.push(cached);
  }
  return users;
}

function docToTrip(id: string, data: FirestoreTrip, participants: User[]): Trip {
  return {
    id,
    title: data.title || '',
    destination: data.destination || '',
    startDate: data.startDate || '',
    endDate: data.endDate || '',
    description: data.description || '',
    ownerId: data.ownerId || '',
    participantIds: data.participantIds || [],
    participants,
    coverImage: data.coverImage || '',
    status: data.status || 'draft',
    isPublic: data.isPublic ?? false,
    createdAt: data.createdAt || '',
    updatedAt: data.updatedAt || '',
  };
}

export async function createTrip(data: TripFormData, ownerId: string): Promise<string> {
  const now = new Date().toISOString();
  const firestoreData: FirestoreTrip = {
    title: data.title,
    destination: data.destination,
    startDate: data.startDate,
    endDate: data.endDate,
    description: data.description,
    coverImage: data.coverImage,
    ownerId,
    participantIds: [ownerId],
    status: 'draft',
    isPublic: data.isPublic ?? false,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(collection(db, 'trips'), firestoreData);
  return docRef.id;
}

export async function updateTrip(tripId: string, data: Partial<FirestoreTrip>): Promise<void> {
  await updateDoc(doc(db, 'trips', tripId), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteTrip(tripId: string): Promise<void> {
  // Clean up cover image from Storage if applicable
  const tripSnap = await getDoc(doc(db, 'trips', tripId));
  if (tripSnap.exists()) {
    const data = tripSnap.data() as FirestoreTrip;
    if (data.coverImage && isStorageUrl(data.coverImage)) {
      deleteCoverImage(data.coverImage).catch(() => {});
    }
  }

  // Cascade delete: remove all expenses in the subcollection first
  const expensesSnap = await getDocs(collection(db, 'trips', tripId, 'expenses'));
  const expenseDocs = expensesSnap.docs;

  for (let i = 0; i < expenseDocs.length; i += 499) {
    const batch = writeBatch(db);
    const chunk = expenseDocs.slice(i, i + 499);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // Cascade delete: remove all media in the subcollection
  const mediaSnap = await getDocs(collection(db, 'trips', tripId, 'media'));
  const mediaDocs = mediaSnap.docs;

  for (let i = 0; i < mediaDocs.length; i += 499) {
    const batch = writeBatch(db);
    const chunk = mediaDocs.slice(i, i + 499);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // Clean up media Storage files
  for (const mediaDoc of mediaDocs) {
    const mData = mediaDoc.data();
    if (mData.url && isStorageUrl(mData.url)) {
      deleteObject(ref(storage, mData.url)).catch(() => {});
    }
    if (mData.thumbnailUrl && mData.thumbnailUrl !== mData.url && isStorageUrl(mData.thumbnailUrl)) {
      deleteObject(ref(storage, mData.thumbnailUrl)).catch(() => {});
    }
  }

  // Clean up pending invitations for this trip
  const invSnap = await getDocs(
    query(collection(db, 'invitations'), where('tripId', '==', tripId))
  );
  for (let i = 0; i < invSnap.docs.length; i += 499) {
    const batch = writeBatch(db);
    const chunk = invSnap.docs.slice(i, i + 499);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  await deleteDoc(doc(db, 'trips', tripId));
}

export async function getTripById(tripId: string): Promise<Trip | null> {
  const snap = await getDoc(doc(db, 'trips', tripId));
  if (!snap.exists()) return null;
  const data = snap.data() as FirestoreTrip;
  const participants = await hydrateParticipants(data.participantIds || []);
  return docToTrip(snap.id, data, participants);
}

export function subscribeToUserTrips(
  userId: string,
  callback: (trips: Trip[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'trips'),
    where('participantIds', 'array-contains', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, async (snapshot) => {
    const trips: Trip[] = [];
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as FirestoreTrip;
      const participants = await hydrateParticipants(data.participantIds || []);
      trips.push(docToTrip(docSnap.id, data, participants));
    }
    callback(trips);
  });
}

export async function removeParticipant(tripId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, 'trips', tripId), {
    participantIds: arrayRemove(userId),
    updatedAt: new Date().toISOString(),
  });
}

export function getUserRole(
  trip: Trip,
  userId: string
): 'owner' | 'participant' | 'none' {
  if (trip.ownerId === userId) return 'owner';
  if (trip.participantIds.includes(userId)) return 'participant';
  return 'none';
}
