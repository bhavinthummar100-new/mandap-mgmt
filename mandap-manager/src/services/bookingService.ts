import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { Booking, BookingStatus, Estimate, InventoryItem } from '@/types';
import { docToData, stripUndefined } from '@/utils/helpers';
import { getNextBookingNumber } from './counterService';
import { updateEstimate } from './estimateService';
import { updateInquiry } from './inquiryService';
import { incrementCustomerBookings } from './customerService';
import { calculateTotals, normalizeLineItem } from '@/utils/calculations';
import { isValidEventDate } from '@/utils/eventDate';

const col = collection(db, COLLECTIONS.bookings);

function normalizeBooking(booking: Booking): Booking {
  const lineItems = booking.lineItems.map(normalizeLineItem);
  const totals = calculateTotals(lineItems, booking.discount);
  return {
    ...booking,
    lineItems,
    subTotal: totals.subTotal,
    grandTotal: totals.grandTotal,
  };
}

export async function getBookings(): Promise<Booking[]> {
  const q = query(col, orderBy('eventDate', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => normalizeBooking(docToData<Booking>(d.id, d.data())));
}

export async function getBooking(id: string): Promise<Booking | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.bookings, id));
  if (!snap.exists()) return null;
  return normalizeBooking(docToData<Booking>(snap.id, snap.data()));
}

export async function getBookingByInquiryId(inquiryId: string): Promise<Booking | null> {
  const q = query(col, where('inquiryId', '==', inquiryId));
  const snap = await getDocs(q);
  const first = snap.docs[0];
  if (!first) return null;
  return normalizeBooking(docToData<Booking>(first.id, first.data()));
}

export async function getBookingByEstimateId(estimateId: string): Promise<Booking | null> {
  const q = query(col, where('estimateId', '==', estimateId));
  const snap = await getDocs(q);
  const first = snap.docs[0];
  if (!first) return null;
  return normalizeBooking(docToData<Booking>(first.id, first.data()));
}

