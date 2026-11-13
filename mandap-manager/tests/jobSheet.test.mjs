import assert from 'node:assert/strict';
import test from 'node:test';
import { buildJobSheetText, JOB_SHEET_ICONS } from '../src/utils/jobSheet.ts';

function createBooking(overrides = {}) {
  return {
    id: 'booking-id',
    bookingNumber: 'BK-2026-0001',
    estimateId: 'estimate-id',
    inquiryId: 'inquiry-id',
    customerName: 'Asha Patel',
    mobile: '9876543210',
    eventDate: '2026-11-12',
    eventTime: '19:00',
    eventAddress: 'Main Road, Surat',
    lineItems: [],
    subTotal: 0,
    discount: 0,
    grandTotal: 0,
    advancePayment: 0,
    remainingAmount: 0,
    paymentStatus: 'pending',
    status: 'Approved',
    assignedLaborIds: [],
    assignedUserIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const customer = { name: 'Asha Patel', mobile: '9876543210' };

test('includes a map line only when a map link exists', () => {
  const withMap = buildJobSheetText(
    createBooking({ googleMapLink: 'https://maps.google.com/?q=Surat' }),
    customer,
    [],
    []
  );
  assert.ok(withMap.includes(`*Google Map:*\nhttps://maps.google.com/?q=Surat`));

  const withoutMap = buildJobSheetText(createBooking(), customer, [], []);
  assert.doesNotMatch(withoutMap, /Google Map/);
  assert.match(withoutMap, /Main Road, Surat/);
});

test('shows order notes only when provided', () => {
  const withNotes = buildJobSheetText(
    createBooking({ specialNotes: 'Keep the entrance clear' }),
    customer,
    [],
    []
  );
  assert.ok(withNotes.includes(`*${JOB_SHEET_ICONS.orderNotes} Order Notes*\n- Keep the entrance clear`));

  const withoutNotes = buildJobSheetText(createBooking(), customer, [], []);
  assert.doesNotMatch(withoutNotes, /Order Notes/);
});

test('includes quantity and rental days, with no price information', () => {
  const result = buildJobSheetText(
    createBooking(),
    customer,
    [
      { itemName: 'Mattresses', quantity: 2, rate: 40, total: 480, rentalDays: 6 },
      { itemName: 'Chairs', quantity: 10, rate: 20, total: 200, rentalDays: 1 },
    ],
    []
  );
  assert.match(result, /1\. Mattresses \(6 days\) - 2/);
  assert.match(result, /2\. Chairs - 10/);
  assert.doesNotMatch(result, /₹|(?:rate|amount|subtotal|discount|advance|balance|total)\s*:/i);
  assert.doesNotMatch(result, /\b40\b|\b480\b|\b20\b|\b200\b/);
});

test('groups item dates in ascending order and includes assigned labor', () => {
  const result = buildJobSheetText(
    createBooking(),
    customer,
    [
      { itemName: 'Later setup', quantity: 1, rate: 1, total: 1, startDate: '2026-11-14' },
      { itemName: 'First setup', quantity: 2, rate: 1, total: 2, startDate: '2026-11-13' },
    ],
    [{ laborerName: 'Ravi' }]
  );
  assert.ok(result.indexOf('*Day 1: 13 Nov 2026') < result.indexOf('*Day 2: 14 Nov 2026'));
  assert.ok(result.includes(`*${JOB_SHEET_ICONS.setupBoys} Setup Boy:* Ravi`));
  assert.doesNotMatch(result, /\bLabor\b|\bLaborer\b/);
  assert.match(result, /1\. First setup - 2/);
  assert.match(result, /1\. Later setup - 1/);
  assert.doesNotMatch(result, /₹|(?:rate|amount|subtotal|discount|advance|balance|total)\s*:/i);
});

test('shows a dash for missing customer values and omits empty optional sections', () => {
  const result = buildJobSheetText(
    createBooking({ customerName: '', mobile: '', eventDate: '', eventTime: '', eventAddress: '' }),
    null,
    [],
    []
  );
  assert.match(result, /\*Name:\* —/);
  assert.match(result, /\*Mobile:\* —/);
  for (const section of ['address', 'items', 'orderNotes', 'setupBoys']) {
    assert.ok(!result.includes(JOB_SHEET_ICONS[section]));
  }
});

test('job sheet lists setup boys on one line with singular and plural labels', () => {
  const one = buildJobSheetText(createBooking(), customer, [], ['Ramesh']);
  const several = buildJobSheetText(createBooking(), customer, [], ['Ramesh', 'Suresh', 'Kishan']);
  const gujarati = buildJobSheetText(createBooking(), customer, [], ['Ramesh'], 'gu');
  const none = buildJobSheetText(createBooking(), customer, [], []);

  assert.ok(one.includes(`*${JOB_SHEET_ICONS.setupBoys} Setup Boy:* Ramesh`));
  assert.ok(several.includes(`*${JOB_SHEET_ICONS.setupBoys} Setup Boys:* Ramesh, Suresh, Kishan`));
  assert.ok(gujarati.includes(`*${JOB_SHEET_ICONS.setupBoys} સેટઅપ બોય:* Ramesh`));
  assert.doesNotMatch(none, /👷/);
});

test('uses requested icons for each present section and skips icons with missing sections', () => {
  const withSections = buildJobSheetText(
    createBooking({
      googleMapLink: 'https://maps.google.com/?q=Surat',
      specialNotes: 'Keep aisle open',
    }),
    customer,
    [{ itemName: 'Chairs', quantity: 5, rate: 1, total: 5 }],
    ['Ravi']
  );
  for (const icon of Object.values(JOB_SHEET_ICONS)) assert.ok(withSections.includes(icon));
  assert.ok(withSections.startsWith(`*${JOB_SHEET_ICONS.title} JOB SHEET*`));
  assert.ok(withSections.includes(`*${JOB_SHEET_ICONS.customer} Customer*`));
  assert.ok(withSections.includes(`*${JOB_SHEET_ICONS.address} Address*`));
  assert.ok(withSections.includes(`*${JOB_SHEET_ICONS.items} Items*`));
  assert.ok(!withSections.includes('\uFFFD'));

  const noOptionalSections = buildJobSheetText(createBooking({ eventAddress: '' }), customer, [], []);
  for (const section of ['address', 'items', 'orderNotes', 'setupBoys']) {
    assert.ok(!noOptionalSections.includes(JOB_SHEET_ICONS[section]));
  }
  assert.ok(buildJobSheetText(createBooking(), customer, [], [], 'gu').startsWith(`*${JOB_SHEET_ICONS.title} જોબ શીટ*`));
});
