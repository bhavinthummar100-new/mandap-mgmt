import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { Inquiry } from '@/types';
import { docToData, stripUndefined } from '@/utils/helpers';

const col = collection(db, COLLECTIONS.inquiries);

export async function getInquiries(): Promise<Inquiry[]> {
  const q = query(col, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToData<Inquiry>(d.id, d.data()));
}

export async function getInquiry(id: string): Promise<Inquiry | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.inquiries, id));
  if (!snap.exists()) return null;
  return docToData<Inquiry>(snap.id, snap.data());
}

export async function createInquiry(
  data: Omit<Inquiry, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<string> {
  const ref = await addDoc(col, stripUndefined({
    ...data,
    status: 'new',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  return ref.id;
}

export async function updateInquiry(id: string, data: Partial<Inquiry>): Promise<void> {
  const { id: _, createdAt, ...rest } = data;
  await updateDoc(doc(db, COLLECTIONS.inquiries, id), stripUndefined({
    ...rest,
    updatedAt: serverTimestamp(),
  }));
}

