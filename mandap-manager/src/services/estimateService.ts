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
import type { Estimate } from '@/types';
import { docToData, stripUndefined } from '@/utils/helpers';
import { getNextEstimateNumber } from './counterService';
import { updateInquiry } from './inquiryService';
import { calculateTotals, normalizeLineItem } from '@/utils/calculations';

const col = collection(db, COLLECTIONS.estimates);

function normalizeEstimate(estimate: Estimate): Estimate {
  const lineItems = estimate.lineItems.map(normalizeLineItem);
  const totals = calculateTotals(lineItems, estimate.discount);
  return { ...estimate, lineItems, subTotal: totals.subTotal, grandTotal: totals.grandTotal };
}

export async function getEstimates(): Promise<Estimate[]> {
  const q = query(col, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => normalizeEstimate(docToData<Estimate>(d.id, d.data())));
}

export async function getEstimate(id: string): Promise<Estimate | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.estimates, id));
  if (!snap.exists()) return null;
  return normalizeEstimate(docToData<Estimate>(snap.id, snap.data()));
}

export async function createEstimate(
  data: Omit<Estimate, 'id' | 'estimateNumber' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<string> {
  const lineItems = data.lineItems.map(normalizeLineItem);
  const totals = calculateTotals(lineItems, data.discount);
  const estimateNumber = await getNextEstimateNumber();
  const ref = await addDoc(col, stripUndefined({
    ...data,
    lineItems,
    subTotal: totals.subTotal,
    grandTotal: totals.grandTotal,
    estimateNumber,
    status: 'draft',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  await updateInquiry(data.inquiryId, { status: 'estimate_created' });
  return ref.id;
}

export async function updateEstimate(id: string, data: Partial<Estimate>): Promise<void> {
  const normalizedLineItems = data.lineItems?.map(normalizeLineItem);
  const recalculated = normalizedLineItems
    ? calculateTotals(normalizedLineItems, data.discount ?? 0)
    : null;
  const { id: _, createdAt, ...rest } = data;
  await updateDoc(doc(db, COLLECTIONS.estimates, id), stripUndefined({
    ...rest,
    lineItems: normalizedLineItems,
    ...(recalculated ? { subTotal: recalculated.subTotal, grandTotal: recalculated.grandTotal } : {}),
    updatedAt: serverTimestamp(),
  }));
}

export async function sendEstimate(id: string): Promise<void> {
  await updateEstimate(id, { status: 'sent' });
}

export async function approveEstimate(id: string): Promise<void> {
  await updateEstimate(id, { status: 'approved' });
}

export async function deleteEstimate(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.estimates, id));
}
