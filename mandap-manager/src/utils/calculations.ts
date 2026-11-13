import type { LineItem } from '@/types';

export function getRentalDays(startDate?: string, endDate?: string, fallback = 1): number {
  if (!startDate || !endDate) return fallback;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return fallback;
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

export function calculateLineItemTotal(quantity: number, rate: number, rentalDays = 1): number {
  return quantity * rate * Math.max(1, rentalDays);
}

export function normalizeLineItem(item: LineItem): LineItem {
  const rentalDays = Math.max(1, item.rentalDays ?? getRentalDays(item.startDate, item.endDate, 1));
  return {
    ...item,
    rentalDays,
    total: calculateLineItemTotal(item.quantity, item.rate, rentalDays),
  };
}

export function calculateTotals(lineItems: LineItem[], discount: number) {
  const subTotal = lineItems
    .map(normalizeLineItem)
    .reduce((sum, item) => sum + item.total, 0);
  const grandTotal = Math.max(0, subTotal - discount);
  return { subTotal, discount, grandTotal };
}

export function calculateGst(subTotal: number, discount: number, gstRate: number) {
  const taxable = Math.max(0, subTotal - discount);
  const taxAmount = (taxable * gstRate) / 100;
  const grandTotal = taxable + taxAmount;
  return { taxable, taxAmount, grandTotal };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function parseDateValue(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;

  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string' || typeof value === 'number') {
    date = new Date(value);
  } else if (
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    try {
      date = value.toDate();
    } catch {
      return null;
    }
  } else {
    return null;
  }

  if (Number.isNaN(date.getTime()) || date.getFullYear() < 1 || date.getFullYear() > 9999) {
    return null;
  }
  return date;
}

export function formatDate(value: unknown): string {
  const date = parseDateValue(value);
  if (!date) return '';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(value: unknown): string {
  if (typeof value === 'string') {
    const timeMatch = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value);
    if (timeMatch) {
      const hours = Number(timeMatch[1]);
      const minutes = Number(timeMatch[2]);
      if (hours > 23 || minutes > 59) return '';
      return new Date(1970, 0, 1, hours, minutes).toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
  }

  const date = parseDateValue(value);
  if (!date) return '';
  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function generateNumber(prefix: string, counter: number, year?: number): string {
  const y = year ?? new Date().getFullYear();
  return `${prefix}-${y}-${String(counter).padStart(4, '0')}`;
}
