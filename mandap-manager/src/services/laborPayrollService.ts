import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type {
  DailyAttendanceStatus,
  LaborAdjustment,
  LaborAttendance,
  LaborLeave,
  Laborer,
  SalaryPayment,
} from '@/types';
import { docToData, stripUndefined } from '@/utils/helpers';
import { getLaborAssignments, updateLaborAssignment } from './laborService';
import type { LaborPayrollData } from '@/utils/laborPayroll';
import { attendanceDocumentId } from '@/utils/laborPayroll';

const attendanceCol = collection(db, COLLECTIONS.attendance);
const leavesCol = collection(db, COLLECTIONS.leaves);
const salaryPaymentsCol = collection(db, COLLECTIONS.salaryPayments);
const adjustmentsCol = collection(db, COLLECTIONS.laborAdjustments);

export async function getAttendanceRecord(laborId: string, date: string): Promise<LaborAttendance | null> {
  const snap = await getDoc(doc(attendanceCol, attendanceDocumentId(laborId, date)));
  return snap.exists() ? docToData<LaborAttendance>(snap.id, snap.data()) : null;
}

export async function getLeavesForDate(date: string): Promise<LaborLeave[]> {
  const snap = await getDocs(query(leavesCol, where('fromDate', '<=', date)));
  return snap.docs
    .map((item) => docToData<LaborLeave>(item.id, item.data()))
    .filter((leave) => leave.toDate >= date);
}

export async function getLaborPayrollData(endDate: string): Promise<LaborPayrollData> {
  const month = endDate.slice(0, 7);
  const [attendanceSnap, leavesSnap, adjustmentsSnap, paymentsSnap] = await Promise.all([
    getDocs(query(attendanceCol, where('date', '<=', endDate))),
    getDocs(query(leavesCol, where('fromDate', '<=', endDate))),
    getDocs(query(adjustmentsCol, where('date', '<=', endDate))),
    getDocs(query(salaryPaymentsCol, where('month', '<=', month))),
  ]);
  return {
    attendance: attendanceSnap.docs.map((item) => docToData<LaborAttendance>(item.id, item.data())),
    leaves: leavesSnap.docs.map((item) => docToData<LaborLeave>(item.id, item.data())),
    adjustments: adjustmentsSnap.docs.map((item) => docToData<LaborAdjustment>(item.id, item.data())),
    salaryPayments: paymentsSnap.docs.map((item) => docToData<SalaryPayment>(item.id, item.data())),
  };
}

async function syncAttendanceToBooking(
  bookingId: string | undefined,
  laborId: string,
  status: DailyAttendanceStatus | 'pending'
): Promise<void> {
  if (!bookingId) return;
  const assignments = await getLaborAssignments(bookingId);
  await Promise.all(
    assignments
      .filter((assignment) => assignment.laborerId === laborId)
      .map((assignment) => updateLaborAssignment(assignment.id, {
        attendanceStatus: status === 'pending' ? 'pending' : status === 'absent' ? 'absent' : 'present',
        attendance: status === 'present' || status === 'half',
      }))
  );
}

export async function saveAttendance(
  laborer: Pick<Laborer, 'id' | 'dailyWage'>,
  date: string,
  status: DailyAttendanceStatus | 'pending',
  bookingId?: string
): Promise<void> {
  const recordRef = doc(attendanceCol, attendanceDocumentId(laborer.id, date));
  let linkedBookingId = bookingId;

  await runTransaction(db, async (transaction) => {
    const current = await transaction.get(recordRef);
    const currentData = current.exists() ? current.data() : undefined;
    linkedBookingId ??= typeof currentData?.bookingId === 'string' ? currentData.bookingId : undefined;

    if (status === 'pending') {
      if (current.exists()) transaction.delete(recordRef);
      return;
    }

    transaction.set(recordRef, stripUndefined({
      laborId: laborer.id,
      date,
      status,
      wageSnapshot: currentData?.wageSnapshot ?? laborer.dailyWage,
      bookingId: bookingId ?? currentData?.bookingId,
      note: currentData?.note ?? '',
      ...(!current.exists() ? { createdAt: serverTimestamp() } : {}),
    }), { merge: true });
  });

  await syncAttendanceToBooking(linkedBookingId, laborer.id, status);
}

export async function createLaborLeave(data: Omit<LaborLeave, 'id'>): Promise<string> {
  const ref = await addDoc(leavesCol, stripUndefined(data));
  return ref.id;
}

export async function createLaborAdjustment(
  data: Omit<LaborAdjustment, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(adjustmentsCol, stripUndefined({
    ...data,
    createdAt: serverTimestamp(),
  }));
  return ref.id;
}

export async function createSalaryPayment(
  data: Omit<SalaryPayment, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(salaryPaymentsCol, stripUndefined({
    ...data,
    createdAt: serverTimestamp(),
  }));
  return ref.id;
}

export async function deleteLaborLeave(id: string): Promise<void> {
  await deleteDoc(doc(leavesCol, id));
}
