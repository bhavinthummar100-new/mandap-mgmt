export type UserRole = 'admin' | 'manager' | 'worker';

export type BookingStatus =
  | 'Inquiry'
  | 'Estimate Sent'
  | 'Approved'
  | 'Advance Received'
  | 'Material Dispatched'
  | 'Event Completed'
  | 'Payment Completed';

export type PaymentStatus = 'pending' | 'partial' | 'completed';

export type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected';

export type InquiryStatus = 'new' | 'estimate_created' | 'converted' | 'closed';

export type InvoiceType = 'gst' | 'non_gst';

export type PaymentType = 'advance' | 'final' | 'partial';

export type PaymentMethod = 'cash' | 'upi' | 'bank' | 'other';

export type ExpenseCategory =
  | 'Fuel'
  | 'Labor'
  | 'Transport'
  | 'Food'
  | 'Decoration Material'
  | 'Miscellaneous';

export type VendorCategory = 'Light Vendor' | 'Transport Vendor' | 'Decoration Vendor';

export interface LineItem {
  itemName: string;
  quantity: number;
  rate: number;
  total: number;
  rentalDays?: number;
  startDate?: string;
  endDate?: string;
}

export interface AppUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string;
  laborerId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address?: string;
  notes?: string;
  totalBookings: number;
  lastEventDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Inquiry {
  id: string;
  customerId?: string;
  customerName: string;
  mobile: string;
  eventDate: string;
  eventTime: string;
  eventAddress: string;
  googleMapLink?: string;
  notes?: string;
  status: InquiryStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Estimate {
  id: string;
  estimateNumber: string;
  inquiryId: string;
  customerId?: string;
  customerName: string;
  mobile: string;
  eventDate: string;
  eventTime: string;
  eventAddress: string;
  googleMapLink?: string;
  notes?: string;
  lineItems: LineItem[];
  subTotal: number;
  discount: number;
  grandTotal: number;
  status: EstimateStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  estimateId: string;
  inquiryId: string;
  customerId?: string;
  customerName: string;
  mobile: string;
  eventDate: string;
  eventTime: string;
  eventAddress: string;
  googleMapLink?: string;
  lineItems: LineItem[];
  subTotal: number;
  discount: number;
  grandTotal: number;
  advancePayment: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  specialNotes?: string;
  assignedLaborIds: string[];
  assignedUserIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryItem {
  id: string;
  name: string;
  nameGu: string;
  category: string;
  totalStock: number;
  bookedStock: number;
  availableStock: number;
  lowStockThreshold: number;
  rate?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Laborer {
  id: string;
  name: string;
  mobile: string;
  dailyWage: number;
  extraPayment: number;
  advanceGiven: number;
  isActive: boolean;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LaborAssignment {
  id: string;
  bookingId: string;
  laborerId: string;
  laborerName: string;
  userId?: string;
  attendance: boolean;
  paymentAmount: number;
  paidStatus: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vendor {
  id: string;
  name: string;
  category: VendorCategory;
  mobile: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorPayment {
  id: string;
  vendorId: string;
  vendorName: string;
  bookingId?: string;
  charges: number;
  paidAmount: number;
  remainingAmount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  notes?: string;
  bookingId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  bookingId: string;
  bookingNumber: string;
  customerName: string;
  mobile: string;
  eventDate: string;
  eventAddress: string;
  lineItems: LineItem[];
  subTotal: number;
  discount: number;
  invoiceType: InvoiceType;
  gstRate: number;
  taxAmount: number;
  grandTotal: number;
  advancePaid: number;
  remainingBalance: number;
  invoiceNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  bookingId: string;
  bookingNumber: string;
  type: PaymentType;
  amount: number;
  method: PaymentMethod;
  date: string;
  notes?: string;
  createdAt: Date;
}

export interface AppSettings {
  id: string;
  businessName: string;
  businessNameGu: string;
  logoUrl?: string;
  gstNumber?: string;
  address: string;
  addressGu?: string;
  phone?: string;
  defaultGstRate: number;
  updatedAt: Date;
}

export interface ActivityLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface Counters {
  estimateCounter: number;
  bookingCounter: number;
  gstInvoiceCounter: number;
  nonGstInvoiceCounter: number;
}

export interface DashboardStats {
  todayEvents: Booking[];
  upcomingEvents: Booking[];
  monthlyRevenue: number;
  pendingPayments: number;
  laborPaymentsPending: number;
  vendorPaymentsPending: number;
  inventoryAlerts: InventoryItem[];
  bookingsByStatus: Record<string, number>;
  monthlyRevenueData: { month: string; revenue: number }[];
}
