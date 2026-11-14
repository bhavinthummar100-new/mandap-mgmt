import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { LoadingSkeleton, PageHeader, DataTable, Modal } from '@/components/shared';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { getVendors, createVendor, getVendorPayments, createVendorPayment } from '@/services/vendorService';
import { VENDOR_CATEGORIES } from '@/lib/constants';
import { formatCurrency } from '@/utils/calculations';
import { useTranslation } from '@/lib/i18n';
import { useAsyncActionGuard } from '@/hooks/useAsyncActionGuard';
import type { Vendor, VendorPayment } from '@/types';

export function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVendor, setShowVendor] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [vendorForm, setVendorForm] = useState({ name: '', category: VENDOR_CATEGORIES[0], mobile: '', notes: '' });
  const [paymentForm, setPaymentForm] = useState({ vendorId: '', vendorName: '', charges: 0, paidAmount: 0, notes: '' });
  const { t } = useTranslation();
  const { runGuarded, isRunning } = useAsyncActionGuard();

  const load = async () => {
    const [v, p] = await Promise.all([getVendors(), getVendorPayments()]);
    setVendors(v);
    setPayments(p);
  };

  useEffect(() => {
    let active = true;
    void Promise.all([getVendors(), getVendorPayments()])
      .then(([v, p]) => {
        if (active) {
          setVendors(v);
          setPayments(p);
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load vendors and payments', error);
        toast.error('Failed to load vendors and payments');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const saveVendor = async () => {
    await runGuarded(async () => {
      try {
        await createVendor(vendorForm);
        toast.success('Vendor created');
        setShowVendor(false);
        await load();
      } catch {
        toast.error('Failed to create vendor');
      }
    }, 'saveVendor');
  };

  const savePayment = async () => {
    await runGuarded(async () => {
      try {
        await createVendorPayment(paymentForm);
        toast.success('Payment recorded');
        setShowPayment(false);
        await load();
      } catch {
        toast.error('Failed to record payment');
      }
    }, 'savePayment');
  };

  const savingVendor = isRunning('saveVendor');
  const savingPayment = isRunning('savePayment');

  return (
    <div>
      <PageHeader
        title={t('vendors')}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              mobileIcon={<Plus className="h-5 w-5" />}
              mobileLabel={t('recordPayment')}
              title={t('recordPayment')}
              onClick={() => setShowPayment(true)}
            >
              {t('recordPayment')}
            </Button>
            <Button
              mobileIcon={<Plus className="h-5 w-5" />}
              mobileLabel={t('create')}
              title={t('create')}
              onClick={() => setShowVendor(true)}
            >
              <Plus className="h-4 w-4" />{t('create')}
            </Button>
          </div>
        }
      />

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          <h3 className="mb-3 font-semibold">Vendors</h3>
          <DataTable
            data={vendors}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'category', label: t('category') },
              { key: 'mobile', label: t('mobile') },
            ]}
          />
          <h3 className="mb-3 mt-6 font-semibold">Payments</h3>
          <DataTable
            data={payments}
            columns={[
              { key: 'vendorName', label: 'Vendor' },
              { key: 'charges', label: t('vendorCharges'), render: (p) => formatCurrency(p.charges) },
              { key: 'paidAmount', label: t('paidAmount'), render: (p) => formatCurrency(p.paidAmount) },
              { key: 'remainingAmount', label: t('remainingAmount'), render: (p) => formatCurrency(p.remainingAmount) },
            ]}
          />
        </>
      )}

      <Modal open={showVendor} onClose={() => setShowVendor(false)} title={t('create')}>
        <div className="space-y-4">
          <Input label="Name" value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} />
          <Select label={t('category')} value={vendorForm.category} onChange={(e) => setVendorForm({ ...vendorForm, category: e.target.value as Vendor['category'] })} options={VENDOR_CATEGORIES.map((c) => ({ value: c, label: c }))} />
          <Input label={t('mobile')} value={vendorForm.mobile} onChange={(e) => setVendorForm({ ...vendorForm, mobile: e.target.value })} />
          <Button onClick={saveVendor} className="w-full" loading={savingVendor}>{t('save')}</Button>
        </div>
      </Modal>

      <Modal open={showPayment} onClose={() => setShowPayment(false)} title={t('recordPayment')}>
        <div className="space-y-4">
          <Select
            label="Vendor"
            value={paymentForm.vendorId}
            onChange={(e) => {
              const v = vendors.find((v) => v.id === e.target.value);
              setPaymentForm({ ...paymentForm, vendorId: e.target.value, vendorName: v?.name ?? '' });
            }}
            options={[{ value: '', label: 'Select...' }, ...vendors.map((v) => ({ value: v.id, label: v.name }))]}
          />
          <Input label={t('vendorCharges')} type="number" value={paymentForm.charges} onChange={(e) => setPaymentForm({ ...paymentForm, charges: Number(e.target.value) })} />
          <Input label={t('paidAmount')} type="number" value={paymentForm.paidAmount} onChange={(e) => setPaymentForm({ ...paymentForm, paidAmount: Number(e.target.value) })} />
          <Button onClick={savePayment} className="w-full" loading={savingPayment}>{t('save')}</Button>
        </div>
      </Modal>
    </div>
  );
}
