import type { Estimate, Invoice, Booking, AppSettings } from '@/types';
import { buildEstimatePdfBlob, buildInvoicePdfBlob, buildBookingReportPdfBlob } from './invoicePdfRenderer';
import { buildInvoiceHtml } from './invoiceTemplate';

export async function generateEstimatePdf(estimate: Estimate, settings: AppSettings): Promise<void> {
  const blob = await buildEstimatePdfBlob(estimate, settings);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${estimate.estimateNumber}.pdf`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function generateInvoicePdf(invoice: Invoice, settings: AppSettings): Promise<void> {
  try {
    const blob = await buildInvoicePdfBlob(invoice, settings);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${invoice.invoiceNumber}.pdf`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch {
    // Fallback for environments where react-pdf font/network loading fails.
    const html = buildInvoiceHtml(invoice, settings);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const htmlUrl = URL.createObjectURL(blob);
    const popup = window.open(htmlUrl, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(htmlUrl), 5000);
    if (!popup) {
      throw new Error('Unable to open fallback invoice preview window');
    }
  }
}

export async function getInvoicePreviewPdfUrl(
  invoice: Invoice,
  settings: AppSettings
): Promise<string> {
  try {
    const blob = await buildInvoicePdfBlob(invoice, settings);
    return URL.createObjectURL(blob);
  } catch {
    const html = buildInvoiceHtml(invoice, settings);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    return URL.createObjectURL(blob);
  }
}

export async function generateBookingReportPdf(bookings: Booking[], settings: AppSettings, title: string): Promise<void> {
  const blob = await buildBookingReportPdfBlob(bookings, settings, title);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${title.replace(/\s/g, '_')}.pdf`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
