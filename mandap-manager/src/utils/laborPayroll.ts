import type {
  DailyAttendanceStatus,
  LaborAdjustment,
  LaborAttendance,
  LaborLeave,
  Laborer,
  SalaryPayment,
} from '@/types';
import { formatDate } from './calculations.ts';

export interface LaborMonthlySummary {
  laborId: string;
  month: string;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  leaveDays: number;
  totalWage: number;
  extraPayment: number;
  advance: number;
  advanceCarriedIn: number;
  advanceCarriedForward: number;
  payable: number;
  paid: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
}

export interface LaborPayrollData {
  attendance: readonly LaborAttendance[];
  leaves: readonly LaborLeave[];
  adjustments: readonly LaborAdjustment[];
  salaryPayments: readonly SalaryPayment[];
}

const localeText = {
  en: {
    salarySlip: 'Staff Boy Salary Slip',
    name: 'Name',
    month: 'Month',
    attendance: 'Date-wise attendance',
    present: 'Present',
    half: 'Half Day',
    absent: 'Absent',
    leave: 'Leave',
    totalWage: 'Total Wage',
    extra: 'Extra Payment',
    advance: 'Advance',
    advanceCarriedIn: 'Advance Carried Forward',
    paid: 'Paid',
    payable: 'Payable',
    advanceCarried: 'Advance Carried Forward',
    unpaid: 'Unpaid',
    partial: 'Partial',
  },
  gu: {
    salarySlip: 'સ્ટાફ બોય પગાર સ્લિપ',
    name: 'નામ',
    month: 'મહિનો',
    attendance: 'તારીખ મુજબ હાજરી',
    present: 'હાજર',
    half: 'અડધો દિવસ',
    absent: 'ગેરહાજર',
    leave: 'રજા',
    totalWage: 'કુલ વેતન',
    extra: 'વધારાની ચુકવણી',
    advance: 'એડવાન્સ',
    advanceCarriedIn: 'આગળથી આવેલ એડવાન્સ',
    paid: 'ચૂકવેલ',
    payable: 'ચૂકવવાપાત્ર',
    advanceCarried: 'આગળ લઈ જવાનો એડવાન્સ',
    unpaid: 'ચુકવવાનું બાકી',
    partial: 'આંશિક',
  },
} as const;

export function attendanceDocumentId(laborId: string, date: string): string {
  return `${laborId}_${date}`;
}

export function formatPayrollAmount(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function monthOf(date: string): string {
  return date.slice(0, 7);
}

function listMonthDates(month: string): string[] {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from({ length: lastDay }, (_, index) =>
    `${month}-${String(index + 1).padStart(2, '0')}`
  );
}

function getLeaveDates(laborId: string, month: string, leaves: readonly LaborLeave[]): Set<string> {
  const dateSet = new Set<string>();
  const monthDates = listMonthDates(month);
  for (const leave of leaves) {
    if (leave.laborId !== laborId) continue;
    for (const date of monthDates) {
      if (date >= leave.fromDate && date <= leave.toDate) dateSet.add(date);
    }
  }
  return dateSet;
}

function summarizeMonth(
  laborId: string,
  month: string,
  data: LaborPayrollData,
  advanceCarriedIn: number
): LaborMonthlySummary {
  const leaveDates = getLeaveDates(laborId, month, data.leaves);
  const dayRecords = new Map<string, LaborAttendance>();
  for (const record of data.attendance) {
    if (record.laborId === laborId && monthOf(record.date) === month) dayRecords.set(record.date, record);
  }

  let presentDays = 0;
  let halfDays = 0;
  let absentDays = 0;
  let totalWage = 0;
  for (const [date, record] of dayRecords) {
    if (leaveDates.has(date)) continue;
    if (record.status === 'present') {
      presentDays += 1;
      totalWage += record.wageSnapshot;
    } else if (record.status === 'half') {
      halfDays += 1;
      totalWage += record.wageSnapshot / 2;
    } else {
      absentDays += 1;
    }
  }

  const monthAdjustments = data.adjustments.filter(
    (adjustment) => adjustment.laborId === laborId && monthOf(adjustment.date) === month
  );
  const extraPayment = monthAdjustments
    .filter((adjustment) => adjustment.type === 'extra')
    .reduce((sum, adjustment) => sum + adjustment.amount, 0);
  const advance = monthAdjustments
    .filter((adjustment) => adjustment.type === 'advance')
    .reduce((sum, adjustment) => sum + adjustment.amount, 0);
  const netPayable = totalWage + extraPayment - advance - advanceCarriedIn;
  const paid = data.salaryPayments
    .filter((payment) => payment.laborId === laborId && payment.month === month)
    .reduce((sum, payment) => sum + payment.amountPaid, 0);
  const payable = Math.max(0, netPayable);

  return {
    laborId,
    month,
    presentDays,
    halfDays,
    absentDays,
    leaveDays: leaveDates.size,
    totalWage,
    extraPayment,
    advance,
    advanceCarriedIn,
    advanceCarriedForward: Math.max(0, -netPayable),
    payable,
    paid,
    paymentStatus: payable <= 0 || paid >= payable ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
  };
}

export function calculateLaborMonthlySummary(
  laborId: string,
  month: string,
  data: LaborPayrollData
): LaborMonthlySummary {
  const datedEntries = [
    ...data.attendance.filter((record) => record.laborId === laborId).map((record) => record.date),
    ...data.adjustments.filter((record) => record.laborId === laborId).map((record) => record.date),
  ].filter((date) => date <= `${month}-31`);
  const firstMonth = datedEntries.length
    ? datedEntries.map(monthOf).sort()[0]
    : month;
  let carried = 0;
  let result = summarizeMonth(laborId, firstMonth, data, carried);

  for (let cursor = firstMonth; cursor <= month; cursor = nextMonth(cursor)) {
    result = summarizeMonth(laborId, cursor, data, carried);
    carried = result.advanceCarriedForward;
  }
  return result;
}

function nextMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return monthNumber === 12
    ? `${year + 1}-01`
    : `${year}-${String(monthNumber + 1).padStart(2, '0')}`;
}

