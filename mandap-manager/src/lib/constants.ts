import type { BookingStatus, ExpenseCategory, VendorCategory } from '@/types';

export const BOOKING_STATUSES: BookingStatus[] = [
  'Inquiry',
  'Estimate Sent',
  'Approved',
  'Advance Received',
  'Material Dispatched',
  'Event Completed',
  'Payment Completed',
];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Fuel',
  'Labor',
  'Transport',
  'Food',
  'Decoration Material',
  'Miscellaneous',
];

export const VENDOR_CATEGORIES: VendorCategory[] = [
  'Light Vendor',
  'Transport Vendor',
  'Decoration Vendor',
];

export const DEFAULT_INVENTORY_ITEMS = [
  { name: 'Chair', nameGu: 'ખુરશી', category: 'Furniture', totalStock: 500, rate: 15 },
  { name: 'Table', nameGu: 'ટેબલ', category: 'Furniture', totalStock: 100, rate: 50 },
  { name: 'Gadda', nameGu: 'ગાદડો', category: 'Furniture', totalStock: 150, rate: 30 },
  { name: 'Fan', nameGu: 'પંખો', category: 'Equipment', totalStock: 30, rate: 100 },
  { name: 'Halogen', nameGu: 'હેલોજન', category: 'Lighting', totalStock: 50, rate: 200 },
  { name: 'Mandap Setup', nameGu: 'મંડપ સેટઅપ', category: 'Decoration', totalStock: 10, rate: 5000 },
  { name: 'Stage Decoration', nameGu: 'સ્ટેજ સજાવટ', category: 'Decoration', totalStock: 10, rate: 3000 },
  { name: 'Transportation', nameGu: 'ટ્રાન્સપોર્ટ', category: 'Service', totalStock: 999, rate: 1500 },
  { name: 'Labor Services', nameGu: 'મજૂર સેવા', category: 'Service', totalStock: 999, rate: 500 },
  { name: 'Counter Setup', nameGu: 'કાઉન્ટર સેટઅપ', category: 'Furniture', totalStock: 20, rate: 300 },
];

export const CALENDAR_COLORS: Record<string, string> = {
  Inquiry: '#9CA3AF',
  'Estimate Sent': '#6B7280',
  Approved: '#3B82F6',
  'Advance Received': '#2563EB',
  'Material Dispatched': '#8B5CF6',
  'Event Completed': '#22C55E',
  'Payment Completed': '#16A34A',
  pending: '#F97316',
};

export const GST_RATE = 18;

export const COLLECTIONS = {
  users: 'users',
  customers: 'customers',
  inquiries: 'inquiries',
  estimates: 'estimates',
  bookings: 'bookings',
  inventoryItems: 'inventoryItems',
  laborers: 'laborers',
  laborAssignments: 'laborAssignments',
  vendors: 'vendors',
  vendorPayments: 'vendorPayments',
  expenses: 'expenses',
  invoices: 'invoices',
  payments: 'payments',
  counters: 'counters',
  appSettings: 'appSettings',
  activityLogs: 'activityLogs',
} as const;
