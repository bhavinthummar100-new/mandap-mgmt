import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LineItemsEditor, PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { createInquiry } from '@/services/inquiryService';
import { createEstimate } from '@/services/estimateService';
import { createCustomer, searchCustomerByMobile } from '@/services/customerService';
import { calculateTotals, normalizeLineItem } from '@/utils/calculations';
import { useTranslation } from '@/lib/i18n';
import type { LineItem } from '@/types';

interface InquiryFormData {
  customerName: string;
  mobile: string;
  eventDate: string;
  eventTime: string;
  eventAddress: string;
  googleMapLink: string;
  notes: string;
  discount: number;
  lineItems: LineItem[];
}

export function NewInquiryPage() {
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [form, setForm] = useState<InquiryFormData>({
    customerName: '',
    mobile: '',
    eventDate: '',
    eventTime: '',
    eventAddress: '',
    googleMapLink: '',
    notes: '',
    discount: 0,
    lineItems: [{ itemName: '', quantity: 1, rate: 0, rentalDays: 1, total: 0 }] as LineItem[],
  });

  useEffect(() => {
    const repeat = (location.state as { repeat?: Partial<InquiryFormData> })?.repeat;
    if (repeat) {
      setForm((f) => ({
        ...f,
        customerName: repeat.customerName ?? f.customerName,
        mobile: repeat.mobile ?? f.mobile,
        eventAddress: repeat.eventAddress ?? f.eventAddress,
        lineItems: repeat.lineItems?.length ? repeat.lineItems.map(normalizeLineItem) : f.lineItems,
      }));
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const { subTotal, grandTotal } = calculateTotals(form.lineItems, form.discount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const customer = await searchCustomerByMobile(form.mobile);
      let customerId: string | undefined;
      if (!customer) {
        customerId = await createCustomer({
          name: form.customerName,
          mobile: form.mobile,
          address: form.eventAddress,
        });
      } else {
        customerId = customer.id;
      }

      const inquiryId = await createInquiry({
        customerId,
        customerName: form.customerName,
        mobile: form.mobile,
        eventDate: form.eventDate,
        eventTime: form.eventTime,
        eventAddress: form.eventAddress,
        googleMapLink: form.googleMapLink,
        notes: form.notes,
      });

      const normalizedItems = form.lineItems
        .filter((i) => i.itemName)
        .map(normalizeLineItem);

      const estimateId = await createEstimate({
        inquiryId,
        customerId,
        customerName: form.customerName,
        mobile: form.mobile,
        eventDate: form.eventDate,
        eventTime: form.eventTime,
        eventAddress: form.eventAddress,
        googleMapLink: form.googleMapLink,
        notes: form.notes,
        lineItems: normalizedItems,
        subTotal,
        discount: form.discount,
        grandTotal,
      });

      toast.success('Inquiry & estimate created');
      navigate(`/estimates/${estimateId}`);
    } catch {
      toast.error('Failed to create inquiry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title={t('newInquiry')} subtitle={t('inquiries')} />
      <Card className="mx-auto max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={t('customerName')} value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
          <Input label={t('mobile')} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label={t('eventDate')} type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} required />
            <Input label={t('eventTime')} type="time" value={form.eventTime} onChange={(e) => setForm({ ...form, eventTime: e.target.value })} required />
          </div>
          <Textarea label={t('eventAddress')} value={form.eventAddress} onChange={(e) => setForm({ ...form, eventAddress: e.target.value })} required />
          <Input label={t('googleMapLink')} value={form.googleMapLink} onChange={(e) => setForm({ ...form, googleMapLink: e.target.value })} />
          <Textarea label={t('notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          <div>
            <p className="mb-2 text-sm font-medium">{t('material')}</p>
            <LineItemsEditor
              items={form.lineItems}
              onChange={(items) => setForm({ ...form, lineItems: items })}
              defaultEventDate={form.eventDate}
            />
          </div>

          <Input label={t('discount')} type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} />
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
            <p className="text-sm">{t('subtotal')}: ₹{subTotal}</p>
            <p className="font-bold">{t('grandTotal')}: ₹{grandTotal}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => navigate('/inquiries')}>{t('cancel')}</Button>
            <Button type="submit" className="w-full sm:w-auto" loading={saving}>{t('save')}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
