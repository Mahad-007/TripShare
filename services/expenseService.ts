import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Expense, FirestoreExpense, ExpenseFormData } from '../types';
import { notifyTripParticipants } from './notificationService';

export async function addExpense(
  tripId: string,
  data: ExpenseFormData,
  createdBy: string,
  tripParticipantIds?: string[],
  tripTitle?: string
): Promise<string> {
  const firestoreData: FirestoreExpense = {
    amount: data.amount,
    description: data.description,
    payerId: data.payerId,
    date: data.date,
    participants: data.participants,
    createdBy,
    createdAt: new Date().toISOString(),
  };
  const docRef = await addDoc(
    collection(db, 'trips', tripId, 'expenses'),
    firestoreData
  );
  if (tripParticipantIds) {
    notifyTripParticipants(
      tripParticipantIds,
      createdBy,
      'expense_added',
      `New expense "${data.description}" (Rs. ${data.amount}) added to ${tripTitle || 'a trip'}`,
      { tripId, expenseId: docRef.id }
    ).catch(() => {});
  }
  return docRef.id;
}

export async function updateExpense(
  tripId: string,
  expenseId: string,
  data: Partial<FirestoreExpense>,
  actorId?: string,
  tripParticipantIds?: string[],
  tripTitle?: string
): Promise<void> {
  // Do not overwrite createdBy or createdAt
  const { createdBy: _cb, createdAt: _ca, ...safeData } = data as FirestoreExpense;
  await updateDoc(doc(db, 'trips', tripId, 'expenses', expenseId), safeData);
  if (tripParticipantIds && actorId) {
    notifyTripParticipants(
      tripParticipantIds,
      actorId,
      'expense_updated',
      `Expense "${data.description || ''}" updated in ${tripTitle || 'a trip'}`,
      { tripId, expenseId }
    ).catch(() => {});
  }
}

export async function deleteExpense(
  tripId: string,
  expenseId: string,
  actorId?: string,
  tripParticipantIds?: string[],
  tripTitle?: string
): Promise<void> {
  await deleteDoc(doc(db, 'trips', tripId, 'expenses', expenseId));
  if (tripParticipantIds && actorId) {
    notifyTripParticipants(
      tripParticipantIds,
      actorId,
      'expense_deleted',
      `An expense was deleted from ${tripTitle || 'a trip'}`,
      { tripId }
    ).catch(() => {});
  }
}

export function subscribeToExpenses(
  tripId: string,
  callback: (expenses: Expense[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'trips', tripId, 'expenses'),
    orderBy('date', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const expenses: Expense[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        tripId,
        amount: data.amount || 0,
        description: data.description || '',
        payerId: data.payerId || '',
        date: data.date || '',
        participants: data.participants || [],
        createdBy: data.createdBy || data.payerId || '',
        createdAt: data.createdAt || '',
      };
    });
    callback(expenses);
  });
}
