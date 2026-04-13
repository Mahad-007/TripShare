import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  arrayUnion,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Invitation, FirestoreInvitation } from '../types';
import { sendNotification } from './notificationService';
import { sendInvitationEmail } from './emailService';

export interface SendInvitationResult {
  success: boolean;
  error?: string;
  emailSent?: boolean;
  emailError?: string;
  invitationId?: string;
}

export async function sendInvitation(
  tripId: string,
  tripTitle: string,
  fromUserId: string,
  fromUserName: string,
  toEmail: string,
  tripDestination?: string
): Promise<SendInvitationResult> {
  const normalizedEmail = toEmail.trim().toLowerCase();

  // Look up user by email
  const userQuery = query(collection(db, 'users'), where('email', '==', normalizedEmail));
  const userSnap = await getDocs(userQuery);

  let toUserId = '';
  const userExists = !userSnap.empty;

  if (userExists) {
    toUserId = userSnap.docs[0].id;

    if (toUserId === fromUserId) {
      return { success: false, error: 'You cannot invite yourself.' };
    }

    // Check if already a participant
    const tripSnap = await getDoc(doc(db, 'trips', tripId));
    if (tripSnap.exists()) {
      const tripData = tripSnap.data();
      if (tripData.participantIds?.includes(toUserId)) {
        return { success: false, error: 'User is already a participant.' };
      }
    }
  }

  // Check for existing pending invitation by email (covers both registered and unregistered)
  const invQuery = query(
    collection(db, 'invitations'),
    where('toEmail', '==', normalizedEmail),
    where('tripId', '==', tripId),
    where('status', '==', 'pending')
  );
  const invSnap = await getDocs(invQuery);
  if (!invSnap.empty) {
    return { success: false, error: 'An invitation is already pending for this email.' };
  }

  const invData: FirestoreInvitation = {
    tripId,
    tripTitle,
    fromUserId,
    fromUserName,
    toUserId,
    toEmail: normalizedEmail,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const newInvRef = await addDoc(collection(db, 'invitations'), invData);

  // Send actual email (awaited so caller knows whether it went out)
  const emailResult = await sendInvitationEmail(
    normalizedEmail,
    fromUserName,
    tripTitle,
    tripDestination || '',
    newInvRef.id
  );

  // If user exists, also send in-app notification
  if (userExists && toUserId) {
    sendNotification(
      toUserId,
      'invitation',
      `${fromUserName} invited you to join "${tripTitle}"`,
      { tripId }
    ).catch(() => {});
  }

  return {
    success: true,
    invitationId: newInvRef.id,
    emailSent: emailResult.ok,
    emailError: emailResult.ok ? undefined : emailResult.error,
  };
}

export async function acceptInvitation(invitationId: string): Promise<void> {
  const invRef = doc(db, 'invitations', invitationId);
  const invSnap = await getDoc(invRef);
  if (!invSnap.exists()) throw new Error('Invitation not found');

  const inv = invSnap.data() as FirestoreInvitation;
  if (!inv.toUserId) {
    throw new Error('Invitation is not linked to your account yet. Please sign out and back in.');
  }

  const tripRef = doc(db, 'trips', inv.tripId);
  const batch = writeBatch(db);
  batch.update(invRef, { status: 'accepted' });
  batch.update(tripRef, {
    participantIds: arrayUnion(inv.toUserId),
    updatedAt: new Date().toISOString(),
  });
  await batch.commit();

  // Notify trip owner
  sendNotification(
    inv.fromUserId,
    'invitation_accepted',
    `Your invitation to "${inv.tripTitle}" was accepted`,
    { tripId: inv.tripId }
  ).catch(() => {});
}

export async function declineInvitation(invitationId: string): Promise<void> {
  await updateDoc(doc(db, 'invitations', invitationId), {
    status: 'declined',
  });
}

export function subscribeToInvitations(
  userId: string,
  callback: (invitations: Invitation[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'invitations'),
    where('toUserId', '==', userId),
    where('status', '==', 'pending')
  );

  return onSnapshot(q, (snapshot) => {
    const invitations: Invitation[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        tripId: data.tripId || '',
        tripTitle: data.tripTitle || '',
        fromUserId: data.fromUserId || '',
        fromUserName: data.fromUserName || '',
        toUserId: data.toUserId || '',
        toEmail: data.toEmail || '',
        status: data.status || 'pending',
        createdAt: data.createdAt || '',
      };
    });
    callback(invitations);
  });
}

/**
 * After login/registration, find pending invitations addressed to this
 * user's email that haven't been linked to a userId yet, and link them.
 * This makes them appear in the Dashboard's subscribeToInvitations query.
 */
export async function linkPendingInvitations(
  userId: string,
  userEmail: string
): Promise<number> {
  const normalizedEmail = userEmail.trim().toLowerCase();

  const q = query(
    collection(db, 'invitations'),
    where('toEmail', '==', normalizedEmail),
    where('toUserId', '==', ''),
    where('status', '==', 'pending')
  );

  const snap = await getDocs(q);
  if (snap.empty) return 0;

  const updates = snap.docs.map((docSnap) =>
    updateDoc(docSnap.ref, { toUserId: userId })
  );

  await Promise.all(updates);
  return snap.docs.length;
}
