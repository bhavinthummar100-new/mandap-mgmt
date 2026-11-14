import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { LoadingSkeleton, PageHeader, DataTable } from '@/components/shared';
import { CustomerAvatar } from '@/components/shared/CustomerAvatar';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getBookings } from '@/services/bookingService';
import { getCustomers } from '@/services/customerService';
import { formatDate, formatCurrency } from '@/utils/calculations';
import { useTranslation } from '@/lib/i18n';
import type { Booking } from '@/types';

export function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customerPhotos, setCustomerPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    getBookings().then(setBookings).finally(() => setLoading(false));
    getCustomers()
      .then((customers) => setCustomerPhotos(Object.fromEntries(customers.flatMap((customer) =>
        customer.photoUrl ? [[customer.id, customer.photoUrl]] : []
      ))))
      .catch((error: unknown) => console.error('Failed to load customer photos', error));
  }, []);

  return (
    <div>
      <PageHeader
        title={t('bookings')}
        action={(
          <Button onClick={() => navigate('/bookings/new')}>
            <Plus className="h-4 w-4" />
            New Booking
          </Button>
        )}
      />
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <DataTable
          data={bookings}
          onRowClick={(b) => navigate(`/bookings/${b.id}`)}
          columns={[
            { key: 'bookingNumber', label: 'Booking #' },
            {
              key: 'customerName',
              label: t('customerName'),
              render: (booking) => (
                <span className="flex items-center gap-3">
                  <CustomerAvatar name={booking.customerName} photoUrl={booking.customerId ? customerPhotos[booking.customerId] : undefined} size="sm" />
                  <span className="font-semibold">{booking.customerName}</span>
                </span>
              ),
            },
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
