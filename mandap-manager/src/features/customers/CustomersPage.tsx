import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, DataTable } from '@/components/shared';
import { Button } from '@/components/ui/Button';
import { getCustomers } from '@/services/customerService';
import { getBookings } from '@/services/bookingService';
import { formatDate } from '@/utils/calculations';
import { useTranslation } from '@/lib/i18n';
import type { Customer, Booking } from '@/types';

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    Promise.all([getCustomers(), getBookings()]).then(([c, b]) => {
      setCustomers(c);
      setBookings(b);
      setLoading(false);
    });
  }, []);

  const handleRepeatBooking = (customer: Customer) => {
    const lastBooking = bookings
      .filter((b) => b.customerId === customer.id || b.mobile === customer.mobile)
      .sort((a, b) => b.eventDate.localeCompare(a.eventDate))[0];

    navigate('/inquiries', {
      state: {
        repeat: {
          customerName: customer.name,
          mobile: customer.mobile,
          eventAddress: customer.address ?? lastBooking?.eventAddress ?? '',
          lineItems: lastBooking?.lineItems ?? [],
        },
      },
    });
  };

  return (
    <div>
      <PageHeader title={t('customers')} />
      {loading ? (
        <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>
      ) : (
        <DataTable
          data={customers}
          columns={[
            { key: 'name', label: t('customerName') },
            { key: 'mobile', label: t('mobile') },
            { key: 'totalBookings', label: 'Bookings' },
            { key: 'lastEventDate', label: 'Last Event', render: (c) => c.lastEventDate ? formatDate(c.lastEventDate) : '-' },
            { key: 'actions', label: t('actions'), render: (c) => (
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleRepeatBooking(c); }}>
                {t('repeatBooking')}
              </Button>
            )},
          ]}
        />
      )}
    </div>
  );
}
