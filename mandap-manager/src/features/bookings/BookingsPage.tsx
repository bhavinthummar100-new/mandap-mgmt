import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, DataTable } from '@/components/shared';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getBookings } from '@/services/bookingService';
import { formatDate, formatCurrency } from '@/utils/calculations';
import { useTranslation } from '@/lib/i18n';
import type { Booking } from '@/types';

export function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    getBookings().then(setBookings).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title={t('bookings')} />
      {loading ? (
        <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>
      ) : (
        <DataTable
          data={bookings}
          onRowClick={(b) => navigate(`/bookings/${b.id}`)}
          columns={[
            { key: 'bookingNumber', label: 'Booking #' },
            { key: 'customerName', label: t('customerName') },
            { key: 'eventDate', label: t('eventDate'), render: (b) => formatDate(b.eventDate) },
            { key: 'grandTotal', label: t('grandTotal'), render: (b) => formatCurrency(b.grandTotal) },
            { key: 'remainingAmount', label: t('remainingAmount'), render: (b) => formatCurrency(b.remainingAmount) },
            { key: 'status', label: t('status'), render: (b) => <StatusBadge status={b.status} /> },
            { key: 'paymentStatus', label: t('paymentStatus'), render: (b) => <StatusBadge status={b.paymentStatus} /> },
          ]}
        />
      )}
    </div>
  );
}
