import { pdf } from '@react-pdf/renderer';
import type { AppSettings, Booking, Estimate, Invoice } from '@/types';
import { BookingReportPdfDocument, EstimatePdfDocument, InvoicePdfDocument } from './invoiceReactPdf';

export async function buildBookingReportPdfBlob(
  bookings: Booking[],
  settings: AppSettings,
  title: string
): Promise<Blob> {
  return pdf(<BookingReportPdfDocument bookings={bookings} settings={settings} title={title} />).toBlob();
}

export async function buildEstimatePdfBlob(estimate: Estimate, settings: AppSettings): Promise<Blob> {
  return pdf(<EstimatePdfDocument estimate={estimate} settings={settings} />).toBlob();
}

export async function buildInvoicePdfBlob(invoice: Invoice, settings: AppSettings): Promise<Blob> {
  return pdf(<InvoicePdfDocument invoice={invoice} settings={settings} />).toBlob();
}
