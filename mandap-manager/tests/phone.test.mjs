import assert from 'node:assert/strict';
import test from 'node:test';
import { formatIndianPhoneNumber, normalizeIndianPhoneNumber } from '../src/utils/phone.ts';

test('normalizes valid Indian numbers and formats them consistently', () => {
  assert.equal(normalizeIndianPhoneNumber('9876543210'), '9876543210');
  assert.equal(normalizeIndianPhoneNumber('+91 98765 43210'), '9876543210');
  assert.equal(normalizeIndianPhoneNumber('09876543210'), '9876543210');
  assert.equal(formatIndianPhoneNumber('9876543210'), '+91 98765 43210');
});

test('rejects invalid numbers and displays an em dash', () => {
  for (const value of ['', ',', '123456789', '12345678901']) {
    assert.equal(normalizeIndianPhoneNumber(value), null);
    assert.equal(formatIndianPhoneNumber(value), '—');
  }
});
