import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Pencil, Trash2 } from 'lucide-react';
import { ConfirmDialog, LineItemsEditor, LoadingSkeleton, Modal, PageHeader } from '@/components/shared';
import { CustomerAvatar } from '@/components/shared/CustomerAvatar';
import { AddressMapPicker } from '@/components/shared/AddressMapPicker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input, Textarea } from '@/components/ui/Input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { deleteInquiry, getInquiry, updateInquiry } from '@/services/inquiryService';
import { getCustomer } from '@/services/customerService';
import { getEstimateByInquiryId, getEstimates, updateEstimate } from '@/services/estimateService';
import { getBookingByInquiryId } from '@/services/bookingService';
import { calculateTotals, formatDate, formatTime, formatCurrency, normalizeLineItem } from '@/utils/calculations';
import { useTranslation } from '@/lib/i18n';
import type { Inquiry, Estimate } from '@/types';
import { getCurrentTimeInputValue, isValidEventDate } from '@/utils/eventDate';

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

export function InquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [customerPhotoUrl, setCustomerPhotoUrl] = useState('');
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [isEditing, setIsEditing] = useState(
    () => new URLSearchParams(window.location.search).get('edit') === 'true'
  );
  const [saving, setSaving] = useState(false);
  const [showEditItems, setShowEditItems] = useState(false);
  const [itemDraft, setItemDraft] = useState<Estimate['lineItems']>([]);
  const [discountDraft, setDiscountDraft] = useState(0);
  const [savingItems, setSavingItems] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    mobile: '',
    eventType: '',
    eventDate: '',
    eventTime: '',
    eventAddress: '',
    googleMapLink: '',
    notes: '',
  });
  const navigate = useNavigate();
  const { t } = useTranslation();

  const loadData = async () => {
    if (!id) return;
    const inq = await getInquiry(id);
    setInquiry(inq);
    if (inq?.customerId) {
      getCustomer(inq.customerId)
        .then((customer) => setCustomerPhotoUrl(customer?.photoUrl ?? ''))
        .catch((error: unknown) => console.error('Failed to load customer photo', error));
    }
    if (inq) {
      setForm({
        customerName: inq.customerName,
        mobile: inq.mobile,
        eventType: inq.eventType ?? '',
        eventDate: inq.eventDate,
        eventTime: inq.eventTime,
        eventAddress: inq.eventAddress,
        googleMapLink: inq.googleMapLink ?? '',
        notes: inq.notes ?? '',
      });
    }
    const all = await getEstimates();
    const est = all.find((e) => e.inquiryId === id);
    setEstimate(est ?? null);
  };

  useEffect(() => {
    if (!id) return;
    let active = true;
    void (async () => {
      const [inq, all] = await Promise.all([getInquiry(id), getEstimates()]);
      if (!active) return;
      setInquiry(inq);
      setCustomerPhotoUrl('');
      if (inq?.customerId) {
        getCustomer(inq.customerId)
          .then((customer) => {
            if (active) setCustomerPhotoUrl(customer?.photoUrl ?? '');
          })
          .catch((error: unknown) => console.error('Failed to load customer photo', error));
      }
      if (inq) {
        setForm({
          customerName: inq.customerName,
          mobile: inq.mobile,
          eventType: inq.eventType ?? '',
          eventDate: inq.eventDate,
          eventTime: inq.eventTime,
          eventAddress: inq.eventAddress,
          googleMapLink: inq.googleMapLink ?? '',
          notes: inq.notes ?? '',
        });
      }
      setEstimate(all.find((estimateItem) => estimateItem.inquiryId === id) ?? null);
    })().catch(() => toast.error('Failed to load inquiry'));
    return () => {
      active = false;
    };
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    if (!isValidEventDate(form.eventDate)) {
      toast.error(t('invalidEventDate'));
      return;
    }
    setSaving(true);
    try {
      const updatedInquiry = {
        customerName: form.customerName.trim(),
        mobile: form.mobile.trim(),
        eventType: form.eventType.trim(),
        eventDate: form.eventDate,
        eventTime: form.eventTime,
        eventAddress: form.eventAddress.trim(),
        googleMapLink: form.googleMapLink.trim(),
        notes: form.notes.trim(),
      };
      await updateInquiry(id, updatedInquiry);
      if (estimate) await updateEstimate(estimate.id, updatedInquiry);
      toast.success('Inquiry updated');
      setIsEditing(false);
      await loadData();
    } catch {
      toast.error('Failed to update inquiry');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!inquiry) return;
    setForm({
      customerName: inquiry.customerName,
      mobile: inquiry.mobile,
      eventType: inquiry.eventType ?? '',
      eventDate: inquiry.eventDate,
      eventTime: inquiry.eventTime,
      eventAddress: inquiry.eventAddress,
      googleMapLink: inquiry.googleMapLink ?? '',
      notes: inquiry.notes ?? '',
    });
    setIsEditing(false);
  };

  const openItemEditor = () => {
    if (!estimate) return;
    setItemDraft(estimate.lineItems.map(normalizeLineItem));
    setDiscountDraft(estimate.discount);
    setShowEditItems(true);
  };

  const handleSaveItems = async () => {
    if (!estimate) return;
    setSavingItems(true);
    try {
      await updateEstimate(estimate.id, {
        lineItems: itemDraft.map(normalizeLineItem).filter((item) => item.itemName.trim()),
        discount: discountDraft,
      });
      toast.success('Estimate items updated');
      setShowEditItems(false);
      await loadData();
    } catch {
      toast.error('Failed to update items');
    } finally {
      setSavingItems(false);
    }
  };

  const handleDeleteInquiry = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      const [linkedEstimate, linkedBooking] = await Promise.all([
        getEstimateByInquiryId(id),
        getBookingByInquiryId(id),
      ]);
      if (linkedEstimate || linkedBooking) {
        const reasons: string[] = [];
        if (linkedEstimate) reasons.push(`estimate ${linkedEstimate.estimateNumber}`);
        if (linkedBooking) reasons.push(`booking ${linkedBooking.bookingNumber}`);
        toast.error(`Cannot delete inquiry because linked ${reasons.join(' and ')} exists.`);
        setConfirmDeleteOpen(false);
        return;
      }
      await deleteInquiry(id);
      toast.success('Inquiry deleted');
      navigate('/inquiries');
    } catch {
      toast.error('Failed to delete inquiry');
    } finally {
      setDeleting(false);
    }
  };

  if (!inquiry) return <LoadingSkeleton rows={5} />;

  return (
    <div>
      <PageHeader
        title={(
          <span className="inline-flex items-center gap-3">
            <CustomerAvatar name={inquiry.customerName} photoUrl={customerPhotoUrl} />
            <span>{inquiry.customerName}</span>
          </span>
        )}
        subtitle={`Inquiry · ${formatDate(inquiry.eventDate)}`}
        backTo="/inquiries"
        backLabel={t('back')}
        action={
          isEditing ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleCancel}>
                {t('cancel')}
              </Button>
              <Button onClick={handleSave} loading={saving}>
                {t('save')}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="danger"
                mobileIcon={<Trash2 className="h-4 w-4" />}
                mobileLabel="Delete Inquiry"
                title="Delete Inquiry"
                onClick={() => setConfirmDeleteOpen(true)}
              >
                Delete Inquiry
              </Button>
              <Button
                mobileIcon={<Pencil className="h-4 w-4" />}
                mobileLabel={t('edit')}
                title={t('edit')}
                onClick={() => setIsEditing(true)}
              >
                {t('edit')}
              </Button>
            </div>
          )
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex justify-between"><span className="text-gray-500">{t('status')}</span><StatusBadge status={getInquiryStatusLabel(inquiry.status, t)} /></div>
          {isEditing ? (
            <div className="space-y-3">
              <Input
                label={t('customerName')}
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              />
              <Input
                label={t('mobile')}
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              />
              <Input
                label={t('eventType')}
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value })}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DatePicker
                  label={t('eventDate')}
                  min="2000-01-01"
                  max="2100-12-31"
                  value={form.eventDate}
                  onChange={(value) => setForm({ ...form, eventDate: value })}
                />
                <div className="flex items-end gap-2">
                  <Input
                    label={t('eventTime')}
                    type="time"
                    value={form.eventTime}
                    onChange={(e) => setForm({ ...form, eventTime: e.target.value })}
                    className="min-w-0 flex-1"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, eventTime: getCurrentTimeInputValue() })}>
                    {t('currentTime')}
                  </Button>
                </div>
              </div>
              <AddressMapPicker
                address={form.eventAddress}
                mapLink={form.googleMapLink}
                onAddressChange={(eventAddress) => setForm({ ...form, eventAddress })}
                onMapLinkChange={(googleMapLink) => setForm({ ...form, googleMapLink })}
              />
              <Textarea
                label={t('notes')}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          ) : (
            <>
              <div><span className="text-gray-500">{t('mobile')}: </span>{inquiry.mobile}</div>
              <div><span className="text-gray-500">{t('eventDate')}: </span>{formatDate(inquiry.eventDate)} {formatTime(inquiry.eventTime)}</div>
              <div><span className="text-gray-500">{t('eventAddress')}: </span>{inquiry.eventAddress}</div>
              {inquiry.googleMapLink && (
                <a href={inquiry.googleMapLink} target="_blank" rel="noreferrer" className="text-blue-600 text-sm">Open Map</a>
              )}
              {inquiry.notes && <div><span className="text-gray-500">{t('notes')}: </span>{inquiry.notes}</div>}
            </>
          )}
        </Card>

        {estimate && (
          <Card>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-semibold">{estimate.estimateNumber}</h3>
              <Button
                size="sm"
                variant="outline"
                mobileIcon={<Pencil className="h-4 w-4" />}
                mobileLabel="Edit Items"
                title="Edit Items"
                onClick={openItemEditor}
              >
                Edit Items
              </Button>
            </div>
            <div className="space-y-1 mb-4">
              {estimate.lineItems.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.itemName}</span>
                  <span>{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 font-bold">{t('grandTotal')}: {formatCurrency(estimate.grandTotal)}</div>
            <Button className="mt-4 w-full" onClick={() => navigate(`/estimates/${estimate.id}`)}>
              {t('viewDetails')}
            </Button>
          </Card>
        )}
      </div>

      <Modal open={showEditItems} onClose={() => setShowEditItems(false)} title="Edit Estimate Items">
        <div className="space-y-4">
          <LineItemsEditor
            items={itemDraft}
            onChange={setItemDraft}
            defaultEventDate={estimate?.eventDate}
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
              return (
                <>
                  <div className="flex justify-between">
                    <span>{t('subtotal')}</span>
                    <span>{formatCurrency(totals.subTotal)}</span>
                  </div>
                  <div className="mt-1 flex justify-between font-semibold">
                    <span>{t('grandTotal')}</span>
                    <span>{formatCurrency(totals.grandTotal)}</span>
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
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete inquiry?"
        message="This action is blocked if linked estimate or booking exists."
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteInquiry}
        loading={deleting}
      />
    </div>
  );
}
