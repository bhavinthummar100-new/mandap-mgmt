import type { Invoice, AppSettings } from '@/types';
import { formatDate, getRentalDays } from '@/utils/calculations';
import { formatPdfCurrency } from './formatPdfCurrency';
import { amountToWords } from './amountToWords';
import { invoiceStyles } from './invoiceStyles';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildItemTitle(
  itemName: string,
  rentalDays?: number,
  startDate?: string,
  endDate?: string
): string {
  const days = Math.max(1, rentalDays ?? getRentalDays(startDate, endDate, 1));
  return days > 1 ? `${itemName} (${days} days)` : itemName;
}

function buildItemDetail(quantity: number, rentalDays?: number, startDate?: string, endDate?: string): string {
  const days = Math.max(1, rentalDays ?? getRentalDays(startDate, endDate, 1));
  if (days <= 1) return '';
  return `Qty: ${quantity} x ${days} days = ${quantity * days}`;
}

function getPerItemTaxValues(itemTotal: number, gstRate: number, isGst: boolean) {
  if (!isGst || gstRate <= 0) {
    return {
      gstRateText: '-',
      amountText: formatPdfCurrency(itemTotal),
      cgstText: '-',
      sgstText: '-',
      totalText: formatPdfCurrency(itemTotal),
    };
  }
  const halfRate = gstRate / 2;
  const cgst = (itemTotal * halfRate) / 100;
  const sgst = (itemTotal * halfRate) / 100;
  return {
    gstRateText: `${gstRate}%`,
    amountText: formatPdfCurrency(itemTotal),
    cgstText: formatPdfCurrency(cgst),
    sgstText: formatPdfCurrency(sgst),
    totalText: formatPdfCurrency(itemTotal + cgst + sgst),
  };
}

