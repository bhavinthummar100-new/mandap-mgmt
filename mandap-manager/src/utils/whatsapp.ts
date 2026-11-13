import type { AppSettings, Booking, Customer, Estimate, Invoice } from '@/types';
import { formatCurrency, formatDate, formatTime, getRentalDays, parseDateValue } from './calculations.ts';
import { buildJobSheetText } from './jobSheet.ts';

type EstimateMessageData = Estimate & { advancePayment?: number };
type EstimateCustomer = Pick<Customer, 'name'>;
type EstimateBusiness = Pick<AppSettings, 'businessName' | 'phone'>;

function formatWhatsAppAmount(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

function getLineItemDays(item: Estimate['lineItems'][number]): number {
  if (item.rentalDays !== undefined) {
    return Number.isFinite(item.rentalDays) && item.rentalDays > 0 ? item.rentalDays : 1;
  }
  return Math.max(1, getRentalDays(item.startDate, item.endDate, 1));
}

function getItemDate(item: Estimate['lineItems'][number], estimate: Estimate): unknown {
  const customDate = item.startDate || item.endDate;
  return customDate && formatDate(customDate) ? customDate : estimate.eventDate;
}

export function buildEstimateMessage(
  estimate: EstimateMessageData,
  customer: EstimateCustomer,
  business: EstimateBusiness
): string {
  const groupedItems = new Map<string, { date: unknown; items: Estimate['lineItems'] }>();

  for (const item of estimate.lineItems) {
    const date = getItemDate(item, estimate);
    const formattedDate = formatDate(date);
    const key = formattedDate || '';
    const group = groupedItems.get(key) ?? { date, items: [] };
    group.items.push(item);
    groupedItems.set(key, group);
  }

  const groups = [...groupedItems.values()].sort((a, b) => {
    const dateA = parseDateValue(a.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const dateB = parseDateValue(b.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return dateA - dateB;
  });
  const multiDay = groups.length > 1;
  const eventDate = formatDate(groups[0]?.date ?? estimate.eventDate);
  const eventTime = formatTime(estimate.eventTime);

  const formatItem = (item: Estimate['lineItems'][number]) => {
    const quantity = Number(item.quantity);
    const rate = Number(item.rate);
    const lineTotal = Number(item.total);
    const days = getLineItemDays(item);
    const daysLabel = days > 1 ? ` (${days} days)` : '';
    const daysMultiplier = days > 1 ? ` × ${days}` : '';
    const expectedTotal = quantity * rate * days;
    const hasRate = Number.isFinite(rate);
    const hasQuantity = Number.isFinite(quantity);
    const hasLineTotal = Number.isFinite(lineTotal);

    if (hasRate && hasQuantity && hasLineTotal && Math.abs(lineTotal - expectedTotal) < 0.000001) {
      return `• ${item.itemName}${daysLabel}: ${quantity.toLocaleString('en-IN')} × ${formatWhatsAppAmount(rate)}${daysMultiplier} = ${formatWhatsAppAmount(lineTotal)}`;
    }
    if (!hasLineTotal) return `• ${item.itemName}${daysLabel}`;
    if (days > 1) {
      return `• ${item.itemName}${daysLabel}: ${Number.isFinite(quantity) ? quantity.toLocaleString('en-IN') : ''} = ${formatWhatsAppAmount(lineTotal)}`;
    }
    return `• ${Number.isFinite(quantity) ? `${quantity.toLocaleString('en-IN')} × ` : ''}${item.itemName} = ${formatWhatsAppAmount(lineTotal)}`;
  };

  const itemLines = groups.flatMap((group, index) => {
    const lines = multiDay
      ? [`*Day ${index + 1}: ${formatDate(group.date)}${eventTime ? `, ${eventTime}` : ''}*`]
      : [];
    lines.push(...group.items.map(formatItem));
    return lines;
  });
  const advance = Number(estimate.advancePayment) || 0;
  const totals = [
    ...(estimate.discount > 0
      ? [
          `Subtotal: ${formatWhatsAppAmount(estimate.subTotal)}`,
          `Discount: -${formatWhatsAppAmount(estimate.discount)}`,
        ]
      : []),
    `*Total: ${formatWhatsAppAmount(estimate.grandTotal)}*`,
    ...(advance > 0
      ? [
          `Advance Paid: -${formatWhatsAppAmount(advance)}`,
          `*Balance Due: ${formatWhatsAppAmount(estimate.grandTotal - advance)}*`,
        ]
      : []),
  ];
  const businessPhone = business.phone?.trim();

  return [
    `Hi ${customer.name},`,
    '',
    `Here is your estimate from *${business.businessName}*:`,
    '',
    `*Estimate No:* ${estimate.estimateNumber}`,
    ...(!multiDay && (eventDate || eventTime)
      ? [`*Event Date:* ${[eventDate, eventTime].filter(Boolean).join(', ')}`]
      : []),
    '',
    '*Items*',
    ...itemLines,
    '',
    ...totals,
    '',
    `To confirm, just reply to this message${businessPhone ? ` or call us at ${businessPhone}` : ''}.`,
    '',
    'Thank you!',
  ].join('\n');
}

export function buildInvoiceMessage(invoice: Invoice): string {
  return [
    `Hi ${invoice.customerName},`,
    `Your invoice ${invoice.invoiceNumber} for booking ${invoice.bookingNumber} is ready.`,
    `Event date: ${formatDate(invoice.eventDate)}`,
    `Invoice total: ${formatCurrency(invoice.grandTotal)}`,
    `Paid: ${formatCurrency(invoice.advancePaid)}`,
    `Balance due: ${formatCurrency(invoice.remainingBalance)}`,
    'Please let us know if you would like a PDF copy of the invoice.',
    'Thank you!',
  ].join('\n');
}

export function buildBillReminderMessage(invoice: Invoice): string {
  return [
    `Hi ${invoice.customerName},`,
    `This is a friendly reminder that ${formatCurrency(invoice.remainingBalance)} is due for invoice ${invoice.invoiceNumber} (booking ${invoice.bookingNumber}).`,
    'Please let us know if you have already made the payment.',
    'Thank you!',
  ].join('\n');
}

export function buildPaymentReceivedMessage(booking: Booking): string {
  return [
    `Hi ${booking.customerName},`,
    `We have received a total payment of ${formatCurrency(booking.advancePayment)} for your booking ${booking.bookingNumber}.`,
    booking.remainingAmount > 0
      ? `Remaining balance: ${formatCurrency(booking.remainingAmount)}`
      : 'Your booking is now fully paid.',
    'Thank you for your payment!',
  ].join('\n');
}

export function buildJobSheetMessage(booking: Booking, language: 'en' | 'gu' = 'en'): string {
  return buildJobSheetText(
    booking,
    { name: booking.customerName, mobile: booking.mobile },
    booking.lineItems,
    [],
    language
  );
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function openWhatsApp(message: string, phone?: string): void {
  const encoded = encodeURIComponent(message);
  const digits = phone?.replace(/\D/g, '') ?? '';
  const localNumber =
    digits.length === 12 && digits.startsWith('91')
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith('0')
        ? digits.slice(1)
        : digits;
  const url =
    localNumber.length === 10
      ? `https://wa.me/91${localNumber}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank');
}
