import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import app from '@/lib/firebase';

export interface ParsedInquiryDetails {
  customerName: string;
  mobile: string;
  eventDate: string;
  eventTime: string;
  eventAddress: string;
  googleMapLink: string;
  notes: string;
}

const ai = getAI(app, { backend: new GoogleAIBackend() });
const inquiryModelName = import.meta.env.VITE_GEMINI_MODEL?.trim() || 'gemini-3.5-flash';
const inquiryModel = getGenerativeModel(ai, {
  model: inquiryModelName,
  generationConfig: {
    temperature: 0.1,
    topP: 0.9,
    maxOutputTokens: 512,
    responseMimeType: 'application/json',
  },
});

const EMPTY_PARSED_DETAILS: ParsedInquiryDetails = {
  customerName: '',
  mobile: '',
  eventDate: '',
  eventTime: '',
  eventAddress: '',
  googleMapLink: '',
  notes: '',
};

const UNKNOWN_VALUES = new Set([
  'unknown',
  'na',
  'n/a',
  'null',
  'undefined',
  'not provided',
  'none',
  '-',
]);

const cleanText = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (UNKNOWN_VALUES.has(trimmed.toLowerCase())) return '';
  return trimmed;
};

const cleanMobile = (value: unknown): string => {
  const text = cleanText(value);
  if (!text) return '';
  const digits = text.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return '';
};

const cleanDate = (value: unknown): string => {
  const text = cleanText(value);
  if (!text) return '';
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
};

const cleanTime = (value: unknown): string => {
  const text = cleanText(value);
  if (!text) return '';
  return /^\d{2}:\d{2}$/.test(text) ? text : '';
};

const parseObjectFromText = (raw: string): Record<string, unknown> => {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const cleaned = raw.replace(/```json|```/gi, '').trim();
    try {
      return JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
};

export async function parseInquiryDetailsWithGemini(input: string): Promise<ParsedInquiryDetails> {
  const prompt = `
You extract structured inquiry details for an event booking business in India.
Return ONLY a JSON object with exactly these keys:
customerName, mobile, eventDate, eventTime, eventAddress, googleMapLink, notes

Rules:
- mobile must be only 10 digits (Indian mobile). If uncertain, return empty string.
- eventDate format must be YYYY-MM-DD. If uncertain, return empty string.
- eventTime format must be HH:mm (24-hour). If uncertain, return empty string.
- Keep unknown fields as empty string.
- Do not add any extra keys.

User text:
${input}
`;

  const result = await inquiryModel.generateContent(prompt);
  const raw = result.response.text();
  const parsed = parseObjectFromText(raw);

  return {
    customerName: cleanText(parsed.customerName),
    mobile: cleanMobile(parsed.mobile),
    eventDate: cleanDate(parsed.eventDate),
    eventTime: cleanTime(parsed.eventTime),
    eventAddress: cleanText(parsed.eventAddress),
    googleMapLink: cleanText(parsed.googleMapLink),
    notes: cleanText(parsed.notes),
  } satisfies ParsedInquiryDetails;
}

export function getEmptyParsedInquiryDetails(): ParsedInquiryDetails {
  return { ...EMPTY_PARSED_DETAILS };
}
