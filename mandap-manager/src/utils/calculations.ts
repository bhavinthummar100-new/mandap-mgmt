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

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export function generateNumber(prefix: string, counter: number, year?: number): string {
  const y = year ?? new Date().getFullYear();
  return `${prefix}-${y}-${String(counter).padStart(4, '0')}`;
}
