import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader, DataTable, Modal } from '@/components/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getLaborers, createLaborer, updateLaborer } from '@/services/laborService';
import { formatCurrency } from '@/utils/calculations';
import { useTranslation } from '@/lib/i18n';
import { useAsyncActionGuard } from '@/hooks/useAsyncActionGuard';
import type { Laborer } from '@/types';

export function LaborPage() {
  const [laborers, setLaborers] = useState<Laborer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Laborer | null>(null);
  const [form, setForm] = useState({ name: '', mobile: '', dailyWage: 0, extraPayment: 0, advanceGiven: 0, isActive: true });
  const { t } = useTranslation();
  const { runGuarded, isRunning } = useAsyncActionGuard();

  const load = () => getLaborers().then(setLaborers).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    await runGuarded(async () => {
      try {
        if (editItem) {
          await updateLaborer(editItem.id, form);
        } else {
          await createLaborer(form);
        }
        toast.success('Saved');
        setShowModal(false);
        await load();
      } catch {
        toast.error('Failed');
      }
    }, 'saveLaborer');
  };

  const savingLaborer = isRunning('saveLaborer');

  return (
    <div>
      <PageHeader title={t('labor')} action={<Button onClick={() => { setEditItem(null); setForm({ name: '', mobile: '', dailyWage: 0, extraPayment: 0, advanceGiven: 0, isActive: true }); setShowModal(true); }}><Plus className="h-4 w-4" />{t('create')}</Button>} />
      {loading ? (
        <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>
      ) : (
        <DataTable
          data={laborers}
          onRowClick={(l) => { setEditItem(l); setForm({ name: l.name, mobile: l.mobile, dailyWage: l.dailyWage, extraPayment: l.extraPayment, advanceGiven: l.advanceGiven, isActive: l.isActive }); setShowModal(true); }}
          columns={[
            { key: 'name', label: t('customerName') },
            { key: 'mobile', label: t('mobile') },
            { key: 'dailyWage', label: t('dailyWage'), render: (l) => formatCurrency(l.dailyWage) },
            { key: 'extraPayment', label: t('extraPayment'), render: (l) => formatCurrency(l.extraPayment) },
            { key: 'advanceGiven', label: t('advanceGiven'), render: (l) => formatCurrency(l.advanceGiven) },
            { key: 'isActive', label: t('status'), render: (l) => l.isActive ? t('active') : t('inactive') },
          ]}
        />
      )}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? t('edit') : t('create')}>
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label={t('mobile')} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          <Input label={t('dailyWage')} type="number" value={form.dailyWage} onChange={(e) => setForm({ ...form, dailyWage: Number(e.target.value) })} />
          <Input label={t('extraPayment')} type="number" value={form.extraPayment} onChange={(e) => setForm({ ...form, extraPayment: Number(e.target.value) })} />
          <Input label={t('advanceGiven')} type="number" value={form.advanceGiven} onChange={(e) => setForm({ ...form, advanceGiven: Number(e.target.value) })} />
          <Button onClick={handleSave} className="w-full" loading={savingLaborer}>{t('save')}</Button>
        </div>
      </Modal>
    </div>
  );
}
