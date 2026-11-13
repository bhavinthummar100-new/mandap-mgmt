import { pdf } from '@react-pdf/renderer';
import type { AppSettings, Estimate, Invoice } from '@/types';
import { EstimatePdfDocument, InvoicePdfDocument } from './invoiceReactPdf';

export async function buildEstimatePdfBlob(estimate: Estimate, settings: AppSettings): Promise<Blob> {
  return pdf(<EstimatePdfDocument estimate={estimate} settings={settings} />).toBlob();
}

export async function buildInvoicePdfBlob(invoice: Invoice, settings: AppSettings): Promise<Blob> {
  return pdf(<InvoicePdfDocument invoice={invoice} settings={settings} />).toBlob();
}
