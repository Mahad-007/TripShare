import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function sendNotification(
  userId: string,
  type: string,
  message: string,
  data?: Record<string, string>
): Promise<void> {
  await addDoc(collection(db, 'notifications', userId, 'items'), {
    type,
    message,
    data: data || {},
    read: false,
    createdAt: new Date().toISOString(),
  });
}

export async function notifyTripParticipants(
  participantIds: string[],
  excludeUserId: string,
  type: string,
  message: string,
  data?: Record<string, string>
): Promise<void> {
  const targets = participantIds.filter((id) => id !== excludeUserId);
  await Promise.all(
    targets.map((uid) => sendNotification(uid, type, message, data))
  );
}
