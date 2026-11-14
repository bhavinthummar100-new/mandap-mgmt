import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { LoadingSkeleton, PageHeader, DataTable } from '@/components/shared';
import { CustomerAvatar } from '@/components/shared/CustomerAvatar';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { getBookingsByUser } from '@/services/bookingService';
import { getCustomers } from '@/services/customerService';
import { formatDate } from '@/utils/calculations';
import { useTranslation } from '@/lib/i18n';
import type { Booking } from '@/types';

export function MyJobsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customerPhotos, setCustomerPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (user) {
      getBookingsByUser(user.uid).then(setBookings).finally(() => setLoading(false));
    }
    getCustomers()
      .then((customers) => setCustomerPhotos(Object.fromEntries(customers.flatMap((customer) =>
        customer.photoUrl ? [[customer.id, customer.photoUrl]] : []
      ))))
      .catch((error: unknown) => console.error('Failed to load customer photos', error));
  }, [user]);

  return (
    <div>
      <PageHeader title={t('myJobs')} />
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <DataTable
          data={bookings}
          onRowClick={(b) => navigate(`/bookings/${b.id}`)}
          columns={[
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
            { key: 'eventAddress', label: t('eventAddress') },
            { key: 'status', label: t('status'), render: (b) => <StatusBadge status={b.status} /> },
            {
              key: 'jobSheet',
              label: t('jobSheet'),
              render: (booking) => (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/bookings/${booking.id}/job-sheet`);
                  }}
                >
                  <ClipboardList className="h-4 w-4" /> {t('viewJobSheet')}
                </Button>
              ),
            },
          ]}
          emptyMessage="No assigned jobs"
        />
      )}
    </div>
  );
}
