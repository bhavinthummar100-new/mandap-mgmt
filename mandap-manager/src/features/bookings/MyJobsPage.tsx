import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { PageHeader, DataTable } from '@/components/shared';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { getBookingsByUser } from '@/services/bookingService';
import { formatDate } from '@/utils/calculations';
import { useTranslation } from '@/lib/i18n';
import type { Booking } from '@/types';

export function MyJobsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (user) {
      getBookingsByUser(user.uid).then(setBookings).finally(() => setLoading(false));
    }
  }, [user]);

  return (
    <div>
      <PageHeader title={t('myJobs')} />
      {loading ? (
        <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>
      ) : (
        <DataTable
          data={bookings}
          onRowClick={(b) => navigate(`/bookings/${b.id}`)}
          columns={[
            { key: 'customerName', label: t('customerName') },
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
