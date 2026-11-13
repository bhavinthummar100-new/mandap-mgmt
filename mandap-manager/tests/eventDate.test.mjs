import assert from 'node:assert/strict';
import test from 'node:test';
import { getCurrentTimeInputValue, isValidEventDate, previewMalformedBookingDates } from '../src/utils/eventDate.ts';

test('validates date input years and calendar dates', () => {
  assert.equal(isValidEventDate('2026-11-12'), true);
  assert.equal(isValidEventDate('20126-11-12'), false);
  assert.equal(isValidEventDate('1999-12-31'), false);
  assert.equal(isValidEventDate('2101-01-01'), false);
  assert.equal(isValidEventDate('2026-02-30'), false);
});

test('dry-run lists five-digit years and all plausible one-digit corrections', () => {
  const preview = previewMalformedBookingDates([
    { id: 'one', bookingNumber: 'BK-1', eventDate: '20126-11-12' },
    { id: 'two', bookingNumber: 'BK-2', eventDate: '2026-11-12' },
  ]);
  assert.equal(preview.length, 1);
  assert.equal(preview[0].currentDate, '20126-11-12');
  assert.ok(preview[0].candidateDates.includes('2026-11-12'));
});

test('formats local current time for time input controls', () => {
  assert.equal(getCurrentTimeInputValue(new Date(2026, 10, 14, 9, 7)), '09:07');
});
