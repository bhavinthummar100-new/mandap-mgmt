import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { Counters } from '@/types';
import { generateNumber } from '@/utils/calculations';

const COUNTERS_DOC = 'global';

const DEFAULT_COUNTERS: Counters = {
  estimateCounter: 0,
  bookingCounter: 0,
  gstInvoiceCounter: 0,
  nonGstInvoiceCounter: 0,
};

export async function getCounters(): Promise<Counters> {
  const ref = doc(db, COLLECTIONS.counters, COUNTERS_DOC);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, DEFAULT_COUNTERS);
    return DEFAULT_COUNTERS;
  }
  return snap.data() as Counters;
}

export async function getNextEstimateNumber(): Promise<string> {
  return runTransaction(db, async (transaction) => {
    const ref = doc(db, COLLECTIONS.counters, COUNTERS_DOC);
    const snap = await transaction.get(ref);
    const data = snap.exists() ? (snap.data() as Counters) : DEFAULT_COUNTERS;
    const next = data.estimateCounter + 1;
    transaction.set(ref, { ...data, estimateCounter: next }, { merge: true });
    return generateNumber('EST', next);
  });
}

export async function getNextBookingNumber(): Promise<string> {
  return runTransaction(db, async (transaction) => {
    const ref = doc(db, COLLECTIONS.counters, COUNTERS_DOC);
    const snap = await transaction.get(ref);
    const data = snap.exists() ? (snap.data() as Counters) : DEFAULT_COUNTERS;
    const next = data.bookingCounter + 1;
    transaction.set(ref, { ...data, bookingCounter: next }, { merge: true });
    return generateNumber('BK', next);
  });
}

export async function getNextInvoiceNumber(type: 'gst' | 'non_gst'): Promise<string> {
  return runTransaction(db, async (transaction) => {
    const ref = doc(db, COLLECTIONS.counters, COUNTERS_DOC);
    const snap = await transaction.get(ref);
    const data = snap.exists() ? (snap.data() as Counters) : DEFAULT_COUNTERS;

    if (type === 'gst') {
      const next = data.gstInvoiceCounter + 1;
      transaction.set(ref, { ...data, gstInvoiceCounter: next }, { merge: true });
      return generateNumber('INV-GST', next);
    }

    const next = data.nonGstInvoiceCounter + 1;
    transaction.set(ref, { ...data, nonGstInvoiceCounter: next }, { merge: true });
    return generateNumber('INV', next);
  });
}

export async function initCounters(): Promise<void> {
  const ref = doc(db, COLLECTIONS.counters, COUNTERS_DOC);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { ...DEFAULT_COUNTERS, updatedAt: serverTimestamp() });
  }
}
