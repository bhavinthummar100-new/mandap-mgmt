import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Estimate, Invoice, Booking, AppSettings } from '@/types';
import { formatCurrency, formatDate } from '@/utils/calculations';
import { buildEstimatePdfBlob, buildInvoicePdfBlob } from './invoicePdfRenderer';
import { buildInvoiceHtml } from './invoiceTemplate';

function addHeader(doc: jsPDF, settings: AppSettings, title: string) {
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.businessName, 14, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(settings.address, 14, 27);
  if (settings.phone) doc.text(`Phone: ${settings.phone}`, 14, 32);
  if (settings.gstNumber) doc.text(`GSTIN: ${settings.gstNumber}`, 14, 37);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 50);
}

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

export function generateBookingReportPdf(bookings: Booking[], settings: AppSettings, title: string): void {
  const doc = new jsPDF({ orientation: 'landscape' });
  addHeader(doc, settings, title);

  autoTable(doc, {
    startY: 58,
    head: [['Booking #', 'Customer', 'Date', 'Status', 'Total', 'Paid', 'Balance']],
    body: bookings.map((b) => [
      b.bookingNumber,
      b.customerName,
      formatDate(b.eventDate),
      b.status,
      formatCurrency(b.grandTotal),
      formatCurrency(b.advancePayment),
      formatCurrency(b.remainingAmount),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(`${title.replace(/\s/g, '_')}.pdf`);
}
