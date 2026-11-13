export function isValidEventDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function getCurrentTimeInputValue(date = new Date()): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export interface BookingDateCorrectionPreview {
  id: string;
  bookingNumber: string;
  currentDate: string;
  candidateDates: string[];
}

export function previewMalformedBookingDates(
  bookings: readonly { id: string; bookingNumber: string; eventDate: string }[]
): BookingDateCorrectionPreview[] {
  return bookings.flatMap((booking) => {
    const match = /^(\d{5})-(\d{2})-(\d{2})$/.exec(booking.eventDate);
    if (!match) return [];
    const [, yearText, month, day] = match;
    const candidates = new Set<string>();
    for (let index = 0; index < yearText.length; index += 1) {
      const year = `${yearText.slice(0, index)}${yearText.slice(index + 1)}`;
      const candidate = `${year}-${month}-${day}`;
      if (isValidEventDate(candidate)) candidates.add(candidate);
    }
    return [{
      id: booking.id,
      bookingNumber: booking.bookingNumber || '—',
      currentDate: booking.eventDate,
      candidateDates: [...candidates].sort(),
    }];
  });
}
