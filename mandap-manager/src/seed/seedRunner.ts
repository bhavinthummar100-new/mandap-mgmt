import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, DEFAULT_INVENTORY_ITEMS } from '@/lib/constants';
import { initCounters } from '@/services/counterService';

const CUSTOMERS = [
  { name: 'Kashyap Patel', mobile: '9876543210', address: 'XYZ Party Plot, Surat' },
  { name: 'Rajesh Shah', mobile: '9876543211', address: 'ABC Garden, Surat' },
  { name: 'Priya Mehta', mobile: '9876543212', address: 'LMN Hall, Vadodara' },
  { name: 'Amit Desai', mobile: '9876543213', address: 'PQR Farm, Ahmedabad' },
  { name: 'Neha Joshi', mobile: '9876543214', address: 'DEF Banquet, Rajkot' },
  { name: 'Vikram Singh', mobile: '9876543215', address: 'GHI Lawn, Surat' },
  { name: 'Sunita Verma', mobile: '9876543216', address: 'JKL Terrace, Surat' },
  { name: 'Ramesh Kumar', mobile: '9876543217', address: 'MNO Club, Bharuch' },
  { name: 'Kavita Shah', mobile: '9876543218', address: 'OPQ Villa, Surat' },
  { name: 'Deepak Patel', mobile: '9876543219', address: 'RST Plot, Navsari' },
  { name: 'Anjali Desai', mobile: '9876543220', address: 'UVW Garden, Surat' },
  { name: 'Harsh Mehta', mobile: '9876543221', address: 'XYZ Hall, Anand' },
  { name: 'Meera Joshi', mobile: '9876543222', address: 'ABC Farm, Surat' },
  { name: 'Sanjay Shah', mobile: '9876543223', address: 'DEF Plot, Valsad' },
  { name: 'Pooja Patel', mobile: '9876543224', address: 'GHI Banquet, Surat' },
  { name: 'Arjun Singh', mobile: '9876543225', address: 'JKL Garden, Surat' },
  { name: 'Divya Kumar', mobile: '9876543226', address: 'MNO Hall, Surat' },
  { name: 'Rahul Verma', mobile: '9876543227', address: 'OPQ Lawn, Surat' },
  { name: 'Nisha Desai', mobile: '9876543228', address: 'RST Villa, Surat' },
  { name: 'Kiran Mehta', mobile: '9876543229', address: 'UVW Plot, Surat' },
];

const LABORERS = [
  { name: 'Ramesh Mistry', mobile: '9123456780', dailyWage: 500 },
  { name: 'Suresh Patel', mobile: '9123456781', dailyWage: 450 },
  { name: 'Mahesh Shah', mobile: '9123456782', dailyWage: 500 },
  { name: 'Dinesh Kumar', mobile: '9123456783', dailyWage: 400 },
  { name: 'Prakash Desai', mobile: '9123456784', dailyWage: 550 },
  { name: 'Naresh Joshi', mobile: '9123456785', dailyWage: 450 },
  { name: 'Ganesh Mehta', mobile: '9123456786', dailyWage: 500 },
  { name: 'Bhavesh Singh', mobile: '9123456787', dailyWage: 480 },
];

const VENDORS = [
  { name: 'Light House Surat', category: 'Light Vendor', mobile: '9988776655' },
  { name: 'Speed Transport', category: 'Transport Vendor', mobile: '9988776656' },
  { name: 'Shree Decoration', category: 'Decoration Vendor', mobile: '9988776657' },
  { name: 'Bright Lights Co', category: 'Light Vendor', mobile: '9988776658' },
  { name: 'Fast Movers', category: 'Transport Vendor', mobile: '9988776659' },
];

const STATUSES = [
  'Approved',
  'Advance Received',
  'Material Dispatched',
  'Event Completed',
  'Payment Completed',
] as const;

function randomDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

