import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PageHeader, DataTable, Modal } from '@/components/shared';
import { PhotoPicker } from '@/components/shared/PhotoPicker';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { AddressMapPicker } from '@/components/shared/AddressMapPicker';
import { getCustomers, updateCustomer, uploadCustomerPhoto } from '@/services/customerService';
import { getBookings } from '@/services/bookingService';
import { formatDate } from '@/utils/calculations';
import { useTranslation } from '@/lib/i18n';
import type { Customer, Booking } from '@/types';

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: '', mobile: '', address: '', googleMapLink: '', notes: '', photoUrl: '' });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    Promise.all([getCustomers(), getBookings()]).then(([c, b]) => {
      setCustomers(c);
      setBookings(b);
      setLoading(false);
    });
  }, []);

  const handleRepeatBooking = (customer: Customer) => {
    const lastBooking = bookings
      .filter((b) => b.customerId === customer.id || b.mobile === customer.mobile)
      .sort((a, b) => b.eventDate.localeCompare(a.eventDate))[0];

    navigate('/inquiries/new', {
      state: {
        repeat: {
          customerName: customer.name,
          mobile: customer.mobile,
          eventAddress: customer.address ?? lastBooking?.eventAddress ?? '',
          googleMapLink: customer.googleMapLink ?? lastBooking?.googleMapLink ?? '',
          lineItems: lastBooking?.lineItems ?? [],
        },
      },
    });
  };

  const openCustomerEditor = (customer: Customer) => {
    setEditCustomer(customer);
    setForm({
      name: customer.name,
      mobile: customer.mobile,
      address: customer.address ?? '',
      googleMapLink: customer.googleMapLink ?? '',
      notes: customer.notes ?? '',
      photoUrl: customer.photoUrl ?? '',
    });
    setPhotoFile(null);
    setPhotoRemoved(false);
  };

  const handleSaveCustomer = async () => {
    if (!editCustomer || !form.name.trim() || !form.mobile.trim()) return;
    setSaving(true);
    try {
      const photoUrl = photoFile
        ? await uploadCustomerPhoto(editCustomer.id, photoFile)
        : photoRemoved
          ? ''
          : form.photoUrl;
      await updateCustomer(editCustomer.id, {
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        address: form.address.trim(),
        googleMapLink: form.googleMapLink.trim(),
        notes: form.notes.trim(),
        photoUrl,
      });
      setCustomers((current) => current.map((customer) =>
        customer.id === editCustomer.id ? { ...customer, ...form, photoUrl } : customer
      ));
      setEditCustomer(null);
      toast.success(t('customerUpdated'));
    } catch (error) {
      console.error('Failed to update customer', error);
      toast.error(error instanceof Error ? error.message : t('customerUpdateFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title={t('customers')} />
      {loading ? (
        <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>
      ) : (
        <DataTable
          data={customers}
          onRowClick={openCustomerEditor}
          columns={[
            {
              key: 'name',
              label: t('customerName'),
              render: (customer) => (
                <span className="flex items-center gap-2">
                  {customer.photoUrl ? (
                    <img src={customer.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                      {(customer.name.trim()[0] || '?').toUpperCase()}
                    </span>
                  )}
                  <span>{customer.name}</span>
                </span>
              ),
            },
            { key: 'mobile', label: t('mobile') },
            { key: 'totalBookings', label: 'Bookings' },
            { key: 'lastEventDate', label: 'Last Event', render: (c) => c.lastEventDate ? formatDate(c.lastEventDate) : '-' },
            { key: 'actions', label: t('actions'), render: (c) => (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleRepeatBooking(c); }}>
                  {t('repeatBooking')}
                </Button>
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openCustomerEditor(c); }}>
                  {t('edit')}
                </Button>
              </div>
            )},
          ]}
        />
      )}
      <Modal open={!!editCustomer} onClose={() => setEditCustomer(null)} title={t('editCustomer')}>
        <div className="space-y-4">
          <PhotoPicker
            value={photoRemoved ? '' : form.photoUrl}
            onFileChange={setPhotoFile}
            onRemoveChange={setPhotoRemoved}
          />
          <Input label={t('customerName')} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <Input label={t('mobile')} type="tel" value={form.mobile} onChange={(event) => setForm({ ...form, mobile: event.target.value })} required />
          <AddressMapPicker
            address={form.address}
            mapLink={form.googleMapLink}
            addressLabel={t('address')}
            onAddressChange={(address) => setForm({ ...form, address })}
            onMapLinkChange={(googleMapLink) => setForm({ ...form, googleMapLink })}
          />
          <Textarea label={t('notes')} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          <Button className="w-full" loading={saving} onClick={() => void handleSaveCustomer()}>{t('save')}</Button>
        </div>
      </Modal>
    </div>
  );
}
