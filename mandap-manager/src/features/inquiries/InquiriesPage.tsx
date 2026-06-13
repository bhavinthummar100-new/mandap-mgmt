import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader, DataTable, Modal, LineItemsEditor } from '@/components/shared';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getInquiries, createInquiry } from '@/services/inquiryService';
import { createEstimate } from '@/services/estimateService';
import { searchCustomerByMobile, createCustomer } from '@/services/customerService';
import { calculateTotals, normalizeLineItem } from '@/utils/calculations';
import { formatDate } from '@/utils/calculations';
import { useTranslation } from '@/lib/i18n';
import type { Inquiry, LineItem } from '@/types';

export function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [form, setForm] = useState({
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

  const load = () => {
    getInquiries().then(setInquiries).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const repeat = (location.state as { repeat?: typeof form })?.repeat;
    if (repeat) {
      setForm((f) => ({
        ...f,
        customerName: repeat.customerName ?? f.customerName,
        mobile: repeat.mobile ?? f.mobile,
        eventAddress: repeat.eventAddress ?? f.eventAddress,
        lineItems: repeat.lineItems?.length ? repeat.lineItems.map(normalizeLineItem) : f.lineItems,
      }));
      setShowModal(true);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const { subTotal, grandTotal } = calculateTotals(form.lineItems, form.discount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let customer = await searchCustomerByMobile(form.mobile);
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
      setShowModal(false);
      load();
      navigate(`/estimates/${estimateId}`);
    } catch {
      toast.error('Failed to create inquiry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={t('inquiries')}
        action={
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" />
            {t('newInquiry')}
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>
      ) : (
        <DataTable
          data={inquiries}
          onRowClick={(row) => navigate(`/inquiries/${row.id}`)}
          columns={[
            { key: 'customerName', label: t('customerName') },
            { key: 'mobile', label: t('mobile') },
            { key: 'eventDate', label: t('eventDate'), render: (r) => formatDate(r.eventDate) },
            { key: 'eventAddress', label: t('eventAddress') },
            { key: 'status', label: t('status'), render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={t('newInquiry')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={t('customerName')} value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
          <Input label={t('mobile')} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
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

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>{t('cancel')}</Button>
            <Button type="submit" loading={saving}>{t('save')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