export function isLaborOnLeave(laborId: string, date: string, leaves: readonly LaborLeave[]): boolean {
  return leaves.some((leave) => leave.laborId === laborId && date >= leave.fromDate && date <= leave.toDate);
}

export function buildLaborSalarySlip(
  laborer: Pick<Laborer, 'name'>,
  summary: LaborMonthlySummary,
  attendance: readonly LaborAttendance[],
  locale: 'en' | 'gu' = 'en',
  leaves: readonly LaborLeave[] = []
): string {
  const text = localeText[locale];
  const attendanceLabels: Record<DailyAttendanceStatus, string> = {
    present: text.present,
    half: text.half,
    absent: text.absent,
  };
  const dateStatuses = new Map<string, string>();
  attendance
    .filter((record) => record.laborId === summary.laborId && monthOf(record.date) === summary.month)
    .forEach((record) => dateStatuses.set(record.date, attendanceLabels[record.status]));
  for (const date of getLeaveDates(summary.laborId, summary.month, leaves)) {
    dateStatuses.set(date, text.leave);
  }
  const dates = [...dateStatuses.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, status]) => `${formatDate(date) || '—'}: ${status}`);
  const lines = [
    `*${text.salarySlip}*`,
    `*${text.name}:* ${laborer.name || '—'}`,
    `*${text.month}:* ${summary.month}`,
    '',
    `*${text.attendance}*`,
    ...(dates.length ? dates : ['—']),
    '',
    `${text.present}: ${summary.presentDays} · ${text.half}: ${summary.halfDays} · ${text.absent}: ${summary.absentDays} · ${text.leave}: ${summary.leaveDays}`,
    `${text.totalWage}: ${formatPayrollAmount(summary.totalWage)}`,
    `${text.extra}: ${formatPayrollAmount(summary.extraPayment)}`,
    `${text.advance}: ${formatPayrollAmount(summary.advance)}`,
    ...(summary.advanceCarriedIn > 0
      ? [`${text.advanceCarriedIn}: ${formatPayrollAmount(summary.advanceCarriedIn)}`]
      : []),
    `${text.paid}: ${formatPayrollAmount(summary.paid)}`,
    ...(summary.advanceCarriedForward > 0
      ? [`${text.advanceCarried}: ${formatPayrollAmount(summary.advanceCarriedForward)}`]
      : [`*${text.payable}: ${formatPayrollAmount(Math.max(0, summary.payable - summary.paid))}*`]),
  ];
  return lines.join('\n');
}
