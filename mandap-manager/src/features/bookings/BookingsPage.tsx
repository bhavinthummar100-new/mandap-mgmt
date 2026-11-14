import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { LoadingSkeleton, PageHeader, DataTable } from '@/components/shared';
import { CustomerAvatar } from '@/components/shared/CustomerAvatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { BOOKING_STATUSES } from '@/lib/constants';
import { getBookings } from '@/services/bookingService';
import { getCustomers } from '@/services/customerService';
import { formatDate, formatTime, formatCurrency } from '@/utils/calculations';
import { useTranslation } from '@/lib/i18n';
import type { Booking, BookingStatus } from '@/types';
import { formatIndianPhoneNumber, normalizeIndianPhoneNumber } from '@/utils/phone';
import { openWhatsApp } from '@/utils/whatsapp';

type BookingFilter = 'all' | BookingStatus;

export function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customerPhotos, setCustomerPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<BookingFilter>('all');
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    getBookings()
      .then(setBookings)
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false));
    getCustomers()
      .then((customers) => setCustomerPhotos(Object.fromEntries(customers.flatMap((customer) =>
        customer.photoUrl ? [[customer.id, customer.photoUrl]] : []
      ))))
      .catch((error: unknown) => console.error('Failed to load customer photos', error));
  }, []);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return bookings.filter((booking) => {
      if (activeFilter !== 'all' && booking.status !== activeFilter) return false;
      if (!query) return true;
      const mobileQuery = query.replace(/\D/g, '');
      return booking.customerName.toLocaleLowerCase().includes(query)
        || booking.bookingNumber.toLocaleLowerCase().includes(query)
        || Boolean(mobileQuery && booking.mobile.replace(/\D/g, '').includes(mobileQuery))
        || booking.eventAddress.toLocaleLowerCase().includes(query)
        || (booking.eventType ?? '').toLocaleLowerCase().includes(query);
    });
  }, [activeFilter, bookings, search]);

  const statusTabs: { key: BookingFilter; label: string; count: number }[] = [
    { key: 'all', label: t('all'), count: bookings.length },
    ...BOOKING_STATUSES.map((status) => ({
      key: status,
      label: status,
      count: bookings.filter((booking) => booking.status === status).length,
    })),
  ];

  const openBooking = (booking: Booking) => navigate(`/bookings/${booking.id}`);

  return (
    <div className="pb-14 md:pb-0">
      <PageHeader
        title={t('bookings')}
        action={(
          <Button
            className="hidden max-sm:hidden sm:inline-flex"
            onClick={() => navigate('/bookings/new')}
          >
            <Plus className="h-4 w-4" />
            {t('newBooking')}
          </Button>
        )}
      />

      <div className="mb-4 space-y-3">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            aria-label={t('search')}
            placeholder={t('bookingSearchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-h-12 rounded-2xl border-0 bg-slate-100/80 pl-10 shadow-inner focus:bg-white dark:bg-gray-800 dark:focus:bg-gray-800"
          />
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key)}
              aria-pressed={activeFilter === tab.key}
              className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                activeFilter === tab.key
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {tab.label}
              <span className={activeFilter === tab.key ? 'rounded-full bg-white/20 px-1.5 text-xs' : 'rounded-full bg-gray-100 px-1.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-300'}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        {!loading && (
          <div className="flex items-center justify-between border-b border-gray-100 pb-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:border-gray-800">
            <span>{t('bookings')} · {filteredBookings.length}</span>
            <span>{t('eventDate')} ↓</span>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : filteredBookings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-600 dark:text-gray-400">
          {bookings.length === 0 ? t('noData') : t('noBookingsFound')}
        </div>
      ) : (
        <>
          <div className="space-y-3.5 md:hidden">
            {filteredBookings.map((booking) => {
              const phoneDigits = normalizeIndianPhoneNumber(booking.mobile);
              const photoUrl = booking.customerId ? customerPhotos[booking.customerId] : undefined;
              return (
                <article
                  key={booking.id}
                  tabIndex={0}
                  aria-label={`${t('details')}: ${booking.bookingNumber} ${booking.customerName}`}
                  onClick={() => openBooking(booking)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openBooking(booking);
                    }
                  }}
                  className="cursor-pointer rounded-3xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-200/50 transition hover:border-indigo-100 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <CustomerAvatar
                        name={booking.customerName}
                        photoUrl={photoUrl}
                        size="md"
                        className="ring-2 ring-slate-100 dark:ring-gray-700"
                      />
                      <div className="min-w-0">
                        <h2 className="break-words text-base font-semibold leading-snug text-gray-900 dark:text-gray-100">
                          {booking.customerName || '—'}
                        </h2>
                        <p className="mt-0.5 truncate text-xs font-medium text-gray-400">
                          {booking.eventType?.trim() || booking.bookingNumber}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={booking.status} className="shrink-0 px-2.5 py-1 text-[11px]" />
                  </div>

                  <div className="mt-3.5 space-y-2 border-t border-slate-100 pt-3 dark:border-gray-700">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-slate-50 p-2.5 text-sm font-medium text-gray-700 dark:bg-gray-900/70 dark:text-gray-200">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                        {formatDate(booking.eventDate) || '—'}
                      </span>
                      {formatTime(booking.eventTime) && (
                        <>
                          <span aria-hidden="true" className="text-gray-300">•</span>
                          <span className="inline-flex items-center gap-2">
                            <Clock3 className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                            {formatTime(booking.eventTime)}
                          </span>
                        </>
                      )}
                    </div>

                    {phoneDigits && (
                      <a
                        href={`tel:+91${phoneDigits}`}
                        onClick={(event) => event.stopPropagation()}
                        className="flex min-w-0 items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400"
                      >
                        <Phone className="h-4 w-4 shrink-0" />
                        <span className="truncate">{formatIndianPhoneNumber(booking.mobile)}</span>
                      </a>
                    )}

                    {booking.eventAddress?.trim() && (
                      <div className="flex min-w-0 items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                        <span className="line-clamp-2 min-w-0 break-words">{booking.eventAddress.trim()}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      {phoneDigits && (
                        <>
                          <a
                            href={`tel:+91${phoneDigits}`}
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`${t('call')} ${booking.customerName}`}
                            title={t('call')}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-sm transition hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openWhatsApp(`Hi ${booking.customerName}, we are contacting you regarding your booking.`, `+91${phoneDigits}`);
                            }}
                            aria-label={`WhatsApp ${booking.customerName}`}
                            title="WhatsApp"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-sm transition hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <StatusBadge status={booking.paymentStatus} className="ml-1" />
                    </div>
                    <button
                      type="button"
                      aria-label={`${t('remainingAmount')}: ${formatCurrency(booking.remainingAmount)}. ${t('details')}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        openBooking(booking);
                      }}
                      className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                    >
                      {formatCurrency(booking.remainingAmount)}
                      <ArrowRight className="h-4 w-4" />
                      <span className="sr-only">{t('details')}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden md:block">
            <DataTable
              data={filteredBookings}
              onRowClick={openBooking}
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
                { key: 'eventDate', label: t('eventDate'), render: (booking) => formatDate(booking.eventDate) },
                { key: 'grandTotal', label: t('grandTotal'), render: (booking) => formatCurrency(booking.grandTotal) },
                { key: 'remainingAmount', label: t('remainingAmount'), render: (booking) => formatCurrency(booking.remainingAmount) },
                { key: 'status', label: t('status'), render: (booking) => <StatusBadge status={booking.status} /> },
                { key: 'paymentStatus', label: t('paymentStatus'), render: (booking) => <StatusBadge status={booking.paymentStatus} /> },
              ]}
            />
          </div>
        </>
      )}

      <Button
        type="button"
        aria-label={t('newBooking')}
        title={t('newBooking')}
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom)+1rem)] right-4 z-20 h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-0 text-white shadow-xl shadow-indigo-500/30 hover:from-indigo-700 hover:to-violet-700 sm:hidden"
        onClick={() => navigate('/bookings/new')}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
