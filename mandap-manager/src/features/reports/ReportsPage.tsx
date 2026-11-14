import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getBookings } from '@/services/bookingService';
import { getInventoryItems } from '@/services/inventoryService';
import { getLaborReport } from '@/services/laborService';
import { getVendorPayments } from '@/services/vendorService';
import { getOutstandingPayments, getDailyRevenue, getMonthlyRevenue } from '@/services/reportService';
import { getAppSettings } from '@/services/settingsService';
import { generateBookingReportPdf } from '@/utils/pdf/documents';
import { downloadCsv } from '@/utils/helpers';
import { formatCurrency } from '@/utils/calculations';
import { useTranslation } from '@/lib/i18n';

export function ReportsPage() {
  const [dailyRev, setDailyRev] = useState(0);
  const [monthlyRev, setMonthlyRev] = useState(0);
  const [outstanding, setOutstanding] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    Promise.all([
      getDailyRevenue(today),
      getMonthlyRevenue(now.getFullYear(), now.getMonth() + 1),
      getOutstandingPayments(),
    ]).then(([daily, monthly, out]) => {
      setDailyRev(daily);
      setMonthlyRev(monthly);
      setOutstanding(out.reduce((s, b) => s + b.remainingAmount, 0));
    });
  }, []);

  const exportBookingsPdf = async () => {
    try {
      const [bookings, settings] = await Promise.all([getBookings(), getAppSettings()]);
      await generateBookingReportPdf(bookings, settings, t('bookingReport'));
      toast.success('PDF exported');
    } catch (error) {
      console.error('Failed to export booking report PDF', error);
      toast.error('Failed to export booking report PDF');
    }
  };

  const exportBookingsCsv = async () => {
    const bookings = await getBookings();
    downloadCsv(
      [['Booking #', 'Customer', 'Date', 'Status', 'Total', 'Paid', 'Balance'], ...bookings.map((b) => [b.bookingNumber, b.customerName, b.eventDate, b.status, String(b.grandTotal), String(b.advancePayment), String(b.remainingAmount)])],
      'bookings_report.csv'
    );
    toast.success('CSV exported');
  };

  const exportInventoryCsv = async () => {
    const items = await getInventoryItems();
    downloadCsv(
      [['Item', 'Total', 'Booked', 'Available'], ...items.map((i) => [i.name, String(i.totalStock), String(i.bookedStock), String(i.availableStock)])],
      'inventory_report.csv'
    );
  };

  const exportLaborCsv = async () => {
    const assignments = await getLaborReport();
    downloadCsv(
      [[t('setupBoy'), 'Booking', 'Amount', 'Status'], ...assignments.map((a) => [a.laborerName, a.bookingId, String(a.paymentAmount), a.paidStatus])],
      'labor_report.csv'
    );
  };

  const exportVendorCsv = async () => {
    const payments = await getVendorPayments();
    downloadCsv(
      [['Vendor', 'Charges', 'Paid', 'Remaining'], ...payments.map((p) => [p.vendorName, String(p.charges), String(p.paidAmount), String(p.remainingAmount)])],
      'vendor_report.csv'
    );
  };

  const reports = [
    { title: t('dailyRevenue'), value: formatCurrency(dailyRev) },
    { title: t('monthlyReport'), value: formatCurrency(monthlyRev) },
    { title: t('outstandingPayments'), value: formatCurrency(outstanding) },
  ];

  return (
    <div>
      <PageHeader title={t('reports')} subtitle={t('allReports')} />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {reports.map((r) => (
          <Card key={r.title}>
            <p className="text-sm text-gray-500">{r.title}</p>
            <p className="text-2xl font-bold">{r.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { title: t('bookingReport'), pdf: exportBookingsPdf, csv: exportBookingsCsv },
          { title: t('inventoryReport'), csv: exportInventoryCsv },
          { title: t('laborReport'), csv: exportLaborCsv },
          { title: t('vendorReport'), csv: exportVendorCsv },
        ].map((report) => (
          <Card key={report.title} className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium">{report.title}</span>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              {report.pdf && <Button size="sm" variant="outline" onClick={report.pdf}>{t('exportPdf')}</Button>}
              <Button size="sm" variant="outline" onClick={report.csv}>{t('exportExcel')}</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
