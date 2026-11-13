import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { Customer } from '@/types';
import { docToData, stripUndefined } from '@/utils/helpers';
import { uploadCustomerImage } from '@/utils/cloudinary';

const col = collection(db, COLLECTIONS.customers);

export async function getCustomers(): Promise<Customer[]> {
  const q = query(col, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToData<Customer>(d.id, d.data()));
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.customers, id));
  if (!snap.exists()) return null;
  return docToData<Customer>(snap.id, snap.data());
}

export async function searchCustomerByMobile(mobile: string): Promise<Customer | null> {
  const q = query(col, where('mobile', '==', mobile));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return docToData<Customer>(d.id, d.data());
}

export async function createCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalBookings'>): Promise<string> {
  const ref = await addDoc(col, stripUndefined({
    ...data,
    totalBookings: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  return ref.id;
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<void> {
  const rest = { ...data };
  delete rest.id;
  delete rest.createdAt;
  await updateDoc(doc(db, COLLECTIONS.customers, id), stripUndefined({
    ...rest,
    updatedAt: serverTimestamp(),
  }));
}

export async function uploadCustomerPhoto(id: string, file: File): Promise<string> {
  return uploadCustomerImage(file, id);
}

export async function deleteCustomer(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.customers, id));
}

export async function incrementCustomerBookings(id: string, eventDate: string): Promise<void> {
  const customer = await getCustomer(id);
  if (!customer) return;
  await updateCustomer(id, {
    totalBookings: customer.totalBookings + 1,
    lastEventDate: eventDate,
  });
}
