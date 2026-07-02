import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Copy, MessageCircle } from 'lucide-react';
import { LineItemsEditor, PageHeader, Modal } from '@/components/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getBooking, updateBooking, updateBookingStatus } from '@/services/bookingService';
import { recordPayment } from '@/services/paymentService';
import { getLaborers, getLaborAssignments, assignLabor, updateLaborAssignment } from '@/services/laborService';
import { buildJobSheetMessage, copyToClipboard, openWhatsApp } from '@/utils/whatsapp';
import { calculateTotals, formatDate, formatTime, formatCurrency, normalizeLineItem } from '@/utils/calculations';
import { BOOKING_STATUSES } from '@/lib/constants';
import { useTranslation, getLocale } from '@/lib/i18n';
import type { Booking, Laborer, LaborAssignment, PaymentMethod } from '@/types';

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [laborers, setLaborers] = useState<Laborer[]>([]);
  const [assignments, setAssignments] = useState<LaborAssignment[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showLabor, setShowLabor] = useState(false);
  const [showEditItems, setShowEditItems] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [selectedLabor, setSelectedLabor] = useState('');
  const [itemDraft, setItemDraft] = useState<Booking['lineItems']>([]);
  const [discountDraft, setDiscountDraft] = useState(0);
  const [savingItems, setSavingItems] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const load = async () => {
    if (!id) return;
    const b = await getBooking(id);
    setBooking(b);
    const [labs, assigns] = await Promise.all([
      getLaborers(),
      getLaborAssignments(id),
    ]);
    setLaborers(labs.filter((l) => l.isActive));
    setAssignments(assigns);
  };

  useEffect(() => { load(); }, [id]);

  const handleStatusChange = async (status: string) => {
    if (!id) return;
    await updateBookingStatus(id, status as Booking['status']);
    toast.success('Status updated');
    load();
  };

  const handlePayment = async () => {
    if (!id || !paymentAmount) return;
    await recordPayment(id, 'partial', paymentAmount, paymentMethod, new Date().toISOString().split('T')[0]);
    toast.success('Payment recorded');
    setShowPayment(false);
    load();
  };

  const handleAssignLabor = async () => {
    if (!id || !selectedLabor) return;
    const laborer = laborers.find((l) => l.id === selectedLabor);
    if (!laborer) return;
    await assignLabor(id, laborer);
    toast.success('Labor assigned');
    setShowLabor(false);
    load();
  };

  const handleCopyJobSheet = async () => {
    if (!booking) return;
    const msg = buildJobSheetMessage(booking, getLocale());
    const ok = await copyToClipboard(msg);
    toast.success(ok ? 'Copied!' : 'Copy failed');
  };

  const handleWhatsApp = () => {
    if (!booking) return;
    const msg = buildJobSheetMessage(booking, getLocale());
    openWhatsApp(msg, booking.mobile);
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

  if (!booking) return <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;

  return (
    <div>
      <PageHeader title={booking.bookingNumber} subtitle={booking.customerName} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex justify-between"><span>{t('status')}</span><StatusBadge status={booking.status} /></div>
          <div>{t('mobile')}: {booking.mobile}</div>
          <div>{t('eventDate')}: {formatDate(booking.eventDate)} {formatTime(booking.eventTime)}</div>
          <div>{t('eventAddress')}: {booking.eventAddress}</div>
          {booking.googleMapLink && <a href={booking.googleMapLink} target="_blank" rel="noreferrer" className="text-blue-600 text-sm">Open Map</a>}

          <div className="border-t pt-3 space-y-1">
            <div className="mb-2 flex justify-end">
              <Button size="sm" variant="outline" onClick={openEditItems}>
                Edit Items
              </Button>
            </div>
            {booking.lineItems.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{item.quantity}x {item.itemName}</span>
                <span>{formatCurrency(item.total)}</span>
              </div>
            ))}
          </div>

          <div className="border-t pt-2 space-y-1">
            <div className="flex justify-between font-bold"><span>{t('grandTotal')}</span><span>{formatCurrency(booking.grandTotal)}</span></div>
            <div className="flex justify-between text-green-600"><span>{t('advancePayment')}</span><span>{formatCurrency(booking.advancePayment)}</span></div>
            <div className="flex justify-between text-orange-600"><span>{t('remainingAmount')}</span><span>{formatCurrency(booking.remainingAmount)}</span></div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold mb-3">{t('bookingStatus')}</h3>
            <Select
              label={t('status')}
              value={booking.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              options={BOOKING_STATUSES.map((s) => ({ value: s, label: s }))}
            />
          </Card>

          <Card>
            <h3 className="font-semibold mb-3">{t('jobSheet')}</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleCopyJobSheet}>
                <Copy className="h-4 w-4" /> {t('copyMessage')}
              </Button>
              <Button variant="outline" onClick={handleWhatsApp}>
                <MessageCircle className="h-4 w-4" /> {t('openWhatsApp')}
              </Button>
            </div>
          </Card>

          <Card>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">{t('labor')}</h3>
              <Button size="sm" onClick={() => setShowLabor(true)}>{t('assignLabor')}</Button>
            </div>
            {assignments.length === 0 ? (
              <p className="text-sm text-gray-500">{t('noData')}</p>
            ) : (
              assignments.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0">
                  <span>{a.laborerName}</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={a.attendance}
                        onChange={async (e) => {
                          await updateLaborAssignment(a.id, { attendance: e.target.checked });
                          load();
                        }}
                      />
                      {t('attendance')}
                    </label>
                    <StatusBadge status={a.paidStatus} />
                  </div>
                </div>
              ))
            )}
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowPayment(true)}>{t('recordPayment')}</Button>
            <Button variant="outline" onClick={() => navigate(`/invoices/new/${booking.id}`)}>{t('invoices')}</Button>
          </div>
        </div>
      </div>

      <Modal open={showPayment} onClose={() => setShowPayment(false)} title={t('recordPayment')}>
        <div className="space-y-4">
          <Input label={t('amount')} type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value))} />
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
          <Button onClick={handlePayment} className="w-full">{t('save')}</Button>
        </div>
      </Modal>

      <Modal open={showLabor} onClose={() => setShowLabor(false)} title={t('assignLabor')}>
        <div className="space-y-4">
          <Select
            label={t('labor')}
            value={selectedLabor}
            onChange={(e) => setSelectedLabor(e.target.value)}
            options={[{ value: '', label: 'Select...' }, ...laborers.map((l) => ({ value: l.id, label: l.name }))]}
          />
          <Button onClick={handleAssignLabor} className="w-full">{t('assignLabor')}</Button>
        </div>
      </Modal>

      <Modal
        open={showEditItems}
        onClose={() => setShowEditItems(false)}
        title="Edit Booking Items"
        maxWidthClass="sm:max-w-4xl"
      >
        <div className="space-y-4">
          <LineItemsEditor
            items={itemDraft}
            onChange={setItemDraft}
            defaultEventDate={booking.eventDate}
          />
          <Input
            label={t('discount')}
            type="number"
            value={discountDraft}
            onChange={(e) => setDiscountDraft(Number(e.target.value) || 0)}
          />
          <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-700">
            {(() => {
              const totals = calculateTotals(itemDraft, discountDraft);
              const remaining = Math.max(0, totals.grandTotal - booking.advancePayment);
              return (
                <>
                  <div className="flex justify-between">
                    <span>{t('subtotal')}</span>
                    <span>{formatCurrency(totals.subTotal)}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span>{t('grandTotal')}</span>
                    <span>{formatCurrency(totals.grandTotal)}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span>{t('remainingAmount')}</span>
                    <span>{formatCurrency(remaining)}</span>
                  </div>
                </>
              );
            })()}
          </div>
          <div className="flex gap-2">
            <Button className="w-full" variant="secondary" onClick={() => setShowEditItems(false)}>
              {t('cancel')}
            </Button>
            <Button className="w-full" onClick={handleSaveItems} loading={savingItems}>
              {t('save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
