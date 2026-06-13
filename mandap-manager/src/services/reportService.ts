import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { DashboardStats } from '@/types';
import { getBookings, getTodayBookings, getUpcomingBookings } from './bookingService';
import { getLowStockItems } from './inventoryService';
import { getPendingLaborPayments } from './laborService';
import { getPendingVendorPayments } from './vendorService';
import { getPayments } from './paymentService';

export async function getDashboardStats(): Promise<DashboardStats> {
  const [todayEvents, upcomingEvents, bookings, inventoryAlerts, laborPending, vendorPending, payments] =
    await Promise.all([
      getTodayBookings(),
      getUpcomingBookings(),
      getBookings(),
      getLowStockItems(),
      getPendingLaborPayments(),
      getPendingVendorPayments(),
      getPayments(),
    ]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyRevenue = payments
    .filter((p) => {
      const d = new Date(p.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingPayments = bookings
    .filter((b) => b.paymentStatus !== 'completed')
    .reduce((sum, b) => sum + b.remainingAmount, 0);

  const laborPaymentsPending = laborPending.reduce((sum, l) => sum + l.paymentAmount, 0);
  const vendorPaymentsPending = vendorPending.reduce((sum, v) => sum + v.remainingAmount, 0);

  const bookingsByStatus: Record<string, number> = {};
  for (const b of bookings) {
    bookingsByStatus[b.status] = (bookingsByStatus[b.status] ?? 0) + 1;
  }

  const monthlyRevenueData: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const month = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    const revenue = payments
      .filter((p) => {
        const pd = new Date(p.date);
        return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
      })
      .reduce((sum, p) => sum + p.amount, 0);
    monthlyRevenueData.push({ month, revenue });
  }

  return {
    todayEvents,
    upcomingEvents,
    monthlyRevenue,
    pendingPayments,
    laborPaymentsPending,
    vendorPaymentsPending,
    inventoryAlerts,
    bookingsByStatus,
    monthlyRevenueData,
  };
}

export async function getDailyRevenue(date: string): Promise<number> {
  const payments = await getPayments();
  return payments.filter((p) => p.date === date).reduce((sum, p) => sum + p.amount, 0);
}

export async function getMonthlyRevenue(year: number, month: number): Promise<number> {
  const payments = await getPayments();
  return payments
    .filter((p) => {
      const d = new Date(p.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    })
    .reduce((sum, p) => sum + p.amount, 0);
}

export async function getOutstandingPayments() {
  const bookings = await getBookings();
  return bookings.filter((b) => b.paymentStatus !== 'completed');
}

export async function logActivity(
  entityType: string,
  entityId: string,
  action: string,
  userId: string,
  userName: string
): Promise<void> {
  await addDoc(collection(db, COLLECTIONS.activityLogs), {
    entityType,
    entityId,
    action,
    userId,
    userName,
    timestamp: serverTimestamp(),
  });
}