export async function getBookingsByUser(userId: string): Promise<Booking[]> {
  const q = query(col, where('assignedUserIds', 'array-contains', userId), orderBy('eventDate', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => normalizeBooking(docToData<Booking>(d.id, d.data())));
}

export async function getTodayBookings(): Promise<Booking[]> {
  const today = new Date().toISOString().split('T')[0];
  const q = query(col, where('eventDate', '==', today));
  const snap = await getDocs(q);
  return snap.docs.map((d) => normalizeBooking(docToData<Booking>(d.id, d.data())));
}

export async function getUpcomingBookings(): Promise<Booking[]> {
  const today = new Date().toISOString().split('T')[0];
  const all = await getBookings();
  return all.filter((b) => b.eventDate >= today && b.status !== 'Payment Completed');
}

async function checkAndReserveInventory(lineItems: Estimate['lineItems']): Promise<string[]> {
  const warnings: string[] = [];
  const invCol = collection(db, COLLECTIONS.inventoryItems);
  const invSnap = await getDocs(invCol);
  const inventory = invSnap.docs.map((d) => docToData<InventoryItem>(d.id, d.data()));

  for (const rawItem of lineItems) {
    const item = normalizeLineItem(rawItem);
    const inv = inventory.find(
      (i) => i.name.toLowerCase() === item.itemName.toLowerCase()
    );
    if (inv && inv.availableStock < item.quantity) {
      warnings.push(`${item.itemName}: need ${item.quantity}, available ${inv.availableStock}`);
    }
    if ((item.rentalDays ?? 1) > 1) {
      warnings.push(
        `${item.itemName}: ${item.rentalDays} days selected (date-wise stock window check is not enabled yet)`
      );
    }
  }
  return warnings;
}

export async function convertEstimateToBooking(
  estimate: Estimate,
  advancePayment: number,
  specialNotes?: string
): Promise<{ bookingId: string; warnings: string[] }> {
  if (!isValidEventDate(estimate.eventDate)) {
    throw new Error('Booking event date must be a valid date between 2000 and 2100');
  }
  const normalizedLineItems = estimate.lineItems.map(normalizeLineItem);
  const warnings = await checkAndReserveInventory(normalizedLineItems);

  const bookingNumber = await getNextBookingNumber();
  const remainingAmount = estimate.grandTotal - advancePayment;
  const paymentStatus = advancePayment >= estimate.grandTotal ? 'completed' : advancePayment > 0 ? 'partial' : 'pending';

  let status: BookingStatus = 'Approved';
  if (advancePayment > 0) status = 'Advance Received';

  const bookingData = stripUndefined({
    bookingNumber,
    estimateId: estimate.id,
    inquiryId: estimate.inquiryId,
    customerId: estimate.customerId,
    customerName: estimate.customerName,
    mobile: estimate.mobile,
    eventType: estimate.eventType,
    eventDate: estimate.eventDate,
    eventTime: estimate.eventTime,
    eventAddress: estimate.eventAddress,
    googleMapLink: estimate.googleMapLink,
    lineItems: normalizedLineItems,
    subTotal: estimate.subTotal,
    discount: estimate.discount,
    grandTotal: estimate.grandTotal,
    advancePayment,
    remainingAmount,
    paymentStatus,
    status,
    specialNotes: specialNotes ?? estimate.notes,
    assignedLaborIds: [],
    assignedUserIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const ref = await addDoc(col, bookingData);

  await runTransaction(db, async (transaction) => {
    const invCol = collection(db, COLLECTIONS.inventoryItems);
    const invSnap = await getDocs(invCol);

    for (const rawItem of normalizedLineItems) {
      const item = normalizeLineItem(rawItem);
      const invDoc = invSnap.docs.find(
        (d) => d.data().name.toLowerCase() === item.itemName.toLowerCase()
      );
      if (invDoc) {
        const data = invDoc.data() as InventoryItem;
        const newBooked = data.bookedStock + item.quantity;
        transaction.update(invDoc.ref, {
          bookedStock: newBooked,
          availableStock: data.totalStock - newBooked,
          updatedAt: serverTimestamp(),
        });
      }
    }
  });

  await updateEstimate(estimate.id, { status: 'approved' });
  await updateInquiry(estimate.inquiryId, { status: 'converted' });
  if (estimate.customerId) {
    await incrementCustomerBookings(estimate.customerId, estimate.eventDate);
  }

  return { bookingId: ref.id, warnings };
}

export async function updateBooking(id: string, data: Partial<Booking>): Promise<void> {
  if (data.eventDate !== undefined && !isValidEventDate(data.eventDate)) {
    throw new Error('Booking event date must be a valid date between 2000 and 2100');
  }
  const normalizedLineItems = data.lineItems?.map(normalizeLineItem);
  const recalculated = normalizedLineItems
    ? calculateTotals(normalizedLineItems, data.discount ?? 0)
    : null;
  const rest = { ...data };
  delete rest.id;
  delete rest.createdAt;
  await updateDoc(doc(db, COLLECTIONS.bookings, id), stripUndefined({
    ...rest,
    lineItems: normalizedLineItems,
    ...(recalculated ? { subTotal: recalculated.subTotal, grandTotal: recalculated.grandTotal } : {}),
    updatedAt: serverTimestamp(),
  }));
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<void> {
  await updateBooking(id, { status });
}

export async function recordAdvancePayment(id: string, amount: number): Promise<void> {
  const booking = await getBooking(id);
  if (!booking) throw new Error('Booking not found');
  const newAdvance = booking.advancePayment + amount;
  const remaining = booking.grandTotal - newAdvance;
  const paymentStatus = remaining <= 0 ? 'completed' : 'partial';
  await updateBooking(id, {
    advancePayment: newAdvance,
    remainingAmount: Math.max(0, remaining),
    paymentStatus,
    status: paymentStatus === 'completed' ? 'Payment Completed' : 'Advance Received',
  });
}

export async function deleteBooking(id: string): Promise<void> {
  const booking = await getBooking(id);
  if (!booking) throw new Error('Booking not found');

  const linkedPaymentsQuery = query(
    collection(db, COLLECTIONS.payments),
    where('bookingId', '==', id)
  );
  const linkedInvoicesQuery = query(
    collection(db, COLLECTIONS.invoices),
    where('bookingId', '==', id)
  );
  const linkedAssignmentsQuery = query(
    collection(db, COLLECTIONS.laborAssignments),
    where('bookingId', '==', id)
  );
  const [payments, invoices, assignments, inventory] = await Promise.all([
    getDocs(linkedPaymentsQuery),
    getDocs(linkedInvoicesQuery),
    getDocs(linkedAssignmentsQuery),
    getDocs(collection(db, COLLECTIONS.inventoryItems)),
  ]);

  if (!payments.empty || !invoices.empty || booking.advancePayment > 0) {
    throw new Error('Cannot delete a booking with linked payments or invoices.');
  }

  const quantitiesByName = new Map<string, number>();
  for (const item of booking.lineItems) {
    const key = item.itemName.trim().toLowerCase();
    quantitiesByName.set(key, (quantitiesByName.get(key) ?? 0) + item.quantity);
  }

  const batch = writeBatch(db);
  for (const inventoryDoc of inventory.docs) {
    const inventoryItem = inventoryDoc.data() as InventoryItem;
    const reservedQuantity = quantitiesByName.get(inventoryItem.name.trim().toLowerCase());
    if (reservedQuantity === undefined) continue;

    const newBookedStock = Math.max(0, inventoryItem.bookedStock - reservedQuantity);
    batch.update(inventoryDoc.ref, {
      bookedStock: newBookedStock,
      availableStock: inventoryItem.totalStock - newBookedStock,
      updatedAt: serverTimestamp(),
    });
  }
  assignments.docs.forEach((assignment) => batch.delete(assignment.ref));
  batch.delete(doc(db, COLLECTIONS.bookings, id));
  await batch.commit();
}

export async function releaseInventoryForBooking(booking: Booking): Promise<void> {
  const invCol = collection(db, COLLECTIONS.inventoryItems);
  const invSnap = await getDocs(invCol);

  for (const item of booking.lineItems) {
    const invDoc = invSnap.docs.find(
      (d) => d.data().name.toLowerCase() === item.itemName.toLowerCase()
    );
    if (invDoc) {
      const data = invDoc.data() as InventoryItem;
      const newBooked = Math.max(0, data.bookedStock - item.quantity);
      await updateDoc(invDoc.ref, {
        bookedStock: newBooked,
        availableStock: data.totalStock - newBooked,
        updatedAt: serverTimestamp(),
      });
    }
  }
}
