import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ClipboardList,
  Copy,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  Printer,
  Trash2,
} from 'lucide-react';
import { LineItemsEditor, Modal } from '@/components/shared';
import { AddressMapPicker } from '@/components/shared/AddressMapPicker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { deleteBooking, getBooking, updateBooking, updateBookingStatus } from '@/services/bookingService';
import { recordPayment } from '@/services/paymentService';
import {
  getLaborers,
  getLaborAssignments,
  assignLabor,
  deleteLaborAssignment,
} from '@/services/laborService';
import { getAttendanceRecord, getLeavesForDate, saveAttendance } from '@/services/laborPayrollService';
import { updateCustomer } from '@/services/customerService';
import { getEstimate } from '@/services/estimateService';
import { getAppSettings } from '@/services/settingsService';
import {
  buildEstimateMessage,
  buildJobSheetMessage,
  buildPaymentReceivedMessage,
  copyToClipboard,
  openWhatsApp,
} from '@/utils/whatsapp';
import {
  calculateTotals,
  formatDate,
  formatTime,
  formatCurrency,
  normalizeLineItem,
  parseDateValue,
} from '@/utils/calculations';
import { BOOKING_STATUSES } from '@/lib/constants';
import { useTranslation, getLocale } from '@/lib/i18n';
import { useAsyncActionGuard } from '@/hooks/useAsyncActionGuard';
import { formatIndianPhoneNumber, normalizeIndianPhoneNumber } from '@/utils/phone';
import { getCurrentTimeInputValue, isValidEventDate } from '@/utils/eventDate';
import type { Booking, Laborer, LaborAssignment, LaborLeave, PaymentMethod } from '@/types';

type BookingEditDraft = Pick<
  Booking,
  'customerName' | 'mobile' | 'eventType' | 'eventDate' | 'eventTime' | 'eventAddress' | 'googleMapLink'
