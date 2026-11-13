import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attendanceDocumentId,
  calculateLaborMonthlySummary,
  isLaborOnLeave,
} from '../src/utils/laborPayroll.ts';

function data(overrides = {}) {
  return {
    attendance: [],
    leaves: [],
    adjustments: [],
    salaryPayments: [],
    ...overrides,
  };
}

function attendance(date, status, wageSnapshot, overrides = {}) {
  return {
    id: `boy_${date}`,
    laborId: 'boy',
    date,
    status,
    wageSnapshot,
    note: '',
    ...overrides,
  };
}

test('calculates full and half-day wages using each attendance wage snapshot', () => {
  const summary = calculateLaborMonthlySummary('boy', '2026-03', data({
    attendance: [
      attendance('2026-03-01', 'present', 100),
      attendance('2026-03-02', 'half', 100),
    ],
  }));
  assert.equal(summary.presentDays, 1);
  assert.equal(summary.halfDays, 1);
  assert.equal(summary.totalWage, 150);
});

test('leave days are excluded from attendance counts and wages', () => {
  const leave = { id: 'leave', laborId: 'boy', fromDate: '2026-03-02', toDate: '2026-03-03', reason: '' };
  const summary = calculateLaborMonthlySummary('boy', '2026-03', data({
    attendance: [
      attendance('2026-03-01', 'present', 100),
      attendance('2026-03-02', 'present', 100),
      attendance('2026-03-03', 'half', 100),
    ],
    leaves: [leave],
  }));
  assert.equal(summary.leaveDays, 2);
  assert.equal(summary.presentDays, 1);
  assert.equal(summary.halfDays, 0);
  assert.equal(summary.totalWage, 100);
  assert.equal(isLaborOnLeave('boy', '2026-03-03', [leave]), true);
});

test('includes dated extra payments and advances in payable', () => {
  const summary = calculateLaborMonthlySummary('boy', '2026-03', data({
    attendance: [attendance('2026-03-01', 'present', 500)],
    adjustments: [
      { id: 'extra', laborId: 'boy', type: 'extra', date: '2026-03-02', amount: 80, note: '' },
      { id: 'advance', laborId: 'boy', type: 'advance', date: '2026-03-03', amount: 130, note: '' },
    ],
  }));
  assert.equal(summary.totalWage, 500);
  assert.equal(summary.extraPayment, 80);
  assert.equal(summary.advance, 130);
  assert.equal(summary.payable, 450);
});

test('past wage snapshots do not change when the setup boy wage changes', () => {
  const records = data({
    attendance: [attendance('2026-01-05', 'present', 100)],
  });
  const oldMonth = calculateLaborMonthlySummary('boy', '2026-01', records);
  const laterMonth = calculateLaborMonthlySummary('boy', '2026-02', data({
    attendance: [
      attendance('2026-01-05', 'present', 100),
      attendance('2026-02-05', 'present', 200),
    ],
  }));
  assert.equal(oldMonth.totalWage, 100);
  assert.equal(laterMonth.totalWage, 200);
});

test('negative payable carries the excess advance into the following month', () => {
  const records = data({
    attendance: [
      attendance('2026-01-01', 'present', 100),
      attendance('2026-02-01', 'present', 250),
    ],
    adjustments: [
      { id: 'advance', laborId: 'boy', type: 'advance', date: '2026-01-02', amount: 150, note: '' },
    ],
  });
  const january = calculateLaborMonthlySummary('boy', '2026-01', records);
  const february = calculateLaborMonthlySummary('boy', '2026-02', records);
  assert.equal(january.payable, 0);
  assert.equal(january.advanceCarriedForward, 50);
  assert.equal(february.advanceCarriedIn, 50);
  assert.equal(february.payable, 200);
});

test('attendance document IDs make duplicate labor/date records converge to one document', () => {
  assert.equal(attendanceDocumentId('boy', '2026-03-04'), 'boy_2026-03-04');
  assert.equal(
    attendanceDocumentId('boy', '2026-03-04'),
    attendanceDocumentId('boy', '2026-03-04')
  );
});
