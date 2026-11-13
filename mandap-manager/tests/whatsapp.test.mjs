import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDate, formatTime } from '../src/utils/calculations.ts';
import { buildEstimateMessage } from '../src/utils/whatsapp.ts';

const customer = { name: 'Asha' };
const business = { businessName: 'Mandap Decor', phone: '9876543210' };

function createEstimate(overrides = {}) {
  const lineItems = overrides.lineItems ?? [
    { itemName: 'Chairs', quantity: 2, rate: 10, rentalDays: 1, total: 20 },
  ];
  const subTotal = overrides.subTotal ?? lineItems.reduce((sum, item) => sum + item.total, 0);
  const discount = overrides.discount ?? 0;
  return {
    id: 'estimate-id',
    estimateNumber: 'EST-2026-0001',
    inquiryId: 'inquiry-id',
    customerName: customer.name,
    mobile: business.phone,
    eventDate: '2026-11-12',
    eventTime: '19:00',
    eventAddress: '',
    lineItems,
    subTotal,
    discount,
    grandTotal: overrides.grandTotal ?? Math.max(0, subTotal - discount),
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function message(estimate) {
  return buildEstimateMessage(estimate, customer, business);
}

test('formats valid dates and times, and suppresses malformed dates', () => {
  assert.equal(formatDate('2026-11-12'), '12 Nov 2026');
  assert.equal(formatDate(new Date(2026, 10, 12)), '12 Nov 2026');
  assert.equal(formatDate({ toDate: () => new Date(2026, 10, 12) }), '12 Nov 2026');
  assert.equal(formatDate('20126-11-12'), '');
  assert.equal(formatDate(undefined), '');
  assert.equal(
    formatTime('19:00'),
    new Date(1970, 0, 1, 19, 0).toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  );
});

test('includes subtotal and discount only when a discount applies', () => {
  const discounted = message(createEstimate({ discount: 5, grandTotal: 15 }));
  assert.match(discounted, /Subtotal: ₹20/);
  assert.match(discounted, /Discount: -₹5/);
  assert.match(discounted, /\*Total: ₹15\*/);

  const noDiscount = message(createEstimate());
  assert.doesNotMatch(noDiscount, /Subtotal:|Discount:/);
});

test('includes each item in a multi-item estimate', () => {
  const result = message(
    createEstimate({
      lineItems: [
        { itemName: 'Chairs', quantity: 100, rate: 10, rentalDays: 1, total: 1000 },
        { itemName: 'Tables', quantity: 4, rate: 250, rentalDays: 1, total: 1000 },
      ],
      subTotal: 2000,
      grandTotal: 2000,
    })
  );
  assert.match(result, /• Chairs: 100 × ₹10 = ₹1,000/);
  assert.match(result, /• Tables: 4 × ₹250 = ₹1,000/);
});

test('groups multi-day estimates by ascending item date without dropping entries', () => {
  const result = message(
    createEstimate({
      lineItems: [
        { itemName: 'Late item', quantity: 1, rate: 50, rentalDays: 1, total: 50, startDate: '2026-11-14' },
        { itemName: 'Early item', quantity: 2, rate: 20, rentalDays: 1, total: 40, startDate: '2026-11-13' },
        { itemName: 'Another early item', quantity: 1, rate: 30, rentalDays: 1, total: 30, startDate: '2026-11-13' },
      ],
      subTotal: 120,
      grandTotal: 120,
    })
  );
  assert.ok(result.indexOf('*Day 1: 13 Nov 2026') < result.indexOf('*Day 2: 14 Nov 2026'));
  assert.match(result, /• Early item:/);
  assert.match(result, /• Another early item:/);
  assert.match(result, /• Late item:/);
});

test('omits advance and balance at zero and includes both when advance is positive', () => {
  const noAdvance = message(createEstimate());
  assert.doesNotMatch(noAdvance, /Advance Paid:|Balance Due:/);

  const withAdvance = buildEstimateMessage(
    { ...createEstimate({ grandTotal: 20 }), advancePayment: 5 },
    customer,
    business
  );
  assert.match(withAdvance, /Advance Paid: -₹5/);
  assert.match(withAdvance, /\*Balance Due: ₹15\*/);
});

test('shows rental duration and multiplier only for multi-day items', () => {
  const result = message(
    createEstimate({
      lineItems: [
        { itemName: 'Mattresses', quantity: 2, rate: 40, rentalDays: 6, total: 480 },
        { itemName: 'Chairs', quantity: 3, rate: 10, rentalDays: 1, total: 30 },
        { itemName: 'Tables', quantity: 1, rate: 25, total: 25 },
      ],
      subTotal: 535,
      grandTotal: 535,
    })
  );
  assert.match(result, /• Mattresses \(6 days\): 2 × ₹40 × 6 = ₹480/);
  assert.match(result, /• Chairs: 3 × ₹10 = ₹30/);
  assert.match(result, /• Tables: 1 × ₹25 = ₹25/);
  assert.doesNotMatch(result, /Chairs \(1 day\)|Tables \(1 day\)/);
});

test('uses stored totals instead of displaying a mismatched rate calculation', () => {
  const result = message(
    createEstimate({
      lineItems: [{ itemName: 'Mattresses', quantity: 2, rate: 40, rentalDays: 6, total: 500 }],
      subTotal: 500,
      grandTotal: 500,
    })
  );
  assert.match(result, /• Mattresses \(6 days\): 2 = ₹500/);
  assert.doesNotMatch(result, /₹40 × 6/);
});