function randomLineItems() {
  const items = [
    { itemName: 'Chair', quantity: 40, rate: 15, total: 600 },
    { itemName: 'Table', quantity: 10, rate: 50, total: 500 },
    { itemName: 'Fan', quantity: 4, rate: 100, total: 400 },
    { itemName: 'Halogen', quantity: 2, rate: 200, total: 400 },
  ];
  return items;
}

export async function runSeedData(): Promise<void> {
  const existing = await getDocs(collection(db, COLLECTIONS.customers));
  if (existing.size > 5) {
    throw new Error('Data already exists. Clear collections before seeding.');
  }

  await initCounters();
  const batch = writeBatch(db);
  const now = serverTimestamp();

  // App settings
  batch.set(doc(db, COLLECTIONS.appSettings, 'main'), {
    businessName: 'Shree Mandap Decoration',
    businessNameGu: 'શ્રી મંડપ સજાવટ',
    address: 'Ring Road, Surat, Gujarat - 395002',
    addressGu: 'રિંગ રોડ, સુરત, ગુજરાત',
    phone: '9876543210',
    gstNumber: '24AABCU9603R1ZM',
    defaultGstRate: 18,
    updatedAt: now,
  });

  // Counters
  batch.set(doc(db, COLLECTIONS.counters, 'global'), {
    estimateCounter: 30,
    bookingCounter: 15,
    gstInvoiceCounter: 8,
    nonGstInvoiceCounter: 5,
  });

  // Inventory
  DEFAULT_INVENTORY_ITEMS.forEach((item, i) => {
    batch.set(doc(db, COLLECTIONS.inventoryItems, `inv_${i}`), {
      ...item,
      bookedStock: Math.floor(item.totalStock * 0.1),
      availableStock: item.totalStock - Math.floor(item.totalStock * 0.1),
      lowStockThreshold: 20,
      createdAt: now,
      updatedAt: now,
    });
  });

  // Customers
  CUSTOMERS.forEach((c, i) => {
    batch.set(doc(db, COLLECTIONS.customers, `cust_${i}`), {
      ...c,
      totalBookings: i < 15 ? 1 : 0,
      lastEventDate: i < 15 ? randomDate(i - 10) : null,
      createdAt: now,
      updatedAt: now,
    });
  });

  // Laborers
  LABORERS.forEach((l, i) => {
    batch.set(doc(db, COLLECTIONS.laborers, `lab_${i}`), {
      ...l,
      extraPayment: 0,
      advanceGiven: i * 100,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  });

  // Vendors
  VENDORS.forEach((v, i) => {
    batch.set(doc(db, COLLECTIONS.vendors, `ven_${i}`), {
      ...v,
      notes: '',
      createdAt: now,
      updatedAt: now,
    });
  });

  await batch.commit();

  // Inquiries, estimates, bookings (second batch for references)
  const batch2 = writeBatch(db);

  for (let i = 0; i < 15; i++) {
    const customer = CUSTOMERS[i];
    const eventDate = randomDate(i - 5);
    const lineItems = randomLineItems();
    const subTotal = lineItems.reduce((s, l) => s + l.total, 0);
    const discount = i % 3 === 0 ? 200 : 0;
    const grandTotal = subTotal - discount;

    batch2.set(doc(db, COLLECTIONS.inquiries, `inq_${i}`), {
      customerId: `cust_${i}`,
      customerName: customer.name,
      mobile: customer.mobile,
      eventDate,
      eventTime: '19:00',
      eventAddress: customer.address,
      googleMapLink: 'https://maps.google.com',
      notes: i % 2 === 0 ? 'Stage decoration required' : '',
      status: 'converted',
      createdAt: now,
      updatedAt: now,
    });

    batch2.set(doc(db, COLLECTIONS.estimates, `est_${i}`), {
      estimateNumber: `EST-2026-${String(i + 1).padStart(4, '0')}`,
      inquiryId: `inq_${i}`,
      customerId: `cust_${i}`,
      customerName: customer.name,
      mobile: customer.mobile,
      eventDate,
      eventTime: '19:00',
      eventAddress: customer.address,
      lineItems,
      subTotal,
      discount,
      grandTotal,
      status: 'approved',
      createdAt: now,
      updatedAt: now,
    });

    const advance = Math.floor(grandTotal * 0.4);
    const status = STATUSES[Math.min(i, STATUSES.length - 1)];
    const paymentStatus = status === 'Payment Completed' ? 'completed' : advance > 0 ? 'partial' : 'pending';

    batch2.set(doc(db, COLLECTIONS.bookings, `bk_${i}`), {
      bookingNumber: `BK-2026-${String(i + 1).padStart(4, '0')}`,
      estimateId: `est_${i}`,
      inquiryId: `inq_${i}`,
      customerId: `cust_${i}`,
      customerName: customer.name,
      mobile: customer.mobile,
      eventDate,
      eventTime: '19:00',
      eventAddress: customer.address,
      lineItems,
      subTotal,
      discount,
      grandTotal,
      advancePayment: advance,
      remainingAmount: grandTotal - advance,
      paymentStatus,
      status,
      specialNotes: 'Stage Decoration Required',
      assignedLaborIds: [`lab_${i % 8}`, `lab_${(i + 1) % 8}`],
      assignedUserIds: [],
      createdAt: now,
      updatedAt: now,
    });

    if (advance > 0) {
      batch2.set(doc(db, COLLECTIONS.payments, `pay_${i}`), {
        bookingId: `bk_${i}`,
        bookingNumber: `BK-2026-${String(i + 1).padStart(4, '0')}`,
        type: 'advance',
        amount: advance,
        method: 'upi',
        date: randomDate(i - 8),
        createdAt: now,
      });
    }
  }

  // Expenses
  const expenseCategories = ['Fuel', 'Labor', 'Transport', 'Food', 'Decoration Material', 'Miscellaneous'];
  for (let i = 0; i < 25; i++) {
    batch2.set(doc(db, COLLECTIONS.expenses, `exp_${i}`), {
      category: expenseCategories[i % expenseCategories.length],
      amount: 200 + i * 50,
      date: randomDate(-i),
      notes: `Expense ${i + 1}`,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Vendor payments
  for (let i = 0; i < 8; i++) {
    const charges = 2000 + i * 500;
    const paid = Math.floor(charges * 0.6);
    batch2.set(doc(db, COLLECTIONS.vendorPayments, `vp_${i}`), {
      vendorId: `ven_${i % 5}`,
      vendorName: VENDORS[i % 5].name,
      charges,
      paidAmount: paid,
      remainingAmount: charges - paid,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Invoices
  for (let i = 0; i < 10; i++) {
    const isGst = i % 2 === 0;
    const subTotal = 1900;
    const taxAmount = isGst ? subTotal * 0.18 : 0;
    const grandTotal = subTotal + taxAmount;
    batch2.set(doc(db, COLLECTIONS.invoices, `inv_doc_${i}`), {
      bookingId: `bk_${i}`,
      bookingNumber: `BK-2026-${String(i + 1).padStart(4, '0')}`,
      customerName: CUSTOMERS[i].name,
      mobile: CUSTOMERS[i].mobile,
      eventDate: randomDate(i - 5),
      eventAddress: CUSTOMERS[i].address,
      lineItems: randomLineItems(),
      subTotal,
      discount: 0,
      invoiceType: isGst ? 'gst' : 'non_gst',
      gstRate: isGst ? 18 : 0,
      taxAmount,
      grandTotal,
      advancePaid: Math.floor(grandTotal * 0.4),
      remainingBalance: Math.floor(grandTotal * 0.6),
      invoiceNumber: isGst ? `INV-GST-2026-${String(i + 1).padStart(4, '0')}` : `INV-2026-${String(i + 1).padStart(4, '0')}`,
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch2.commit();
}
