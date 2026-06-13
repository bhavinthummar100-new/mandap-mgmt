import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { Payment, PaymentMethod, PaymentType } from '@/types';
import { docToData, stripUndefined } from '@/utils/helpers';
import { getBooking, updateBooking } from './bookingService';

const col = collection(db, COLLECTIONS.payments);

export async function getPayments(bookingId?: string): Promise<Payment[]> {
  const q = query(col, orderBy('date', 'desc'));
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => docToData<Payment>(d.id, d.data()));
  return bookingId ? all.filter((p) => p.bookingId === bookingId) : all;
}

export async function recordPayment(
  bookingId: string,
  type: PaymentType,
  amount: number,
  method: PaymentMethod,
  date: string,
  notes?: string
): Promise<string> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error('Booking not found');

  const ref = await addDoc(col, stripUndefined({
    bookingId,
    bookingNumber: booking.bookingNumber,
    type,
    amount,
    method,
    date,
    notes: notes ?? '',
    createdAt: serverTimestamp(),
  }));

  const newAdvance = booking.advancePayment + amount;
  const remaining = Math.max(0, booking.grandTotal - newAdvance);
  const paymentStatus = remaining <= 0 ? 'completed' : 'partial';

  await updateBooking(bookingId, {
    advancePayment: newAdvance,
    remainingAmount: remaining,
    paymentStatus,
    status: paymentStatus === 'completed' ? 'Payment Completed' : booking.status,
  });

  return ref.id;
}