>;
type AttendanceStatus = NonNullable<LaborAssignment['attendanceStatus']>;

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [laborers, setLaborers] = useState<Laborer[]>([]);
  const [assignments, setAssignments] = useState<LaborAssignment[]>([]);
  const [attendanceByLaborId, setAttendanceByLaborId] = useState<Record<string, Awaited<ReturnType<typeof getAttendanceRecord>>>>({});
  const [eventLeaves, setEventLeaves] = useState<LaborLeave[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showLabor, setShowLabor] = useState(false);
  const [showEditItems, setShowEditItems] = useState(false);
  const [showEditBooking, setShowEditBooking] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [selectedLabor, setSelectedLabor] = useState('');
  const [itemDraft, setItemDraft] = useState<Booking['lineItems']>([]);
  const [discountDraft, setDiscountDraft] = useState(0);
  const [bookingDraft, setBookingDraft] = useState<BookingEditDraft>({
    customerName: '',
    mobile: '',
    eventType: '',
    eventDate: '',
    eventTime: '',
    eventAddress: '',
    googleMapLink: '',
  });
  const [savingItems, setSavingItems] = useState(false);
  const [savingBooking, setSavingBooking] = useState(false);
  const [removeLaborTarget, setRemoveLaborTarget] = useState<LaborAssignment | null>(null);
  const [removingLabor, setRemovingLabor] = useState(false);
  const [confirmDeleteBooking, setConfirmDeleteBooking] = useState(false);
  const [deletingBooking, setDeletingBooking] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { runGuarded, isRunning } = useAsyncActionGuard();

  const load = async () => {
    if (!id) return;
    const currentBooking = await getBooking(id);
    setBooking(currentBooking);
    const [availableLaborers, currentAssignments, leaves] = await Promise.all([
      getLaborers(),
      getLaborAssignments(id),
      currentBooking ? getLeavesForDate(currentBooking.eventDate) : Promise.resolve([]),
    ]);
    setLaborers(availableLaborers);
    setAssignments(currentAssignments);
    setEventLeaves(leaves);
    const attendanceEntries = await Promise.all(
      currentAssignments.map((assignment) =>
        getAttendanceRecord(assignment.laborerId, currentBooking?.eventDate ?? '')
      )
    );
    setAttendanceByLaborId(Object.fromEntries(
      currentAssignments.map((assignment, index) => [assignment.laborerId, attendanceEntries[index]])
    ));
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([getBooking(id), getLaborers(), getLaborAssignments(id)])
      .then(([currentBooking, availableLaborers, currentAssignments]) => {
        if (cancelled) return;
        setBooking(currentBooking);
        setLaborers(availableLaborers);
        setAssignments(currentAssignments);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load booking details');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleStatusChange = async (status: string) => {
    if (!id) return;
    await runGuarded(async () => {
      try {
        await updateBookingStatus(id, status as Booking['status']);
        toast.success('Status updated');
        await load();
      } catch {
        toast.error('Failed to update status');
      }
    }, 'status');
  };

  const handlePayment = async () => {
    if (!id || paymentAmount <= 0) {
      toast.error('Enter a payment amount greater than zero');
      return;
    }
    if (paymentAmount > remaining) {
      toast.error(`Payment cannot exceed the remaining balance of ${formatCurrency(remaining)}`);
      return;
    }
    await runGuarded(async () => {
      try {
        await recordPayment(id, 'partial', paymentAmount, paymentMethod, new Date().toISOString().split('T')[0]);
        toast.success('Payment recorded');
        setShowPayment(false);
        setPaymentAmount(0);
        await load();
      } catch {
        toast.error('Failed to record payment');
      }
    }, 'recordPayment');
  };

  const handleAssignLabor = async () => {
    if (!id || !selectedLabor) return;
    const laborer = laborers.find((candidate) => candidate.id === selectedLabor);
    if (!laborer) return;
    await runGuarded(async () => {
      try {
        await assignLabor(id, laborer);
        toast.success(t('setupBoyAssigned'));
        setShowLabor(false);
        setSelectedLabor('');
        await load();
      } catch {
        toast.error(t('assignSetupBoyFailed'));
      }
    }, 'assignLabor');
  };

  const handleAttendanceChange = async (assignment: LaborAssignment, status: AttendanceStatus) => {
    await runGuarded(async () => {
      try {
        if (!booking) return;
        const laborer = laborers.find((member) => member.id === assignment.laborerId);
        await saveAttendance(
          { id: assignment.laborerId, dailyWage: laborer?.dailyWage ?? assignment.paymentAmount },
          booking.eventDate,
          status,
          booking.id
        );
        await load();
      } catch {
        toast.error('Failed to update attendance');
      }
    }, `attendance-${assignment.id}`);
  };

  const handleRemoveLabor = async () => {
    if (!removeLaborTarget) return;
    setRemovingLabor(true);
    try {
      await deleteLaborAssignment(removeLaborTarget.id);
      toast.success(t('setupBoyRemoved'));
      setRemoveLaborTarget(null);
      await load();
    } catch {
      toast.error(t('removeSetupBoyFailed'));
    } finally {
      setRemovingLabor(false);
    }
  };

  const handleDeleteBooking = async () => {
    if (!id) return;
    setDeletingBooking(true);
    try {
      await deleteBooking(id);
      toast.success(t('bookingDeleted'));
      navigate('/bookings', { replace: true });
    } catch (error) {
      console.error('Failed to delete booking', error);
      toast.error(
        error instanceof Error && error.message === 'Cannot delete a booking with linked payments or invoices.'
          ? t('bookingDeleteBlocked')
          : t('deleteBookingFailed')
      );
    } finally {
      setDeletingBooking(false);
    }
  };

  const handleCopyJobSheet = async () => {
    if (!booking) return;
    const copied = await copyToClipboard(buildJobSheetMessage(booking, getLocale()));
    toast.success(copied ? 'Copied!' : 'Copy failed');
  };

  const handleWhatsApp = () => {
    if (!booking) return;
    openWhatsApp(buildJobSheetMessage(booking, getLocale()), booking.mobile);
  };

  const handleSendEstimate = async () => {
    if (!booking) return;
    await runGuarded(async () => {
      try {
        const [estimate, settings] = await Promise.all([
          getEstimate(booking.estimateId),
          getAppSettings(),
        ]);
        if (!estimate) throw new Error('Estimate not found');
        openWhatsApp(
          buildEstimateMessage(estimate, { name: booking.customerName }, settings),
          booking.mobile
        );
      } catch {
        toast.error('Failed to load estimate for WhatsApp');
      }
    }, 'sendEstimate');
  };

  const openEditBooking = () => {
    if (!booking) return;
    setBookingDraft({
      customerName: booking.customerName ?? '',
      mobile: booking.mobile ?? '',
      eventType: booking.eventType ?? '',
      eventDate: booking.eventDate ?? '',
      eventTime: booking.eventTime ?? '',
      eventAddress: booking.eventAddress ?? '',
      googleMapLink: booking.googleMapLink ?? '',
    });
    setShowEditBooking(true);
  };

  const handleSaveBooking = async () => {
    if (!booking || !id) return;
    setSavingBooking(true);
    try {
      const cleanDraft = {
        customerName: bookingDraft.customerName.trim(),
        mobile: bookingDraft.mobile.trim(),
        eventType: bookingDraft.eventType?.trim() ?? '',
        eventDate: bookingDraft.eventDate,
        eventTime: bookingDraft.eventTime,
        eventAddress: bookingDraft.eventAddress.trim(),
        googleMapLink: bookingDraft.googleMapLink?.trim() ?? '',
      };
      if (cleanDraft.mobile && !normalizeIndianPhoneNumber(cleanDraft.mobile)) {
        toast.error(t('invalidMobile'));
        return;
      }
      if (!isValidEventDate(cleanDraft.eventDate)) {
        toast.error(t('invalidEventDate'));
        return;
      }
      await updateBooking(id, cleanDraft);
      if (booking.customerId) {
        await updateCustomer(booking.customerId, {
          name: cleanDraft.customerName,
          mobile: cleanDraft.mobile,
        });
      }
      toast.success('Booking updated');
      setShowEditBooking(false);
      await load();
    } catch {
      toast.error('Failed to update booking');
    } finally {
      setSavingBooking(false);
    }
  };

  const openEditItems = () => {
    if (!booking) return;
    setItemDraft(booking.lineItems.map(normalizeLineItem));
    setDiscountDraft(booking.discount);
    setShowEditItems(true);
  };

  const handleSaveItems = async () => {
    if (!booking || !id) return;
    setSavingItems(true);
    try {
      const cleanItems = itemDraft.map(normalizeLineItem).filter((item) => item.itemName.trim());
      const totals = calculateTotals(cleanItems, discountDraft);
      const remainingAmount = Math.max(0, totals.grandTotal - booking.advancePayment);
      const paymentStatus = remainingAmount <= 0 ? 'completed' : booking.advancePayment > 0 ? 'partial' : 'pending';

      await updateBooking(id, {
        lineItems: cleanItems,
        discount: discountDraft,
        subTotal: totals.subTotal,
        grandTotal: totals.grandTotal,
        remainingAmount,
        paymentStatus,
      });

      toast.success('Booking items updated');
      setShowEditItems(false);
      await load();
    } catch {
      toast.error('Failed to update booking items');
    } finally {
      setSavingItems(false);
    }
  };

  if (!booking) {
    return <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;
  }

  const statusSaving = isRunning('status');
  const paymentSaving = isRunning('recordPayment');
  const assigningLabor = isRunning('assignLabor');
  const phoneDigits = normalizeIndianPhoneNumber(booking.mobile);
  const advance = Number(booking.advancePayment) || 0;
  const grandTotal = Number(booking.grandTotal) || 0;
  const remaining = Math.max(0, Number(booking.remainingAmount ?? grandTotal - advance) || 0);
  const paidPercent = grandTotal > 0 ? Math.min(100, Math.max(0, ((grandTotal - remaining) / grandTotal) * 100)) : 0;
  const paymentBadge = remaining <= 0 ? 'paid' : advance > 0 ? 'partial' : 'unpaid';
  const eventDate = parseDateValue(booking.eventDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventIsPast = !!eventDate && eventDate < today;
  const mapUrl = booking.googleMapLink?.trim()
    || (booking.eventAddress?.trim()
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.eventAddress.trim())}`
      : '');
  const jobSheetMessage = buildJobSheetMessage(booking, getLocale());

  return (
    <div className="booking-detail-page space-y-5">
      <div className="print:hidden">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Button variant="ghost" size="sm" onClick={() => navigate('/bookings')} aria-label={t('backToBooking')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Link to="/bookings" className="hover:text-blue-600">{t('bookings')}</Link>
            <span>/</span>
            <span className="truncate text-gray-700 dark:text-gray-200">{booking.bookingNumber}</span>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="outline" onClick={openEditBooking}>{t('edit')}</Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> {t('print')}
            </Button>
            <Button size="sm" variant="outline" disabled={!phoneDigits} onClick={() => phoneDigits && window.open(`tel:+91${phoneDigits}`)}>
              <Phone className="h-4 w-4" /> {t('call')}
            </Button>
            <Button size="sm" variant="outline" disabled={!phoneDigits} onClick={handleWhatsApp}>
              <MessageCircle className="h-4 w-4" /> {t('openWhatsApp')}
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => setConfirmDeleteBooking(true)}
            >
              <Trash2 className="h-4 w-4" /> {t('delete')}
            </Button>
          </div>
        </div>
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{booking.bookingNumber || '—'}</h1>
          <StatusBadge status={booking.status} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
          <span>{booking.customerName || '—'}</span>
          <span aria-hidden="true">·</span>
          <span>{formatDate(booking.eventDate) || '—'}{formatTime(booking.eventTime) ? `, ${formatTime(booking.eventTime)}` : ''}</span>
          <span aria-hidden="true">·</span>
          <span>{booking.eventType?.trim() || '—'}</span>
        </div>
      </div>

      {eventIsPast && booking.status === 'Approved' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <span>{t('markAsCompleted')}?</span>
          <Button
            size="sm"
            variant="outline"
            loading={statusSaving}
            onClick={() => void handleStatusChange('Event Completed')}
          >
            {t('markAsCompleted')}
          </Button>
        </div>
      )}

      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Card className="flex-1 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('customerName')}</h2>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <DetailField label={t('customerName')} value={booking.customerName || '—'} />
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('mobile')}</p>
                <div className="mt-1 flex items-center gap-2 text-base font-medium text-gray-900 dark:text-gray-100">
                  {phoneDigits ? (
                    <>
                      <a className="hover:text-blue-600" href={`tel:+91${phoneDigits}`}>
                        {formatIndianPhoneNumber(booking.mobile)}
                      </a>
                      <a
                        className="rounded-md p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"
                        href={`https://wa.me/91${phoneDigits}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${t('openWhatsApp')} ${booking.customerName}`}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </>
                  ) : '—'}
                </div>
              </div>
              <DetailField label={t('eventType')} value={booking.eventType?.trim() || '—'} />
              <DetailField label={t('eventDate')} value={formatDate(booking.eventDate) || '—'} />
              <DetailField label={t('eventTime')} value={formatTime(booking.eventTime) || '—'} />
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('eventAddress')}</p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-base font-medium text-gray-900 dark:text-gray-100">{booking.eventAddress?.trim() || '—'}</p>
                  {mapUrl && (
                    <a
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin className="h-4 w-4" /> {t('openInMaps')} <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="flex-1">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('material')}</h2>
              <Button size="sm" variant="outline" onClick={openEditItems}>{t('edit')} {t('material')}</Button>
            </div>
            <div className="space-y-3 md:hidden">
              {booking.lineItems.map((item, index) => (
                <div
                  key={`${item.itemName}-${index}`}
                  className="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700"
                >
                  <p className="mb-2 break-words font-medium text-gray-900 dark:text-gray-100">{item.itemName || '—'}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <DetailField label={t('quantity')} value={String(item.quantity ?? '—')} />
                    <DetailField label={t('rate')} value={formatCurrency(item.rate ?? 0)} />
                    <DetailField label={t('days')} value={(item.rentalDays ?? 1) > 1 ? String(item.rentalDays) : '—'} />
                    <DetailField label={t('amount')} value={formatCurrency(item.total ?? 0)} />
                  </div>
                </div>
              ))}
              {booking.lineItems.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-500">{t('noData')}</p>
              )}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <tr>
                    <th className="pb-2 pr-3">{t('item')}</th>
                    <th className="pb-2 pr-3 text-right">{t('quantity')}</th>
                    <th className="pb-2 pr-3 text-right">{t('rate')}</th>
                    <th className="pb-2 pr-3 text-right">{t('days')}</th>
                    <th className="pb-2 text-right">{t('amount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {booking.lineItems.map((item, index) => (
                    <tr key={`${item.itemName}-${index}`}>
                      <td className="py-2.5 pr-3 font-medium text-gray-900 dark:text-gray-100">{item.itemName || '—'}</td>
                      <td className="py-2.5 pr-3 text-right">{item.quantity ?? '—'}</td>
                      <td className="py-2.5 pr-3 text-right">{formatCurrency(item.rate ?? 0)}</td>
                      <td className="py-2.5 pr-3 text-right">{(item.rentalDays ?? 1) > 1 ? item.rentalDays : '—'}</td>
                      <td className="py-2.5 text-right font-medium">{formatCurrency(item.total ?? 0)}</td>
                    </tr>
                  ))}
                  {booking.lineItems.length === 0 && (
                    <tr><td className="py-4 text-center text-gray-500" colSpan={5}>{t('noData')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 space-y-2 border-t border-gray-200 pt-3 text-sm dark:border-gray-700">
              <SummaryLine label={t('subtotal')} value={formatCurrency(booking.subTotal)} />
              {booking.discount > 0 && <SummaryLine label={t('discount')} value={`−${formatCurrency(booking.discount)}`} />}
              <SummaryLine label={t('grandTotal')} value={formatCurrency(grandTotal)} strong />
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('paymentStatus')}</h2>
              <PaymentBadge label={t(paymentBadge)} status={paymentBadge} />
            </div>
            <div className="space-y-2">
              <SummaryLine label={t('grandTotal')} value={formatCurrency(grandTotal)} strong />
              <SummaryLine
                label={t('advancePayment')}
                value={formatCurrency(advance)}
                muted={advance === 0}
              />
              <SummaryLine label={t('remainingAmount')} value={formatCurrency(remaining)} strong />
              <div
                className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"
                role="progressbar"
                aria-label={t('paymentStatus')}
                aria-valuenow={Math.round(paidPercent)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${paidPercent}%` }} />
              </div>
            </div>
            {remaining > 0 && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                {t('paymentPendingNotice')}: {formatCurrency(remaining)}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setShowPayment(true)}>{t('recordPayment')}</Button>
              {advance > 0 && (
                <Button
                  variant="outline"
                  onClick={() => openWhatsApp(buildPaymentReceivedMessage(booking), booking.mobile)}
                >
                  <MessageCircle className="h-4 w-4" /> Send Payment Update
                </Button>
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="flex-1">
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">{t('bookingStatus')}</h2>
            <Select
              label={t('status')}
              value={booking.status}
              onChange={(e) => void handleStatusChange(e.target.value)}
              disabled={statusSaving}
              options={BOOKING_STATUSES.map((status) => ({ value: status, label: status }))}
            />
          </Card>

          <Card className="flex-1">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('jobSheet')}</h2>
              <Button size="sm" variant="outline" onClick={() => navigate(`/bookings/${booking.id}/job-sheet`)}>
                <ClipboardList className="h-4 w-4" /> {t('viewJobSheet')}
              </Button>
            </div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 font-sans text-sm leading-6 text-gray-700 dark:bg-gray-900 dark:text-gray-200">
              {jobSheetMessage}
            </pre>
            <div className="mt-3 flex flex-wrap gap-2 print:hidden">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> {t('printSavePdf')}
              </Button>
              <Button variant="outline" onClick={() => void handleCopyJobSheet()}>
                <Copy className="h-4 w-4" /> {t('copyMessage')}
              </Button>
              <Button variant="outline" disabled={!phoneDigits} onClick={handleWhatsApp}>
                <MessageCircle className="h-4 w-4" /> {t('openWhatsApp')}
              </Button>
            </div>
          </Card>

          <Card className="flex-1">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('labor')}</h2>
              <Button size="sm" onClick={() => setShowLabor(true)}>{t('assignLabor')}</Button>
            </div>
            {assignments.length === 0 ? (
              <p className="text-sm text-gray-500">{t('noSetupBoysAssigned')}</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {assignments.map((assignment) => {
                  const laborer = laborers.find((member) => member.id === assignment.laborerId);
                  const recordStatus = attendanceByLaborId[assignment.laborerId]?.status;
                  const attendanceStatus = recordStatus === 'half'
                    ? 'present'
                    : recordStatus ?? assignment.attendanceStatus ?? (assignment.attendance ? 'present' : 'pending');
                  const laborPhone = normalizeIndianPhoneNumber(laborer?.mobile);
                  const sendingKey = `attendance-${assignment.id}`;
                  return (
                    <div key={assignment.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{assignment.laborerName || '—'}</p>
                        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                          {laborPhone ? formatIndianPhoneNumber(laborer?.mobile) : '—'}
                          <span className="mx-1.5">·</span>
                          {laborer?.role?.trim() || '—'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          aria-label={`${t('attendance')} - ${assignment.laborerName}`}
                          value={attendanceStatus}
                          onChange={(e) => void handleAttendanceChange(assignment, e.target.value as AttendanceStatus)}
                          disabled={isRunning(sendingKey)}
                          options={[
                            { value: 'pending', label: t('pending') },
                            { value: 'present', label: t('present') },
                            { value: 'absent', label: t('absent') },
                          ]}
                        />
                        {laborPhone && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openWhatsApp(jobSheetMessage, laborer?.mobile)}
                            aria-label={`${t('openWhatsApp')} ${assignment.laborerName}`}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 dark:text-red-400"
                          onClick={() => setRemoveLaborTarget(assignment)}
                          aria-label={`${t('delete')} ${assignment.laborerName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card className="print:hidden">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">{t('actions')}</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowPayment(true)}>{t('recordPayment')}</Button>
          <Button
            variant="secondary"
            onClick={() => navigate(`/payments?bookingId=${encodeURIComponent(booking.id)}`)}
          >
            {t('viewBookingPayments')}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/invoices?bookingId=${encodeURIComponent(booking.id)}`)}
          >
            {t('invoices')}
          </Button>
          <Button variant="outline" disabled={isRunning('sendEstimate')} onClick={() => void handleSendEstimate()}>
            <MessageCircle className="h-4 w-4" /> {t('sendEstimateWhatsApp')}
          </Button>
          <Button variant="outline" onClick={() => navigate(`/invoices/new/${booking.id}`)}>
            {t('generateInvoice')}
          </Button>
        </div>
      </Card>

      <Modal open={showPayment} onClose={() => setShowPayment(false)} title={t('recordPayment')}>
        <div className="space-y-4">
          <Input
            label={t('amount')}
            type="number"
            min={1}
            max={remaining || undefined}
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(Number(e.target.value))}
          />
          <Select
            label={t('paymentMethod')}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            options={[
              { value: 'cash', label: t('cash') },
              { value: 'upi', label: t('upi') },
              { value: 'bank', label: t('bank') },
              { value: 'other', label: t('other') },
            ]}
          />
          <Button onClick={() => void handlePayment()} className="w-full" loading={paymentSaving}>{t('save')}</Button>
        </div>
      </Modal>

      <Modal open={showLabor} onClose={() => setShowLabor(false)} title={t('assignLabor')}>
        <div className="space-y-4">
          <Select
            label={t('labor')}
            value={selectedLabor}
            onChange={(e) => setSelectedLabor(e.target.value)}
            options={[
              { value: '', label: 'Select...' },
              ...laborers.filter((laborer) => laborer.isActive).map((laborer) => ({ value: laborer.id, label: laborer.name })),
            ]}
          />
          {selectedLabor && eventLeaves.some((leave) =>
            leave.laborId === selectedLabor
            && booking.eventDate >= leave.fromDate
            && booking.eventDate <= leave.toDate
          ) && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              {t('setupBoyUnavailableOnDate')}
            </p>
          )}
          <Button onClick={() => void handleAssignLabor()} className="w-full" loading={assigningLabor}>{t('assignLabor')}</Button>
        </div>
      </Modal>

      <Modal open={showEditBooking} onClose={() => setShowEditBooking(false)} title={`${t('edit')} ${t('bookings')}`}>
        <div className="space-y-4">
          <Input
            label={t('customerName')}
            value={bookingDraft.customerName}
            onChange={(e) => setBookingDraft({ ...bookingDraft, customerName: e.target.value })}
            required
          />
          <Input
            label={t('mobile')}
            type="tel"
            value={bookingDraft.mobile}
            onChange={(e) => setBookingDraft({ ...bookingDraft, mobile: e.target.value })}
          />
          <Input
            label={t('eventType')}
            value={bookingDraft.eventType}
            onChange={(e) => setBookingDraft({ ...bookingDraft, eventType: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label={t('eventDate')}
              type="date"
              min="2000-01-01"
              max="2100-12-31"
              value={bookingDraft.eventDate}
              onChange={(e) => setBookingDraft({ ...bookingDraft, eventDate: e.target.value })}
            />
            <div className="flex items-end gap-2">
              <Input
                label={t('eventTime')}
                type="time"
                value={bookingDraft.eventTime}
                onChange={(e) => setBookingDraft({ ...bookingDraft, eventTime: e.target.value })}
                className="min-w-0 flex-1"
              />
              <Button type="button" size="sm" variant="outline" onClick={() => setBookingDraft({ ...bookingDraft, eventTime: getCurrentTimeInputValue() })}>
                {t('currentTime')}
              </Button>
            </div>
          </div>
          <AddressMapPicker
            address={bookingDraft.eventAddress}
            mapLink={bookingDraft.googleMapLink ?? ''}
            onAddressChange={(eventAddress) => setBookingDraft({ ...bookingDraft, eventAddress })}
            onMapLinkChange={(googleMapLink) => setBookingDraft({ ...bookingDraft, googleMapLink })}
          />
          <div className="flex gap-2">
            <Button className="w-full" variant="secondary" onClick={() => setShowEditBooking(false)}>{t('cancel')}</Button>
            <Button className="w-full" onClick={() => void handleSaveBooking()} loading={savingBooking}>{t('save')}</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showEditItems}
        onClose={() => setShowEditItems(false)}
        title={`${t('edit')} ${t('material')}`}
        maxWidthClass="sm:max-w-4xl"
      >
        <div className="space-y-4">
          <LineItemsEditor items={itemDraft} onChange={setItemDraft} defaultEventDate={booking.eventDate} />
          <Input
            label={t('discount')}
            type="number"
            min={0}
            value={discountDraft}
            onChange={(e) => setDiscountDraft(Number(e.target.value) || 0)}
          />
          <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-700">
            {(() => {
              const totals = calculateTotals(itemDraft, discountDraft);
              const remainingDraft = Math.max(0, totals.grandTotal - booking.advancePayment);
              return (
                <>
                  <SummaryLine label={t('subtotal')} value={formatCurrency(totals.subTotal)} />
                  <SummaryLine label={t('grandTotal')} value={formatCurrency(totals.grandTotal)} />
                  <SummaryLine label={t('remainingAmount')} value={formatCurrency(remainingDraft)} />
                </>
              );
            })()}
          </div>
          <div className="flex gap-2">
            <Button className="w-full" variant="secondary" onClick={() => setShowEditItems(false)}>{t('cancel')}</Button>
            <Button className="w-full" onClick={() => void handleSaveItems()} loading={savingItems}>{t('save')}</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!removeLaborTarget}
        onClose={() => setRemoveLaborTarget(null)}
        title={t('delete')}
      >
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">{t('confirmRemoveLabor')}</p>
        <div className="flex gap-2">
          <Button className="w-full" variant="secondary" onClick={() => setRemoveLaborTarget(null)}>{t('cancel')}</Button>
          <Button className="w-full" variant="danger" loading={removingLabor} onClick={() => void handleRemoveLabor()}>{t('delete')}</Button>
        </div>
      </Modal>

      <Modal
        open={confirmDeleteBooking}
        onClose={() => {
          if (!deletingBooking) setConfirmDeleteBooking(false);
        }}
        title={t('deleteBooking')}
      >
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          {t('confirmDeleteBooking').replace('{bookingNumber}', booking.bookingNumber)}
        </p>
        <div className="flex gap-2">
          <Button
            className="w-full"
            variant="secondary"
            disabled={deletingBooking}
            onClick={() => setConfirmDeleteBooking(false)}
          >
            {t('cancel')}
          </Button>
          <Button
            className="w-full"
            variant="danger"
            loading={deletingBooking}
            onClick={() => void handleDeleteBooking()}
          >
            {t('delete')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 break-words text-base font-medium text-gray-900 dark:text-gray-100">{value || '—'}</p>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  strong = false,
  muted = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? 'font-semibold text-gray-900 dark:text-gray-100' : ''} ${muted ? 'text-gray-500 dark:text-gray-400' : ''}`}>
      <span>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function PaymentBadge({ label, status }: { label: string; status: 'paid' | 'partial' | 'unpaid' }) {
  const style = status === 'paid'
    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
    : status === 'partial'
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>{label}</span>;
}
