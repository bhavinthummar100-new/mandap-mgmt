export function normalizeIndianPhoneNumber(value: string | null | undefined): string | null {
  let digits = value?.replace(/\D/g, '') ?? '';
  if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  return /^\d{10}$/.test(digits) ? digits : null;
}

export function formatIndianPhoneNumber(value: string | null | undefined): string {
  const digits = normalizeIndianPhoneNumber(value);
  return digits ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : '—';
}