export function buildInvoiceHtml(invoice: Invoice, settings: AppSettings): string {
  const isGst = invoice.invoiceType === 'gst';
  const title = isGst ? 'Tax Invoice' : 'Invoice';
  const invoiceDate = formatDate(
    invoice.createdAt instanceof Date ? invoice.createdAt.toISOString() : new Date().toISOString()
  );
  const taxableAmount = Math.max(0, invoice.subTotal - invoice.discount);
  const cgstTotal = isGst ? invoice.taxAmount / 2 : 0;
  const sgstTotal = isGst ? invoice.taxAmount / 2 : 0;
  const amountInWords = amountToWords(invoice.grandTotal);
  const hasAdvance = invoice.advancePaid > 0;

  const itemRows = invoice.lineItems
    .map((item, index) => {
      const tax = getPerItemTaxValues(item.total, invoice.gstRate, isGst);
      const itemDetail = buildItemDetail(item.quantity, item.rentalDays, item.startDate, item.endDate);
      return `
        <tr class="classic-item-row">
          <td class="classic-col-index">${index + 1}.</td>
          <td class="${isGst ? 'classic-col-item' : 'classic-col-item-plain'}">
            <div class="classic-item-title">${escapeHtml(
              buildItemTitle(item.itemName, item.rentalDays, item.startDate, item.endDate)
            )}</div>
            ${itemDetail ? `<div class="classic-item-detail">${escapeHtml(itemDetail)}</div>` : ''}
          </td>
          ${
            isGst
              ? `
          <td class="classic-col-gst">${escapeHtml(tax.gstRateText)}</td>
          <td class="classic-col-qty">${item.quantity.toLocaleString('en-IN')}</td>
          <td class="classic-col-rate">${escapeHtml(formatPdfCurrency(item.rate))}</td>
          <td class="classic-col-amt">${escapeHtml(tax.amountText)}</td>
          <td class="classic-col-cgst">${escapeHtml(tax.cgstText)}</td>
          <td class="classic-col-sgst">${escapeHtml(tax.sgstText)}</td>
          <td class="classic-col-total">${escapeHtml(tax.totalText)}</td>
              `
              : `
          <td class="classic-col-qty-plain">${item.quantity.toLocaleString('en-IN')}</td>
          <td class="classic-col-rate-plain">${escapeHtml(formatPdfCurrency(item.rate))}</td>
          <td class="classic-col-total-plain">${escapeHtml(tax.totalText)}</td>
              `
          }
        </tr>
      `;
    })
    .join('');

  const billedByAddress = [
    settings.address,
    settings.phone ? `Phone: ${settings.phone}` : '',
    settings.gstNumber ? `GSTIN: ${settings.gstNumber}` : '',
  ]
    .filter(Boolean)
    .join('<br />');

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <style>${invoiceStyles}</style>
      </head>
      <body>
        <div class="classic-page">
          <div class="classic-header">
            <div class="classic-title-wrap">
              <div class="classic-title">${title}</div>
              <div class="classic-meta">
                <div><span>Invoice No</span><strong>${escapeHtml(invoice.invoiceNumber)}</strong></div>
                <div><span>Invoice Date</span><strong>${escapeHtml(invoiceDate)}</strong></div>
              </div>
            </div>
          </div>

          <div class="classic-cards">
            <div class="classic-card">
              <h4>Billed By</h4>
              <p class="classic-card-name">${escapeHtml(settings.businessName)}</p>
              <p>${billedByAddress}</p>
            </div>
            <div class="classic-card">
              <h4>Billed To</h4>
              <p class="classic-card-name">${escapeHtml(invoice.customerName)}</p>
              <p>
                ${escapeHtml(invoice.eventAddress)}<br />
                Mobile: ${escapeHtml(invoice.mobile)}<br />
                ${isGst && settings.gstNumber ? `GSTIN: ${escapeHtml(settings.gstNumber)}<br />` : ''}
                Booking ID: ${escapeHtml(invoice.bookingNumber)}<br />
                Event Date: ${escapeHtml(formatDate(invoice.eventDate))}
              </p>
            </div>
          </div>

          <table class="classic-table">
            <thead>
              <tr>
                <th class="classic-col-index"></th>
                <th class="${isGst ? 'classic-col-item' : 'classic-col-item-plain'}">Item</th>
                ${
                  isGst
                    ? `
                <th class="classic-col-gst">GST Rate</th>
                <th class="classic-col-qty">Quantity</th>
                <th class="classic-col-rate">Rate</th>
                <th class="classic-col-amt">Amount</th>
                <th class="classic-col-cgst">CGST</th>
                <th class="classic-col-sgst">SGST</th>
                <th class="classic-col-total">Total</th>
                    `
                    : `
                <th class="classic-col-qty-plain">Quantity</th>
                <th class="classic-col-rate-plain">Rate</th>
                <th class="classic-col-total-plain">Amount</th>
                    `
                }
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <div class="classic-totals-row">
            <div class="classic-amount-words">
              <p class="classic-footer-strong">Amount in Words: ${escapeHtml(amountInWords)}</p>
            </div>
            <div class="classic-summary-wrap">
              <table class="classic-summary">
                <tbody>
                <tr><td>Amount</td><td>${escapeHtml(formatPdfCurrency(taxableAmount))}</td></tr>
                ${
                  invoice.discount > 0
                    ? `<tr><td>Discount</td><td>- ${escapeHtml(formatPdfCurrency(invoice.discount))}</td></tr>`
                    : ''
                }
                ${
                  isGst
                    ? `<tr><td>CGST</td><td>${escapeHtml(formatPdfCurrency(cgstTotal))}</td></tr>
                <tr><td>SGST</td><td>${escapeHtml(formatPdfCurrency(sgstTotal))}</td></tr>`
                    : ''
                }
                ${
                  hasAdvance
                    ? `<tr class="classic-row-bold"><td>Grand Total</td><td>${escapeHtml(formatPdfCurrency(invoice.grandTotal))}</td></tr>
                <tr><td>Advance Paid</td><td>${escapeHtml(formatPdfCurrency(invoice.advancePaid))}</td></tr>
                <tr class="classic-row-final"><td>Balance Due</td><td>${escapeHtml(formatPdfCurrency(invoice.remainingBalance))}</td></tr>`
                    : `<tr class="classic-row-final"><td>Total</td><td>${escapeHtml(formatPdfCurrency(invoice.grandTotal))}</td></tr>`
                }
                </tbody>
              </table>
            </div>
          </div>

          <div class="classic-footer">
            <p>Thank you for choosing Nilkanth Mandap Decoration.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
