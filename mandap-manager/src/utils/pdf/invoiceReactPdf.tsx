import { Document, Font, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import type { AppSettings, Invoice, LineItem } from '@/types';
import { formatDate, getRentalDays } from '@/utils/calculations';

Font.register({
  family: 'Noto Sans PDF',
  fonts: [
    {
      src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5.2.9/files/noto-sans-latin-400-normal.woff',
      fontWeight: 400,
    },
    {
      src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5.2.9/files/noto-sans-latin-700-normal.woff',
      fontWeight: 700,
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: 'Noto Sans PDF',
    fontSize: 10,
    color: '#111827',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    color: '#5f35c7',
    fontWeight: 700,
  },
  metaWrap: {
    width: 210,
  },
  metaLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 10,
  },
  metaKey: {
    color: '#4b5563',
    fontSize: 10,
  },
  metaVal: {
    fontSize: 10,
    fontWeight: 700,
  },
  businessName: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 2,
  },
  businessSub: {
    fontSize: 10,
    color: '#4b5563',
    marginBottom: 10,
  },
  cards: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  card: {
    flex: 1,
    backgroundColor: '#ede9fb',
    borderColor: '#ddd6fe',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    minHeight: 105,
  },
  cardTitle: {
    fontSize: 14,
    color: '#5f35c7',
    marginBottom: 6,
  },
  cardName: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 3,
  },
  cardText: {
    fontSize: 10,
    lineHeight: 1.4,
    color: '#374151',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#5f35c7',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  th: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 700,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: '#7c58d8',
  },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  td: {
    fontSize: 9.5,
    color: '#374151',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
  },
  tdNum: {
    textAlign: 'right',
  },
  itemName: {
    fontSize: 9.5,
    color: '#111827',
  },
  itemDetail: {
    fontSize: 8.5,
    color: '#6b7280',
    marginTop: 2,
  },
  summaryWrap: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  summary: {
    width: 300,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    fontSize: 10,
  },
  summaryBold: {
    fontWeight: 700,
    backgroundColor: '#efe9fb',
  },
  summaryFinal: {
    fontWeight: 700,
    backgroundColor: '#5f35c7',
    color: '#ffffff',
  },
});

const col = {
  index: '5%',
  item: '30%',
  gst: '9.285%',
  qty: '9.285%',
  rate: '9.285%',
  amount: '9.285%',
  cgst: '9.285%',
  sgst: '9.285%',
  total: '9.285%',
} as const;

function formatPdfCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function buildItemDetail(item: LineItem): string {
  const days = Math.max(1, item.rentalDays ?? getRentalDays(item.startDate, item.endDate, 1));
  if (days <= 1) return '';
  return `Qty: ${item.quantity} x ${days} days = ${item.quantity * days}`;
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

function SummaryRow({
  label,
  value,
  bold = false,
  final = false,
  noBorder = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
  final?: boolean;
  noBorder?: boolean;
}) {
  return (
    <View
      style={[
        styles.summaryRow,
        ...(bold ? [styles.summaryBold] : []),
        ...(final ? [styles.summaryFinal] : []),
        ...(noBorder ? [{ borderBottomWidth: 0 }] : []),
      ]}
    >
      <Text>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

export function InvoicePdfDocument({ invoice, settings }: { invoice: Invoice; settings: AppSettings }) {
  const isGst = invoice.invoiceType === 'gst';
  const invoiceDate = formatDate(
    invoice.createdAt instanceof Date ? invoice.createdAt.toISOString() : new Date().toISOString()
  );
  const taxableAmount = Math.max(0, invoice.subTotal - invoice.discount);
  const cgstTotal = isGst ? invoice.taxAmount / 2 : 0;
  const sgstTotal = isGst ? invoice.taxAmount / 2 : 0;

  return (
    <Document title={invoice.invoiceNumber}>
      <Page size="A4" style={styles.page}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{isGst ? 'Tax Invoice' : 'Invoice'}</Text>
          <View style={styles.metaWrap}>
            <View style={styles.metaLine}>
              <Text style={styles.metaKey}>Invoice No</Text>
              <Text style={styles.metaVal}>{invoice.invoiceNumber}</Text>
            </View>
            <View style={styles.metaLine}>
              <Text style={styles.metaKey}>Invoice Date</Text>
              <Text style={styles.metaVal}>{invoiceDate}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.businessName}>{settings.businessName}</Text>

        <View style={styles.cards}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Billed By</Text>
            <Text style={styles.cardName}>{settings.businessName}</Text>
            <Text style={styles.cardText}>{settings.address}</Text>
            {!!settings.phone && <Text style={styles.cardText}>Phone: {settings.phone}</Text>}
            {!!settings.gstNumber && <Text style={styles.cardText}>GSTIN: {settings.gstNumber}</Text>}
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Billed To</Text>
            <Text style={styles.cardName}>{invoice.customerName}</Text>
            <Text style={styles.cardText}>{invoice.eventAddress}</Text>
            <Text style={styles.cardText}>Mobile: {invoice.mobile}</Text>
            <Text style={styles.cardText}>Booking: {invoice.bookingNumber}</Text>
            <Text style={styles.cardText}>Event Date: {formatDate(invoice.eventDate)}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: col.index }]} />
          <Text style={[styles.th, { width: col.item }]}>Item</Text>
          <Text style={[styles.th, styles.tdNum, { width: col.gst }]}>GST Rate</Text>
          <Text style={[styles.th, styles.tdNum, { width: col.qty }]}>Quantity</Text>
          <Text style={[styles.th, styles.tdNum, { width: col.rate }]}>Rate</Text>
          <Text style={[styles.th, styles.tdNum, { width: col.amount }]}>Amount</Text>
          <Text style={[styles.th, styles.tdNum, { width: col.cgst }]}>CGST</Text>
          <Text style={[styles.th, styles.tdNum, { width: col.sgst }]}>SGST</Text>
          <Text style={[styles.th, styles.tdNum, { width: col.total, borderRightWidth: 0 }]}>Total</Text>
        </View>

        {invoice.lineItems.map((item, index) => {
          const tax = getPerItemTaxValues(item.total, invoice.gstRate, isGst);
          const detail = buildItemDetail(item);
          return (
            <View key={`${item.itemName}-${index}`} style={styles.tr} wrap={false}>
              <Text style={[styles.td, { width: col.index }]}>{index + 1}.</Text>
              <View style={[styles.td, { width: col.item }]}>
                <Text style={styles.itemName}>{item.itemName}</Text>
                {!!detail && <Text style={styles.itemDetail}>{detail}</Text>}
              </View>
              <Text style={[styles.td, styles.tdNum, { width: col.gst }]}>{tax.gstRateText}</Text>
              <Text style={[styles.td, styles.tdNum, { width: col.qty }]}>
                {item.quantity.toLocaleString('en-IN')}
              </Text>
              <Text style={[styles.td, styles.tdNum, { width: col.rate }]}>{formatPdfCurrency(item.rate)}</Text>
              <Text style={[styles.td, styles.tdNum, { width: col.amount }]}>{tax.amountText}</Text>
              <Text style={[styles.td, styles.tdNum, { width: col.cgst }]}>{tax.cgstText}</Text>
              <Text style={[styles.td, styles.tdNum, { width: col.sgst }]}>{tax.sgstText}</Text>
              <Text style={[styles.td, styles.tdNum, { width: col.total, borderRightWidth: 0 }]}>
                {tax.totalText}
              </Text>
            </View>
          );
        })}

        <View style={styles.summaryWrap}>
          <View style={styles.summary}>
            <SummaryRow label="Taxable Amount" value={formatPdfCurrency(taxableAmount)} />
            {invoice.discount > 0 && (
              <SummaryRow label="Discount" value={`- ${formatPdfCurrency(invoice.discount)}`} />
            )}
            <SummaryRow label="CGST" value={isGst ? formatPdfCurrency(cgstTotal) : '-'} />
            <SummaryRow label="SGST" value={isGst ? formatPdfCurrency(sgstTotal) : '-'} />
            <SummaryRow label="Grand Total" value={formatPdfCurrency(invoice.grandTotal)} bold />
            <SummaryRow label="Advance Paid" value={formatPdfCurrency(invoice.advancePaid)} />
            <SummaryRow
              label="Balance Due"
              value={formatPdfCurrency(invoice.remainingBalance)}
              final
              noBorder
            />
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function buildInvoicePdfBlob(invoice: Invoice, settings: AppSettings): Promise<Blob> {
  return pdf(<InvoicePdfDocument invoice={invoice} settings={settings} />).toBlob();
}
