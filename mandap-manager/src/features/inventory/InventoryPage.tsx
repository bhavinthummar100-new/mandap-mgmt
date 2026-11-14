import { useEffect, useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { LoadingSkeleton, PageHeader, DataTable, Modal } from '@/components/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getInventoryItems, createInventoryItem, updateInventoryItem } from '@/services/inventoryService';
import { useTranslation } from '@/lib/i18n';
import { useAsyncActionGuard } from '@/hooks/useAsyncActionGuard';
import type { InventoryItem } from '@/types';

export function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState({ name: '', nameGu: '', category: '', totalStock: 0, lowStockThreshold: 10, rate: 0 });
  const { t } = useTranslation();
  const { runGuarded, isRunning } = useAsyncActionGuard();

  const load = () => getInventoryItems().then(setItems).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    await runGuarded(async () => {
      try {
        if (editItem) {
          await updateInventoryItem(editItem.id, form);
        } else {
          await createInventoryItem(form);
        }
        toast.success('Saved');
        setShowModal(false);
        setEditItem(null);
        await load();
      } catch {
        toast.error('Failed to save');
      }
    }, 'saveInventoryItem');
  };

  const savingInventoryItem = isRunning('saveInventoryItem');

  const openEdit = (item: InventoryItem) => {
    setEditItem(item);
    setForm({ name: item.name, nameGu: item.nameGu, category: item.category, totalStock: item.totalStock, lowStockThreshold: item.lowStockThreshold, rate: item.rate ?? 0 });
    setShowModal(true);
  };

  return (
    <div>
      <PageHeader title={t('inventory')} action={<Button onClick={() => { setEditItem(null); setForm({ name: '', nameGu: '', category: '', totalStock: 0, lowStockThreshold: 10, rate: 0 }); setShowModal(true); }}><Plus className="h-4 w-4" />{t('addItem')}</Button>} />

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <DataTable
          data={items}
          onRowClick={openEdit}
          columns={[
            { key: 'name', label: t('itemName'), render: (i) => (
              <div className="flex items-center gap-2">
                {i.availableStock <= i.lowStockThreshold && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                <span>{i.name}</span>
              </div>
            )},
            { key: 'nameGu', label: 'ગુજરાતી' },
            { key: 'totalStock', label: t('totalStock') },
            { key: 'bookedStock', label: t('bookedStock') },
            { key: 'availableStock', label: t('availableStock'), render: (i) => (
              <span className={i.availableStock <= i.lowStockThreshold ? 'text-orange-600 font-medium' : ''}>{i.availableStock}</span>
            )},
            { key: 'rate', label: t('rate'), render: (i) => `₹${i.rate ?? 0}` },
          ]}
        />
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? t('edit') : t('addItem')}>
        <div className="space-y-4">
          <Input label={t('itemName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Name (Gujarati)" value={form.nameGu} onChange={(e) => setForm({ ...form, nameGu: e.target.value })} />
          <Input label={t('category')} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <Input label={t('totalStock')} type="number" value={form.totalStock} onChange={(e) => setForm({ ...form, totalStock: Number(e.target.value) })} />
          <Input label="Low Stock Threshold" type="number" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })} />
          <Input label={t('rate')} type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} />
          <Button onClick={handleSave} className="w-full" loading={savingInventoryItem}>{t('save')}</Button>
        </div>
      </Modal>
    </div>
  );
}
