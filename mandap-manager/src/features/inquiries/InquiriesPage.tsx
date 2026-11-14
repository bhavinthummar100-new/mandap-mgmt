import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MessageCircle,
  Phone,
  Plus,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { LoadingSkeleton, PageHeader } from '@/components/shared';
import { CustomerAvatar } from '@/components/shared/CustomerAvatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { convertEstimateToBooking, getBookingByInquiryId, getBookings } from '@/services/bookingService';
import { getEstimateByInquiryId } from '@/services/estimateService';
import { getInquiries } from '@/services/inquiryService';
import { getCustomers } from '@/services/customerService';
import { useTranslation } from '@/lib/i18n';
import type { Inquiry } from '@/types';
import { formatDate } from '@/utils/calculations';
import { formatIndianPhoneNumber, normalizeIndianPhoneNumber } from '@/utils/phone';
import { openWhatsApp } from '@/utils/whatsapp';

type InquiryFilter = 'all' | 'new' | 'estimate_created' | 'converted' | 'closed';
type SortDirection = 'asc' | 'desc';
type SortKey = 'createdAt' | 'customerName' | 'mobile' | 'eventDate' | 'eventAddress' | 'status';

const PAGE_SIZE = 10;

function getInquiryStatusLabel(
  status: Inquiry['status'],
  t: (key: 'newStatus' | 'followUp' | 'converted' | 'lost') => string
): string {
  switch (status) {
    case 'new':
      return t('newStatus');
    case 'estimate_created':
      return t('followUp');
    case 'converted':
      return t('converted');
    case 'closed':
      return t('lost');
  }
}

