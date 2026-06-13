import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Estimate, Invoice, Booking, AppSettings } from '@/types';
import { formatCurrency, formatDate, formatTime, getRentalDays } from '@/utils/calculations';
import { buildInvoicePdfBlob } from './invoiceReactPdf';
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

function addLineItemsTable(doc: jsPDF, startY: number, lineItems: Estimate['lineItems']) {
  autoTable(doc, {
    startY,
    head: [['#', 'Item', 'Qty', 'Rate', 'Total']],
    body: lineItems.map((item, i) => [
      String(i + 1),
      buildItemLabel(item.itemName, item.rentalDays, item.startDate, item.endDate),
      String(item.quantity),
      formatCurrency(item.rate),
      formatCurrency(item.total),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
  });
  return (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function buildItemLabel(
  itemName: string,
  rentalDays?: number,
  startDate?: string,
  endDate?: string
) {
  const days = Math.max(1, rentalDays ?? getRentalDays(startDate, endDate, 1));
  return days > 1 ? `${itemName} (${days} days)` : itemName;
}

export function generateEstimatePdf(estimate: Estimate, settings: AppSettings): void {
  const doc = new jsPDF();
  addHeader(doc, settings, 'ESTIMATE');

  doc.setFontSize(10);
  doc.text(`Estimate No: ${estimate.estimateNumber}`, 14, 58);
  doc.text(`Date: ${formatDate(new Date().toISOString())}`, 14, 64);

  doc.text(`Customer: ${estimate.customerName}`, 14, 74);
  doc.text(`Mobile: ${estimate.mobile}`, 14, 80);
  doc.text(`Event Date: ${formatDate(estimate.eventDate)} at ${formatTime(estimate.eventTime)}`, 14, 86);
  doc.text(`Address: ${estimate.eventAddress}`, 14, 92);

  let y = addLineItemsTable(doc, 100, estimate.lineItems);

  y += 10;
  doc.text(`Sub Total: ${formatCurrency(estimate.subTotal)}`, 140, y);
  y += 6;
  doc.text(`Discount: ${formatCurrency(estimate.discount)}`, 140, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(`Grand Total: ${formatCurrency(estimate.grandTotal)}`, 140, y);

  doc.save(`${estimate.estimateNumber}.pdf`);
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
