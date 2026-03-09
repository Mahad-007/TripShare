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
  arrayUnion,
  arrayRemove,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Trip, FirestoreTrip, TripFormData, User } from '../types';

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

export async function addParticipantByEmail(
  tripId: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  const q = query(collection(db, 'users'), where('email', '==', email));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return { success: false, error: 'No user found with this email.' };
  }

  const userId = snapshot.docs[0].id;

  // Check if already a participant
  const tripSnap = await getDoc(doc(db, 'trips', tripId));
  if (tripSnap.exists()) {
    const tripData = tripSnap.data() as FirestoreTrip;
    if (tripData.participantIds.includes(userId)) {
      return { success: false, error: 'User is already a participant.' };
    }
  }

  await updateDoc(doc(db, 'trips', tripId), {
    participantIds: arrayUnion(userId),
    updatedAt: new Date().toISOString(),
  });

  return { success: true };
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
