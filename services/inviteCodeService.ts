import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  writeBatch,
  FirestoreError,
} from 'firebase/firestore';
import { db } from './firebase';
import { FirestoreTrip } from '../types';
import { generateInviteCode } from '../utils/generateCode';
import { sendNotification } from './notificationService';

export interface JoinByCodeResult {
  ok: boolean;
  tripId?: string;
  alreadyMember?: boolean;
  error?: string;
}

// Dedupe concurrent ensureInviteCode calls (StrictMode double-effect, fast remounts)
const inFlight = new Map<string, Promise<string>>();

async function ensureInviteCodeInner(tripId: string, ownerId: string): Promise<string> {
  const tripRef = doc(db, 'trips', tripId);
  const tripSnap = await getDoc(tripRef);
  if (!tripSnap.exists()) throw new Error('Trip not found');

  const trip = tripSnap.data() as FirestoreTrip;
  if (trip.inviteCode) return trip.inviteCode;
  if (trip.ownerId !== ownerId) throw new Error('Only the trip owner can generate an invite code.');

  const now = new Date().toISOString();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    const codeRef = doc(db, 'inviteCodes', code);
    try {
      const batch = writeBatch(db);
      batch.set(codeRef, { tripId, createdBy: ownerId, createdAt: now });
      batch.update(tripRef, { inviteCode: code, updatedAt: now });
      await batch.commit();
      return code;
    } catch (err) {
      const fsErr = err as FirestoreError;
      if (fsErr.code === 'already-exists' || fsErr.code === 'permission-denied') {
        continue;
      }
      throw err;
    }
  }
  throw new Error('Failed to generate a unique invite code. Please try again.');
}

export async function ensureInviteCode(tripId: string, ownerId: string): Promise<string> {
  const existing = inFlight.get(tripId);
  if (existing) return existing;

  const promise = ensureInviteCodeInner(tripId, ownerId).finally(() => {
    inFlight.delete(tripId);
  });
  inFlight.set(tripId, promise);
  return promise;
}

// knownTripIds lets the caller (Dashboard) short-circuit when the user is
// already a member. We cannot read the trip document directly — a non-member
// has no read permission on private trips — so "already a member" is checked
// locally via the caller's subscribed trips list.
export async function joinByCode(
  code: string,
  userId: string,
  knownTripIds?: string[]
): Promise<JoinByCodeResult> {
  if (!code) return { ok: false, error: 'Please enter an invite code.' };

  const codeRef = doc(db, 'inviteCodes', code);
  let codeSnap;
  try {
    codeSnap = await getDoc(codeRef);
  } catch {
    return { ok: false, error: 'Could not look up invite code. Check your connection and try again.' };
  }
  if (!codeSnap.exists()) return { ok: false, error: 'Invalid invite code.' };

  const codeData = codeSnap.data() as { tripId?: string; createdBy?: string };
  const tripId = codeData.tripId;
  if (!tripId) return { ok: false, error: 'Invite code is malformed.' };

  if (knownTripIds?.includes(tripId)) {
    return { ok: true, tripId, alreadyMember: true };
  }

  try {
    await updateDoc(doc(db, 'trips', tripId), {
      participantIds: arrayUnion(userId),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const fsErr = err as FirestoreError;
    if (fsErr.code === 'permission-denied') {
      // Either the trip no longer exists, or the user is already a member but
      // wasn't in knownTripIds (stale subscription). Retry with a generic msg.
      return {
        ok: false,
        error: 'Unable to join. The code may be invalid, or the trip no longer exists.',
      };
    }
    return { ok: false, error: 'Failed to join the trip. Please try again.' };
  }

  // Notify the trip owner using `createdBy` from the inviteCodes doc as a
  // stand-in for trip.ownerId (we can't read the trip without being a member).
  // createdBy == ownerId holds for all current code-creation flows.
  if (codeData.createdBy) {
    sendNotification(
      codeData.createdBy,
      'invitation_accepted',
      'A new member joined your trip via invite code',
      { tripId }
    ).catch(() => {});
  }

  return { ok: true, tripId };
}

// Owner-only create used during trip creation — exported so tripService can call it
// via the same writeBatch. Returns the code + the doc refs to include in the batch.
export function prepareInviteCodeWrite(tripId: string, ownerId: string) {
  const code = generateInviteCode();
  const codeRef = doc(db, 'inviteCodes', code);
  const now = new Date().toISOString();
  return {
    code,
    codeRef,
    codeData: { tripId, createdBy: ownerId, createdAt: now },
  };
}
