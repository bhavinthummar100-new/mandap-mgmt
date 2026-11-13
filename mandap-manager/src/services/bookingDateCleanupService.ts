import { getBookings, updateBooking } from './bookingService';
import { isValidEventDate, previewMalformedBookingDates } from '@/utils/eventDate';

export async function previewBookingDateCleanup() {
  const bookings = await getBookings();
  return previewMalformedBookingDates(bookings);
}

export async function applyBookingDateCleanup(
  corrections: readonly { id: string; eventDate: string }[],
  confirmed: boolean
): Promise<void> {
  if (!confirmed) throw new Error('Explicit confirmation is required before changing booking dates');
  if (corrections.some((correction) => !correction.id || !isValidEventDate(correction.eventDate))) {
    throw new Error('Every booking correction must have a valid date between 2000 and 2100');
  }
  await Promise.all(corrections.map(({ id, eventDate }) => updateBooking(id, { eventDate })));
}
