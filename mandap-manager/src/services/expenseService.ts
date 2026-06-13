import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { Expense } from '@/types';
import { docToData, stripUndefined } from '@/utils/helpers';

const col = collection(db, COLLECTIONS.expenses);

export async function getExpenses(): Promise<Expense[]> {
  const q = query(col, orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToData<Expense>(d.id, d.data()));
}

export async function getExpense(id: string): Promise<Expense | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.expenses, id));
  if (!snap.exists()) return null;
  return docToData<Expense>(snap.id, snap.data());
}

export async function createExpense(
  data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = await addDoc(col, stripUndefined({
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  return ref.id;
}

export async function updateExpense(id: string, data: Partial<Expense>): Promise<void> {
  const { id: _, createdAt, ...rest } = data;
  await updateDoc(doc(db, COLLECTIONS.expenses, id), stripUndefined({
    ...rest,
    updatedAt: serverTimestamp(),
  }));
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.expenses, id));
}

export async function getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
  const all = await getExpenses();
  return all.filter((e) => e.date >= startDate && e.date <= endDate);
}

export async function getDailyExpenses(date: string): Promise<Expense[]> {
  const all = await getExpenses();
  return all.filter((e) => e.date === date);
}

export async function getMonthlyExpenses(year: number, month: number): Promise<Expense[]> {
  const all = await getExpenses();
  return all.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });
}
