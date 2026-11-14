import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LineItemsEditor, PageHeader } from '@/components/shared';
import { AddressMapPicker } from '@/components/shared/AddressMapPicker';
import { PhotoPicker } from '@/components/shared/PhotoPicker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { createCustomer, getCustomers, searchCustomerByMobile, updateCustomer, uploadCustomerPhoto } from '@/services/customerService';
import { createInquiry } from '@/services/inquiryService';
import { createEstimate, getEstimate } from '@/services/estimateService';
import { convertEstimateToBooking } from '@/services/bookingService';
import { calculateTotals, normalizeLineItem } from '@/utils/calculations';
import { getCurrentTimeInputValue, isValidEventDate } from '@/utils/eventDate';
import { useTranslation } from '@/lib/i18n';
import type { Customer, LineItem } from '@/types';

interface BookingFormData {
  customerName: string;
  mobile: string;
  eventType: string;
  eventDate: string;
  eventTime: string;
  eventAddress: string;
  googleMapLink: string;
  notes: string;
  discount: number;
  advancePayment: number;
  lineItems: LineItem[];
}

export function NewBookingPage() {
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerPhotoUrl, setCustomerPhotoUrl] = useState('');
  const [customerPhotoFile, setCustomerPhotoFile] = useState<File | null>(null);
  const [customerPhotoRemoved, setCustomerPhotoRemoved] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState<BookingFormData>({
    customerName: '',
    mobile: '',
    eventType: '',
    eventDate: '',
    eventTime: '',
    eventAddress: '',
    googleMapLink: '',
    notes: '',
    discount: 0,
    advancePayment: 0,
    lineItems: [{ itemName: '', quantity: 1, rate: 0, rentalDays: 1, total: 0 }] as LineItem[],
  });

  const { subTotal, grandTotal } = calculateTotals(form.lineItems, form.discount);
  const remainingAmount = Math.max(0, grandTotal - form.advancePayment);

  useEffect(() => {
    getCustomers()
      .then((list) => setCustomers(list))
      .catch(() => {
        toast.error('Failed to load customers');
      });
  }, []);

  const customerOptions = [
    { value: '', label: t('createNewCustomer') },
    ...customers.map((customer) => ({
      value: customer.id,
      label: `${customer.name} - ${customer.mobile}`,
    })),
  ];

  const handleExistingCustomerChange = (customerId: string) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const estimate = await getEstimate(estimateId);
      if (!estimate) {
        throw new Error('Estimate not found for booking conversion');
      }
      const { bookingId, warnings } = await convertEstimateToBooking(estimate, form.advancePayment, form.notes);

      if (warnings.length > 0) {
        toast(`Booking created with warnings: ${warnings.join(' | ')}`);
      } else {
        toast.success('Booking created');
      }
      navigate(`/bookings/${bookingId}`);
    } catch {
      toast.error('Failed to create booking');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="New Booking" subtitle={t('bookings')} backTo="/bookings" backLabel={t('back')} />
      <Card className="mx-auto max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label={t('existingCustomer')}
            value={selectedCustomerId}
            onChange={(e) => handleExistingCustomerChange(e.target.value)}
            options={customerOptions}
          />
          <Input label={t('customerName')} value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
          <Input label={t('mobile')} value={form.mobile} onChange={(e) => handleMobileChange(e.target.value)} required />
          <PhotoPicker
            value={customerPhotoRemoved ? '' : customerPhotoUrl}
            onFileChange={setCustomerPhotoFile}
            onRemoveChange={setCustomerPhotoRemoved}
          />
          <Input label={t('eventType')} value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DatePicker label={t('eventDate')} min="2000-01-01" max="2100-12-31" value={form.eventDate} onChange={(value) => setForm({ ...form, eventDate: value })} required />
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label={t('discount')} type="number" min={0} value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) || 0 })} />
            <Input label="Advance Payment" type="number" min={0} value={form.advancePayment} onChange={(e) => setForm({ ...form, advancePayment: Number(e.target.value) || 0 })} />
          </div>

          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
            <p className="text-sm">{t('subtotal')}: ₹{subTotal}</p>
            <p className="text-sm">{t('grandTotal')}: ₹{grandTotal}</p>
            <p className="font-bold">{t('remainingAmount')}: ₹{remainingAmount}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => navigate('/bookings')}>{t('cancel')}</Button>
            <Button type="submit" className="w-full sm:w-auto" loading={saving}>Create Booking</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
