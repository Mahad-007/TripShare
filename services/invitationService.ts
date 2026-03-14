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
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Invitation, FirestoreInvitation } from '../types';
import { sendNotification } from './notificationService';

export async function sendInvitation(
  tripId: string,
  tripTitle: string,
  fromUserId: string,
  fromUserName: string,
  toEmail: string
): Promise<{ success: boolean; error?: string }> {
  // Look up user by email
  const userQuery = query(collection(db, 'users'), where('email', '==', toEmail));
  const userSnap = await getDocs(userQuery);

  if (userSnap.empty) {
    return { success: false, error: 'No user found with this email.' };
  }

  const toUserId = userSnap.docs[0].id;

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

  // Check for existing pending invitation
  const invQuery = query(
    collection(db, 'invitations'),
    where('tripId', '==', tripId),
    where('toUserId', '==', toUserId),
    where('status', '==', 'pending')
  );
  const invSnap = await getDocs(invQuery);
  if (!invSnap.empty) {
    return { success: false, error: 'An invitation is already pending for this user.' };
  }

  const invData: FirestoreInvitation = {
    tripId,
    tripTitle,
    fromUserId,
    fromUserName,
    toUserId,
    toEmail,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  await addDoc(collection(db, 'invitations'), invData);

  // Notify the invitee
  sendNotification(
    toUserId,
    'invitation',
    `${fromUserName} invited you to join "${tripTitle}"`,
    { tripId }
  ).catch(() => {});

  return { success: true };
}

export async function acceptInvitation(invitationId: string): Promise<void> {
  const invRef = doc(db, 'invitations', invitationId);
  const invSnap = await getDoc(invRef);
  if (!invSnap.exists()) throw new Error('Invitation not found');

  const inv = invSnap.data() as FirestoreInvitation;

  await updateDoc(invRef, { status: 'accepted' });

  // Add user to trip participants
  await updateDoc(doc(db, 'trips', inv.tripId), {
    participantIds: arrayUnion(inv.toUserId),
    updatedAt: new Date().toISOString(),
  });

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
