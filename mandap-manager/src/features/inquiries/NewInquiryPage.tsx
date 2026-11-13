import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LineItemsEditor, PageHeader } from '@/components/shared';
import { AddressMapPicker } from '@/components/shared/AddressMapPicker';
import { PhotoPicker } from '@/components/shared/PhotoPicker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { createInquiry } from '@/services/inquiryService';
import { createEstimate } from '@/services/estimateService';
import { createCustomer, getCustomers, searchCustomerByMobile, updateCustomer, uploadCustomerPhoto } from '@/services/customerService';
import { calculateTotals, normalizeLineItem } from '@/utils/calculations';
import { useTranslation } from '@/lib/i18n';
import type { Customer, LineItem } from '@/types';
import { normalizeIndianPhoneNumber } from '@/utils/phone';
import { getCurrentTimeInputValue, isValidEventDate } from '@/utils/eventDate';

interface InquiryFormData {
  customerName: string;
  mobile: string;
  eventType: string;
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerPhotoUrl, setCustomerPhotoUrl] = useState('');
  const [customerPhotoFile, setCustomerPhotoFile] = useState<File | null>(null);
  const [customerPhotoRemoved, setCustomerPhotoRemoved] = useState(false);
  const [mobileError, setMobileError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const repeat = (location.state as { repeat?: Partial<InquiryFormData> } | null)?.repeat;
  const [form, setForm] = useState<InquiryFormData>(() => ({
    customerName: repeat?.customerName ?? '',
    mobile: repeat?.mobile ?? '',
    eventType: '',
    eventDate: '',
    eventTime: '',
    eventAddress: repeat?.eventAddress ?? '',
    googleMapLink: '',
    notes: '',
    discount: 0,
    lineItems: repeat?.lineItems?.length
      ? repeat.lineItems.map(normalizeLineItem)
      : [{ itemName: '', quantity: 1, rate: 0, rentalDays: 1, total: 0 }] as LineItem[],
  }));

  useEffect(() => {
    if (repeat) {
      window.history.replaceState({}, '');
    }
  }, [repeat]);

  useEffect(() => {
    getCustomers()
      .then((list) => setCustomers(list))
      .catch(() => {
        toast.error('Failed to load customers');
      });
  }, []);

  const { subTotal, grandTotal } = calculateTotals(form.lineItems, form.discount);

  const customerOptions = [
    { value: '', label: t('createNewCustomer') },
    ...customers.map((customer) => ({
      value: customer.id,
      label: `${customer.name} - ${customer.mobile}`,
    })),
  ];

  const handleExistingCustomerChange = (customerId: string) => {
    setMobileError('');
    setSelectedCustomerId(customerId);
    if (!customerId) {
      setCustomerPhotoUrl('');
      setCustomerPhotoFile(null);
      setCustomerPhotoRemoved(false);
      return;
    }

    const selectedCustomer = customers.find((customer) => customer.id === customerId);
    if (!selectedCustomer) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      customerName: selectedCustomer.name,
      mobile: selectedCustomer.mobile,
      eventAddress: selectedCustomer.address ?? prev.eventAddress,
      googleMapLink: selectedCustomer.googleMapLink ?? prev.googleMapLink,
    }));
    setCustomerPhotoUrl(selectedCustomer.photoUrl ?? '');
    setCustomerPhotoFile(null);
    setCustomerPhotoRemoved(false);
  };

  const handleMobileChange = (mobile: string) => {
    setMobileError('');
    const matchedCustomer = customers.find((customer) => customer.mobile === mobile);
    setSelectedCustomerId(matchedCustomer?.id ?? '');

    if (!matchedCustomer) {
      setCustomerPhotoUrl('');
      setCustomerPhotoFile(null);
      setCustomerPhotoRemoved(false);
      setForm((prev) => ({ ...prev, mobile }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      customerName: matchedCustomer.name,
      mobile,
      eventAddress: matchedCustomer.address ?? prev.eventAddress,
    }));
    setCustomerPhotoUrl(matchedCustomer.photoUrl ?? '');
    setCustomerPhotoFile(null);
    setCustomerPhotoRemoved(false);
  };

  const setEventDateToToday = () => {
    const now = new Date();
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');
    setForm((prev) => ({ ...prev, eventDate: today }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalizeIndianPhoneNumber(form.mobile)) {
      setMobileError(t('invalidMobile'));
      return;
    }
    if (!isValidEventDate(form.eventDate)) {
      toast.error(t('invalidEventDate'));
      return;
    }
    setSaving(true);
    try {
      let customerId: string | undefined = selectedCustomerId || undefined;
      if (!customerId) {
        const customer = await searchCustomerByMobile(form.mobile);
        if (!customer) {
          customerId = await createCustomer({
            name: form.customerName,
            mobile: form.mobile,
            address: form.eventAddress,
            googleMapLink: form.googleMapLink,
          });
        } else {
          customerId = customer.id;
        }
      }
      if (customerId && (customerPhotoFile || customerPhotoRemoved)) {
        const photoUrl = customerPhotoFile
          ? await uploadCustomerPhoto(customerId, customerPhotoFile)
          : '';
        await updateCustomer(customerId, { photoUrl });
      }

      const inquiryId = await createInquiry({
        customerId,
        customerName: form.customerName,
        mobile: form.mobile,
        eventDate: form.eventDate,
        eventType: form.eventType,
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
        eventType: form.eventType,
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
      <PageHeader title={t('newInquiry')} subtitle={t('inquiries')} backTo="/inquiries" backLabel={t('back')} />
      <Card className="mx-auto max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label={t('existingCustomer')}
            value={selectedCustomerId}
            onChange={(e) => handleExistingCustomerChange(e.target.value)}
            options={customerOptions}
          />
          <Input label={t('customerName')} value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
          <Input
            label={t('mobile')}
            type="tel"
            value={form.mobile}
            onChange={(e) => handleMobileChange(e.target.value)}
            error={mobileError}
            required
          />
          <PhotoPicker
            value={customerPhotoRemoved ? '' : customerPhotoUrl}
            onFileChange={setCustomerPhotoFile}
            onRemoveChange={setCustomerPhotoRemoved}
          />
          <Input
            label={t('eventType')}
            value={form.eventType}
            onChange={(e) => setForm({ ...form, eventType: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-end gap-2">
              <Input
                label={t('eventDate')}
                type="date"
                min="2000-01-01"
                max="2100-12-31"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                className="min-w-0 flex-1"
                required
              />
              <Button type="button" size="sm" variant="outline" onClick={setEventDateToToday}>
                Today
              </Button>
            </div>
            <div className="flex items-end gap-2">
              <Input label={t('eventTime')} type="time" value={form.eventTime} onChange={(e) => setForm({ ...form, eventTime: e.target.value })} className="min-w-0 flex-1" />
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
            required
          />
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
