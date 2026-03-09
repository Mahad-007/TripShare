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

export async function addExpense(
  tripId: string,
  data: ExpenseFormData,
  createdBy: string
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
  // TODO Phase 7: notify trip participants of new expense
  return docRef.id;
}

export async function updateExpense(
  tripId: string,
  expenseId: string,
  data: Partial<FirestoreExpense>
): Promise<void> {
  // Do not overwrite createdBy or createdAt
  const { createdBy: _cb, createdAt: _ca, ...safeData } = data as FirestoreExpense;
  await updateDoc(doc(db, 'trips', tripId, 'expenses', expenseId), safeData);
  // TODO Phase 7: notify trip participants of updated expense
}

export async function deleteExpense(
  tripId: string,
  expenseId: string
): Promise<void> {
  await deleteDoc(doc(db, 'trips', tripId, 'expenses', expenseId));
  // TODO Phase 7: notify trip participants of deleted expense
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
