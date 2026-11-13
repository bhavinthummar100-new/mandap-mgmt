import assert from 'node:assert/strict';
import test from 'node:test';
import { formatPdfCurrency } from '../src/utils/pdf/formatPdfCurrency.ts';

test('formats estimate and invoice amounts with the shared INR currency style', () => {
  assert.equal(formatPdfCurrency(1100), '₹1,100.00');
  assert.equal(formatPdfCurrency(12500.5), '₹12,500.50');
});
