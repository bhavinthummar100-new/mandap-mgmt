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
import type { Vendor, VendorPayment } from '@/types';
import { docToData, stripUndefined } from '@/utils/helpers';

const vendorCol = collection(db, COLLECTIONS.vendors);
const paymentCol = collection(db, COLLECTIONS.vendorPayments);

export async function getVendors(): Promise<Vendor[]> {
  const q = query(vendorCol, orderBy('name', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToData<Vendor>(d.id, d.data()));
}

export async function getVendor(id: string): Promise<Vendor | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.vendors, id));
  if (!snap.exists()) return null;
  return docToData<Vendor>(snap.id, snap.data());
}

export async function createVendor(data: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(vendorCol, stripUndefined({
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  return ref.id;
}

export async function updateVendor(id: string, data: Partial<Vendor>): Promise<void> {
  const { id: _, createdAt, ...rest } = data;
  await updateDoc(doc(db, COLLECTIONS.vendors, id), stripUndefined({
    ...rest,
    updatedAt: serverTimestamp(),
  }));
}

export async function deleteVendor(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.vendors, id));
}

export async function getVendorPayments(vendorId?: string): Promise<VendorPayment[]> {
  let q;
  if (vendorId) {
    q = query(paymentCol, orderBy('createdAt', 'desc'));
  } else {
    q = query(paymentCol, orderBy('createdAt', 'desc'));
  }
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => docToData<VendorPayment>(d.id, d.data()));
  return vendorId ? all.filter((p) => p.vendorId === vendorId) : all;
}

export async function createVendorPayment(
  data: Omit<VendorPayment, 'id' | 'createdAt' | 'updatedAt' | 'remainingAmount'>
): Promise<string> {
  const remainingAmount = data.charges - data.paidAmount;
  const ref = await addDoc(paymentCol, stripUndefined({
    ...data,
    remainingAmount,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  return ref.id;
}

export async function updateVendorPayment(id: string, data: Partial<VendorPayment>): Promise<void> {
  const existing = (await getDocs(paymentCol)).docs.find((d) => d.id === id);
  if (!existing) return;
  const current = existing.data() as VendorPayment;
  const charges = data.charges ?? current.charges;
  const paidAmount = data.paidAmount ?? current.paidAmount;
  const { id: _, createdAt, ...rest } = data;
  await updateDoc(doc(db, COLLECTIONS.vendorPayments, id), stripUndefined({
    ...rest,
    charges,
    paidAmount,
    remainingAmount: charges - paidAmount,
    updatedAt: serverTimestamp(),
  }));
}

export async function getPendingVendorPayments(): Promise<VendorPayment[]> {
  const all = await getVendorPayments();
  return all.filter((p) => p.remainingAmount > 0);
}
