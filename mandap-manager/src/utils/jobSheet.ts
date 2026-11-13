import type { Booking, Customer, LaborAssignment, LineItem } from '@/types';
import { formatDate, formatTime, getRentalDays, parseDateValue } from './calculations.ts';

type JobSheetLocale = 'en' | 'gu';
type JobSheetCustomer = Pick<Customer, 'name' | 'mobile'> | null;
type JobSheetLabor = readonly (string | Pick<LaborAssignment, 'laborerName'>)[];

export const JOB_SHEET_ICONS = {
  title: '\u{1F4CB}\uFE0F',
  customer: '\u{1F464}\uFE0F',
  address: '\u{1F4CD}\uFE0F',
  items: '\u{1F4E6}\uFE0F',
  orderNotes: '\u{1F4DD}\uFE0F',
  setupBoys: '\u{1F477}\uFE0F',
} as const;

const labels = {
  en: {
    title: 'JOB SHEET',
    bookingNumber: 'Booking No',
    eventDate: 'Event Date',
    setupTime: 'Setup Time',
    customer: 'Customer',
    customerName: 'Name',
    mobile: 'Mobile',
    address: 'Address',
    googleMap: 'Google Map',
    items: 'Items',
    orderNotes: 'Order Notes',
    setupBoy: 'Staff Boy',
    setupBoys: 'Staff Boys',
    day: 'Day',
  },
  gu: {
    title: 'જોબ શીટ',
    bookingNumber: 'બુકિંગ નંબર',
    eventDate: 'ઇવેન્ટ તારીખ',
    setupTime: 'સેટઅપ સમય',
    customer: 'ગ્રાહક',
    customerName: 'નામ',
    mobile: 'મોબાઇલ',
    address: 'સરનામું',
    googleMap: 'ગૂગલ મેપ',
    items: 'સામાન',
    orderNotes: 'ઓર્ડરની નોંધ',
    setupBoy: 'સ્ટાફ બોય',
    setupBoys: 'સ્ટાફ બોયઝ',
    day: 'દિવસ',
  },
} satisfies Record<JobSheetLocale, Record<string, string>>;

function getRentalDuration(item: LineItem): number | null {
  if (typeof item.rentalDays === 'number' && Number.isFinite(item.rentalDays) && item.rentalDays > 0) {
    return item.rentalDays;
  }
  if (item.startDate && item.endDate) {
    return getRentalDays(item.startDate, item.endDate, 1);
  }
  return null;
}

function getItemDate(item: LineItem, booking: Booking): string {
  const date = item.startDate || booking.eventDate;
  return formatDate(date) ? date : '';
}

export function buildJobSheetText(
  booking: Booking,
  customer: JobSheetCustomer,
  items: readonly LineItem[],
  labor: JobSheetLabor,
  locale: JobSheetLocale = 'en'
): string {
  const text = labels[locale];
  const customerName = customer?.name?.trim() || booking.customerName?.trim() || '—';
  const mobile = customer?.mobile?.trim() || booking.mobile?.trim() || '—';
  const eventDate = formatDate(booking.eventDate);
  const eventTime = formatTime(booking.eventTime);
  const setupTime = formatTime(booking.setupTime);
  const itemGroups = new Map<string, LineItem[]>();

  for (const item of items) {
    const itemDate = getItemDate(item, booking);
    const key = itemDate ? formatDate(itemDate) : '';
    const group = itemGroups.get(key) ?? [];
    group.push(item);
    itemGroups.set(key, group);
  }

  const sortedGroups = [...itemGroups.entries()].sort(([left], [right]) => {
    if (!left) return right ? 1 : 0;
    if (!right) return -1;
    return (parseDateValue(left)?.getTime() ?? 0) - (parseDateValue(right)?.getTime() ?? 0);
  });
  const multiDay = sortedGroups.length > 1;
  const lines = [
    `*${JOB_SHEET_ICONS.title} ${text.title}*`,
    `*${text.bookingNumber}:* ${booking.bookingNumber || '—'}`,
    `*${text.eventDate}:* ${eventDate || '—'}, ${eventTime || '—'}`,
  ];

  if (setupTime) lines.push(`*${text.setupTime}:* ${setupTime}`);

  lines.push(
    '',
    `*${JOB_SHEET_ICONS.customer} ${text.customer}*`,
    `*${text.customerName}:* ${customerName}`,
    `*${text.mobile}:* ${mobile}`
  );

  const address = booking.eventAddress?.trim();
  const mapLink = booking.googleMapLink?.trim();
  if (address || mapLink) {
    lines.push('', `*${JOB_SHEET_ICONS.address} ${text.address}*`);
    lines.push(address || '—');
    if (mapLink) lines.push(`*${text.googleMap}:*`, mapLink);
  }

  if (items.length > 0) {
    lines.push('', `*${JOB_SHEET_ICONS.items} ${text.items}*`);
    sortedGroups.forEach(([date, groupItems], groupIndex) => {
      if (multiDay) {
        lines.push(
          `*${text.day} ${groupIndex + 1}: ${date || '—'}, ${eventTime || '—'}*`
        );
      }
      groupItems.forEach((item, itemIndex) => {
        const itemName = item.itemName?.trim() || '—';
        const quantity = Number.isFinite(item.quantity) ? item.quantity : '—';
        const days = getRentalDuration(item);
        const daysLabel = days && days > 1 ? ` (${days} ${days === 1 ? 'day' : 'days'})` : '';
        lines.push(`${itemIndex + 1}. ${itemName}${daysLabel} - ${quantity}`);
      });
    });
  }

  const notes = booking.specialNotes?.trim();
  if (notes) {
    lines.push(
      '',
      `*${JOB_SHEET_ICONS.orderNotes} ${text.orderNotes}*`,
      ...notes.split(/\r?\n/).map((note) => `- ${note}`)
    );
  }

  const laborNames = labor
    .map((member) => typeof member === 'string' ? member.trim() : member.laborerName.trim())
    .filter(Boolean);
  if (laborNames.length > 0) {
    const laborLabel = laborNames.length === 1 ? text.setupBoy : text.setupBoys;
    lines.push('', `*${JOB_SHEET_ICONS.setupBoys} ${laborLabel}:* ${laborNames.join(', ')}`);
  }

  return lines.join('\n');
}
