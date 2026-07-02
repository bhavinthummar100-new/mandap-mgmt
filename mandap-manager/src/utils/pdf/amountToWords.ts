const BELOW_TWENTY = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertBelowThousand(value: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;

  if (hundreds > 0) {
    parts.push(`${BELOW_TWENTY[hundreds]} Hundred`);
  }

  if (rest > 0) {
    if (rest < 20) {
      parts.push(BELOW_TWENTY[rest]);
    } else {
      const ten = Math.floor(rest / 10);
      const one = rest % 10;
      parts.push(one > 0 ? `${TENS[ten]} ${BELOW_TWENTY[one]}` : TENS[ten]);
    }
  }

  return parts.join(' ');
}

function convertIntegerToIndianWords(value: number): string {
  if (value === 0) return 'Zero';

  const parts: string[] = [];
  const crore = Math.floor(value / 10000000);
  value %= 10000000;

  const lakh = Math.floor(value / 100000);
  value %= 100000;

  const thousand = Math.floor(value / 1000);
  value %= 1000;

  const last = value;

  if (crore > 0) parts.push(`${convertBelowThousand(crore)} Crore`);
  if (lakh > 0) parts.push(`${convertBelowThousand(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${convertBelowThousand(thousand)} Thousand`);
  if (last > 0) parts.push(convertBelowThousand(last));

  return parts.join(' ');
}

export function amountToWords(amount: number): string {
  const rounded = Math.max(0, Number.isFinite(amount) ? amount : 0);
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);
  const rupeesText = `${convertIntegerToIndianWords(rupees)} Rupees`;

  if (paise > 0) {
    return `${rupeesText} and ${convertIntegerToIndianWords(paise)} Paise Only.`;
  }

  return `${rupeesText} Only.`;
}
