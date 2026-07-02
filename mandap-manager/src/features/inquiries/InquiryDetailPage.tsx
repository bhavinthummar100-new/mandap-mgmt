import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LineItemsEditor, Modal, PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getInquiry, updateInquiry } from '@/services/inquiryService';
import { getEstimates, updateEstimate } from '@/services/estimateService';
import { calculateTotals, formatDate, formatTime, formatCurrency, normalizeLineItem } from '@/utils/calculations';
import { useTranslation } from '@/lib/i18n';
import type { Inquiry, Estimate } from '@/types';

export function InquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showEditItems, setShowEditItems] = useState(false);
  const [itemDraft, setItemDraft] = useState<Estimate['lineItems']>([]);
  const [discountDraft, setDiscountDraft] = useState(0);
  const [savingItems, setSavingItems] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    mobile: '',
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
    if (inq) {
      setForm({
        customerName: inq.customerName,
        mobile: inq.mobile,
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
    loadData();
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateInquiry(id, {
        customerName: form.customerName.trim(),
        mobile: form.mobile.trim(),
        eventDate: form.eventDate,
        eventTime: form.eventTime,
        eventAddress: form.eventAddress.trim(),
        googleMapLink: form.googleMapLink.trim(),
        notes: form.notes.trim(),
      });
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

  if (!inquiry) return <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;

  return (
    <div>
      <PageHeader
        title={inquiry.customerName}
        subtitle={`Inquiry · ${formatDate(inquiry.eventDate)}`}
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
            <Button onClick={() => setIsEditing(true)}>{t('edit')}</Button>
          )
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex justify-between"><span className="text-gray-500">{t('status')}</span><StatusBadge status={inquiry.status} /></div>
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label={t('eventDate')}
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                />
                <Input
                  label={t('eventTime')}
                  type="time"
                  value={form.eventTime}
                  onChange={(e) => setForm({ ...form, eventTime: e.target.value })}
                />
              </div>
              <Textarea
                label={t('eventAddress')}
                value={form.eventAddress}
                onChange={(e) => setForm({ ...form, eventAddress: e.target.value })}
              />
              <Input
                label={t('googleMapLink')}
                value={form.googleMapLink}
                onChange={(e) => setForm({ ...form, googleMapLink: e.target.value })}
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
              <Button size="sm" variant="outline" onClick={openItemEditor}>
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
    </div>
  );
}
