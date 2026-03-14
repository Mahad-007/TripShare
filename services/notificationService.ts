import { collection, addDoc, query, orderBy, onSnapshot, updateDoc, getDocs, writeBatch, where, doc, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { Notification } from '../types';

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

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'notifications', userId, 'items'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const notifications: Notification[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        type: data.type,
        message: data.message || '',
        data: data.data || {},
        read: data.read ?? false,
        createdAt: data.createdAt || '',
      };
    });
    callback(notifications);
  });
}

export function subscribeToUnreadCount(
  userId: string,
  callback: (count: number) => void
): Unsubscribe {
  const q = query(
    collection(db, 'notifications', userId, 'items'),
    where('read', '==', false)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  });
}

export async function markNotificationRead(
  userId: string,
  notifId: string
): Promise<void> {
  await updateDoc(doc(db, 'notifications', userId, 'items', notifId), { read: true });
}

export async function markAllNotificationsRead(
  userId: string
): Promise<void> {
  const q = query(
    collection(db, 'notifications', userId, 'items'),
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, { read: true });
  });
  await batch.commit();
}
