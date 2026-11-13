import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { Laborer, LaborAssignment, PaymentStatus } from '@/types';
import { docToData, stripUndefined } from '@/utils/helpers';
import { uploadSetupBoyImage } from '@/utils/cloudinary';

const laborCol = collection(db, COLLECTIONS.laborers);
const assignCol = collection(db, COLLECTIONS.laborAssignments);

export async function getLaborers(): Promise<Laborer[]> {
  const q = query(laborCol, orderBy('name', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToData<Laborer>(d.id, d.data()));
}

export async function getLaborer(id: string): Promise<Laborer | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.laborers, id));
  if (!snap.exists()) return null;
  return docToData<Laborer>(snap.id, snap.data());
}

export async function createLaborer(
  data: Omit<Laborer, 'id' | 'createdAt' | 'updatedAt'>,
  photoFile?: File | null,
): Promise<string> {
  const ref = doc(laborCol);
  const photoUrl = photoFile ? await uploadSetupBoyImage(photoFile, ref.id) : data.photoUrl;
  await setDoc(ref, stripUndefined({
    ...data,
    photoUrl,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  return ref.id;
}

export async function updateLaborer(id: string, data: Partial<Laborer>, photoFile?: File | null): Promise<void> {
  const photoUrl = photoFile ? await uploadSetupBoyImage(photoFile, id) : data.photoUrl;
  const rest = { ...data };
  delete rest.id;
  delete rest.createdAt;
  await updateDoc(doc(db, COLLECTIONS.laborers, id), stripUndefined({
    ...rest,
    photoUrl,
    updatedAt: serverTimestamp(),
  }));
}

export async function deleteLaborer(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.laborers, id));
}

export async function getLaborAssignments(bookingId?: string): Promise<LaborAssignment[]> {
  let q;
  if (bookingId) {
    q = query(assignCol, where('bookingId', '==', bookingId));
  } else {
    q = query(assignCol, orderBy('createdAt', 'desc'));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToData<LaborAssignment>(d.id, d.data()));
}

export async function assignLabor(
  bookingId: string,
  laborer: Laborer
): Promise<string> {
  const ref = await addDoc(assignCol, stripUndefined({
    bookingId,
    laborerId: laborer.id,
    laborerName: laborer.name,
    userId: laborer.userId ?? null,
    attendance: false,
    paymentAmount: laborer.dailyWage,
    paidStatus: 'pending' as PaymentStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  return ref.id;
}

export async function updateLaborAssignment(id: string, data: Partial<LaborAssignment>): Promise<void> {
  const rest = { ...data };
  delete rest.id;
  delete rest.createdAt;
  await updateDoc(doc(db, COLLECTIONS.laborAssignments, id), stripUndefined({
    ...rest,
    updatedAt: serverTimestamp(),
  }));
}

export async function deleteLaborAssignment(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.laborAssignments, id));
}

export async function getPendingLaborPayments(): Promise<LaborAssignment[]> {
  const all = await getLaborAssignments();
  return all.filter((a) => a.paidStatus !== 'completed');
}

export async function getLaborReport(): Promise<LaborAssignment[]> {
  return getLaborAssignments();
}
