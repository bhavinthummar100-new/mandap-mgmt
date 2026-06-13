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
import { COLLECTIONS, GST_RATE } from '@/lib/constants';
import type { Booking, Invoice, InvoiceType } from '@/types';
import { docToData, stripUndefined } from '@/utils/helpers';
import { calculateGst } from '@/utils/calculations';
import { getNextInvoiceNumber } from './counterService';
import { updateBooking } from './bookingService';

const col = collection(db, COLLECTIONS.invoices);

export async function getInvoices(): Promise<Invoice[]> {
  const q = query(col, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToData<Invoice>(d.id, d.data()));
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.invoices, id));
  if (!snap.exists()) return null;
  return docToData<Invoice>(snap.id, snap.data());
}

export async function generateInvoice(
  booking: Booking,
  invoiceType: InvoiceType,
  gstRate: number = GST_RATE
): Promise<string> {
  const invoiceNumber = await getNextInvoiceNumber(invoiceType);
  const { taxAmount, grandTotal } =
    invoiceType === 'gst'
      ? calculateGst(booking.subTotal, booking.discount, gstRate)
      : { taxAmount: 0, grandTotal: booking.grandTotal };

  const remainingBalance = grandTotal - booking.advancePayment;

  const ref = await addDoc(col, stripUndefined({
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
    customerName: booking.customerName,
    mobile: booking.mobile,
    eventDate: booking.eventDate,
    eventAddress: booking.eventAddress,
    lineItems: booking.lineItems,
    subTotal: booking.subTotal,
    discount: booking.discount,
    invoiceType,
    gstRate: invoiceType === 'gst' ? gstRate : 0,
    taxAmount,
    grandTotal,
    advancePaid: booking.advancePayment,
    remainingBalance: Math.max(0, remainingBalance),
    invoiceNumber,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));

  if (remainingBalance <= 0) {
    await updateBooking(booking.id, {
      paymentStatus: 'completed',
      remainingAmount: 0,
      status: 'Payment Completed',
    });
  }

  return ref.id;
}

export async function updateInvoice(id: string, data: Partial<Invoice>): Promise<void> {
  const { id: _, createdAt, ...rest } = data;
  await updateDoc(doc(db, COLLECTIONS.invoices, id), stripUndefined({
    ...rest,
    updatedAt: serverTimestamp(),
  }));
}

export async function deleteInvoice(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.invoices, id));
}