function compareValues(left: unknown, right: unknown, key: SortKey): number {
  const leftEmpty = left === null || left === undefined || left === '';
  const rightEmpty = right === null || right === undefined || right === '';
  if (leftEmpty || rightEmpty) {
    if (leftEmpty && rightEmpty) return 0;
    return leftEmpty ? 1 : -1;
  }

  if (key === 'createdAt') {
    const leftTime = left instanceof Date ? left.getTime() : Date.parse(String(left));
    const rightTime = right instanceof Date ? right.getTime() : Date.parse(String(right));
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) return leftTime - rightTime;
  }

  if (key === 'eventDate') {
    const leftDate = Date.parse(`${String(left)}T00:00:00`);
    const rightDate = Date.parse(`${String(right)}T00:00:00`);
    if (Number.isFinite(leftDate) && Number.isFinite(rightDate)) return leftDate - rightDate;
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

export function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [customerPhotos, setCustomerPhotos] = useState<Record<string, string>>({});
  const [bookedInquiryIds, setBookedInquiryIds] = useState<Set<string>>(() => new Set());
  const [bookingCheckComplete, setBookingCheckComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<InquiryFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    getInquiries()
      .then(setInquiries)
      .catch(() => toast.error('Failed to load inquiries'))
      .finally(() => setLoading(false));

    getCustomers()
      .then((customers) => setCustomerPhotos(Object.fromEntries(customers.flatMap((customer) =>
        customer.photoUrl ? [[customer.id, customer.photoUrl]] : []
      ))))
      .catch((error: unknown) => console.error('Failed to load customer photos', error));

    getBookings()
      .then((bookings) => setBookedInquiryIds(new Set(bookings.map((booking) => booking.inquiryId))))
      .catch(() => toast.error('Failed to check existing bookings'))
      .finally(() => setBookingCheckComplete(true));
  }, []);

  const counts = useMemo(() => ({
    all: inquiries.length,
    new: inquiries.filter((inquiry) => inquiry.status === 'new').length,
    estimate_created: inquiries.filter((inquiry) => inquiry.status === 'estimate_created').length,
    converted: inquiries.filter((inquiry) => inquiry.status === 'converted').length,
    closed: inquiries.filter((inquiry) => inquiry.status === 'closed').length,
  }), [inquiries]);

  const filteredInquiries = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return inquiries
      .filter((inquiry) => activeFilter === 'all' || inquiry.status === activeFilter)
      .filter((inquiry) => {
        if (!query) return true;
        const mobileQuery = query.replace(/\D/g, '');
        return inquiry.customerName.toLocaleLowerCase().includes(query)
          || Boolean(mobileQuery && inquiry.mobile.replace(/\D/g, '').includes(mobileQuery));
      })
      .sort((a, b) => {
        const left = a[sortKey];
        const right = b[sortKey];
        const leftEmpty = left === null || left === undefined || left === '';
        const rightEmpty = right === null || right === undefined || right === '';
        if (leftEmpty || rightEmpty) {
          if (leftEmpty && rightEmpty) return 0;
          return leftEmpty ? 1 : -1;
        }
        const result = compareValues(left, right, sortKey);
        return sortDirection === 'asc' ? result : -result;
      });
  }, [activeFilter, inquiries, search, sortDirection, sortKey]);

  const pageCount = Math.ceil(filteredInquiries.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, pageCount));
  const pageInquiries = filteredInquiries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const changeFilter = (filter: InquiryFilter) => {
    setActiveFilter(filter);
    setPage(1);
  };

  const changeSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection(key === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const handleConvert = async (inquiry: Inquiry) => {
    if (convertingId) return;
    setConvertingId(inquiry.id);
    try {
      const existingBooking = await getBookingByInquiryId(inquiry.id);
      if (existingBooking) {
        toast.error('This inquiry already has a booking');
        return;
      }

      const estimate = await getEstimateByInquiryId(inquiry.id);
      if (!estimate) {
        toast.error('Create an estimate before converting this inquiry');
        return;
      }
      if (estimate.status !== 'sent' && estimate.status !== 'approved') {
        toast.error('Send the estimate before converting this inquiry');
        navigate(`/estimates/${estimate.id}`);
        return;
      }

      const { bookingId, warnings } = await convertEstimateToBooking(estimate, 0);
      if (warnings.length) toast(`Booking created with warnings: ${warnings.join(' | ')}`);
      else toast.success('Booking created');
      navigate(`/bookings/${bookingId}`);
    } catch {
      toast.error('Failed to convert inquiry to booking');
    } finally {
      setConvertingId(null);
    }
  };

  const renderPhoneActions = (inquiry: Inquiry) => {
    const digits = normalizeIndianPhoneNumber(inquiry.mobile);
    return (
      <>
        {digits ? (
          <>
            <a
              href={`tel:+91${digits}`}
              onClick={(event) => event.stopPropagation()}
              aria-label={`${t('call')} ${inquiry.customerName}`}
              title={t('call')}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <Phone className="h-3.5 w-3.5" /> {t('call')}
            </a>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={`WhatsApp ${inquiry.customerName}`}
              title="WhatsApp"
              className="px-2"
              onClick={(event) => {
                event.stopPropagation();
                openWhatsApp(`Hi ${inquiry.customerName}, we are contacting you regarding your inquiry.`, `+91${digits}`);
              }}
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </>
    );
  };

  const renderRowActions = (inquiry: Inquiry) => (
    <div className="flex flex-wrap items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
      {renderPhoneActions(inquiry)}
      {bookingCheckComplete && inquiry.status !== 'converted' && !bookedInquiryIds.has(inquiry.id) && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          loading={convertingId === inquiry.id}
          disabled={Boolean(convertingId && convertingId !== inquiry.id)}
          onClick={() => handleConvert(inquiry)}
        >
          {t('convertToBooking')}
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => navigate(`/inquiries/${inquiry.id}?edit=true`)}
      >
        {t('editInquiry')}
      </Button>
    </div>
  );

  const sortHeader = (key: SortKey, label: string, className = '') => {
    const active = sortKey === key;
    return (
      <th
        key={key}
        aria-sort={active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
        className={`px-3 py-3 text-left font-medium text-gray-600 dark:text-gray-400 ${className}`}
      >
        <button
          type="button"
          onClick={() => changeSort(key)}
          className="inline-flex items-center gap-1 whitespace-nowrap hover:text-gray-900 dark:hover:text-gray-100"
        >
          {label}
          {active
            ? sortDirection === 'asc'
              ? <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
              : <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            : <ArrowUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />}
        </button>
      </th>
    );
  };

  const statusTabs: { key: InquiryFilter; label: string }[] = [
    { key: 'all', label: t('all') },
    { key: 'new', label: t('newStatus') },
    { key: 'estimate_created', label: t('followUp') },
    { key: 'converted', label: t('converted') },
    { key: 'closed', label: t('lost') },
  ];

  return (
    <div>
      <PageHeader
        title={t('inquiries')}
        action={
          <Button onClick={() => navigate('/inquiries/new')}>
            <Plus className="h-4 w-4" />
            {t('newInquiry')}
          </Button>
        }
      />

      <div className="mb-4 space-y-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            aria-label={t('search')}
            placeholder={`${t('search')} ${t('customerName')} / ${t('mobile')}`}
            value={search}
            onChange={(event) => changeSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => changeFilter(tab.key)}
              aria-pressed={activeFilter === tab.key}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                activeFilter === tab.key
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              {tab.label}
              <span className={activeFilter === tab.key ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}>
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : filteredInquiries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-600 dark:text-gray-400">
          {inquiries.length === 0 ? t('noData') : t('noInquiriesFound')}
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 md:block">
            <table className="w-full min-w-[1050px] table-fixed text-sm">
              <colgroup>
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[12%]" />
                <col className="w-[23%]" />
                <col className="w-[11%]" />
                <col className="w-[24%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                  {sortHeader('customerName', t('customerName'))}
                  {sortHeader('mobile', t('mobile'), 'whitespace-nowrap')}
                  {sortHeader('eventDate', t('eventDate'), 'whitespace-nowrap')}
                  {sortHeader('eventAddress', t('eventAddress'))}
                  {sortHeader('status', t('status'))}
                  <th className="px-3 py-3 text-left font-medium text-gray-600 dark:text-gray-400">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pageInquiries.map((inquiry) => (
                  <tr
                    key={inquiry.id}
                    onClick={() => navigate(`/inquiries/${inquiry.id}`)}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/inquiries/${inquiry.id}`);
                      }
                    }}
                    tabIndex={0}
                    className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-3 py-3 text-gray-900 dark:text-gray-100">
                      <span className="flex items-center gap-3">
                        <CustomerAvatar name={inquiry.customerName} photoUrl={inquiry.customerId ? customerPhotos[inquiry.customerId] : undefined} size="sm" />
                        <span className="font-semibold">{inquiry.customerName || '—'}</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-gray-900 dark:text-gray-100">
                      {formatIndianPhoneNumber(inquiry.mobile)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-gray-900 dark:text-gray-100">
                      {formatDate(inquiry.eventDate) || '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-900 dark:text-gray-100">
                      <span className="block truncate" title={inquiry.eventAddress || undefined}>
                        {inquiry.eventAddress?.trim() || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={getInquiryStatusLabel(inquiry.status, t)} />
                    </td>
                    <td className="px-3 py-3">{renderRowActions(inquiry)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {pageInquiries.map((inquiry) => (
              <article
                key={inquiry.id}
                onClick={() => navigate(`/inquiries/${inquiry.id}`)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/inquiries/${inquiry.id}`);
                  }
                }}
                tabIndex={0}
                className="cursor-pointer rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-blue-50/40 p-4 shadow-sm shadow-slate-200/40 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-gray-700 dark:from-gray-800 dark:to-blue-950/10 dark:hover:border-blue-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <CustomerAvatar name={inquiry.customerName} photoUrl={inquiry.customerId ? customerPhotos[inquiry.customerId] : undefined} />
                    <h2 className="min-w-0 break-words font-semibold text-gray-900 dark:text-gray-100">{inquiry.customerName || '—'}</h2>
                  </div>
                  <StatusBadge status={getInquiryStatusLabel(inquiry.status, t)} />
                </div>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-gray-500 dark:text-gray-400">{t('mobile')}:</dt>
                    <dd className="text-gray-900 dark:text-gray-100">{formatIndianPhoneNumber(inquiry.mobile)}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-gray-500 dark:text-gray-400">{t('eventDate')}:</dt>
                    <dd className="text-gray-900 dark:text-gray-100">{formatDate(inquiry.eventDate) || '—'}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-gray-500 dark:text-gray-400">{t('eventAddress')}:</dt>
                    <dd className="line-clamp-2 text-gray-900 dark:text-gray-100">{inquiry.eventAddress?.trim() || '—'}</dd>
                  </div>
                </dl>
                <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-700">
                  {renderRowActions(inquiry)}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-300">
            <span>
              {t('page')} {currentPage} {t('of')} {pageCount}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                {t('previous')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={currentPage >= pageCount}
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              >
                {t('next')}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
