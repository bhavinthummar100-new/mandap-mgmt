import type { Booking } from '@/types';
import { formatDate, formatTime, getRentalDays } from './calculations';

export function buildJobSheetMessage(booking: Booking, language: 'en' | 'gu' = 'en'): string {
  const materialLines = booking.lineItems
    .map((item) => {
      const days = Math.max(1, item.rentalDays ?? getRentalDays(item.startDate, item.endDate, 1));
      return days > 1
        ? `${item.quantity} ${item.itemName} (${days} days)`
        : `${item.quantity} ${item.itemName}`;
    })
    .join('\n');

  if (language === 'gu') {
    return [
      `*જોબ શીટ*`,
      ``,
      `ગ્રાહક: ${booking.customerName}`,
      `તારીખ: ${formatDate(booking.eventDate)}`,
      `સમય: ${formatTime(booking.eventTime)}`,
      ``,
      `સરનામું:`,
      booking.eventAddress,
      booking.googleMapLink ? `\nમેપ: ${booking.googleMapLink}` : '',
      ``,
      `સામગ્રી:`,
      materialLines,
      booking.specialNotes ? `\nવિશેષ નોંધ:\n${booking.specialNotes}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    `*Job Sheet*`,
    ``,
    `Customer: ${booking.customerName}`,
    `Date: ${formatDate(booking.eventDate)}`,
    `Time: ${formatTime(booking.eventTime)}`,
    ``,
    `Address:`,
    booking.eventAddress,
    booking.googleMapLink ? `\nMap: ${booking.googleMapLink}` : '',
    ``,
    `Material:`,
    materialLines,
    booking.specialNotes ? `\nSpecial Notes:\n${booking.specialNotes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
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
  const url = phone
    ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank');
}
