import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader, DataTable, Modal } from '@/components/shared';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { getExpenses, createExpense } from '@/services/expenseService';
import { EXPENSE_CATEGORIES } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/utils/calculations';
import { useTranslation } from '@/lib/i18n';
import { useAsyncActionGuard } from '@/hooks/useAsyncActionGuard';
import type { Expense, ExpenseCategory } from '@/types';

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category: EXPENSE_CATEGORIES[0] as ExpenseCategory, amount: 0, date: new Date().toISOString().split('T')[0], notes: '' });
  const { t } = useTranslation();
  const { runGuarded, isRunning } = useAsyncActionGuard();

  const load = () => getExpenses().then(setExpenses).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const today = new Date().toISOString().split('T')[0];
  const todayTotal = expenses.filter((e) => e.date === today).reduce((s, e) => s + e.amount, 0);

  const handleSave = async () => {
    await runGuarded(async () => {
      try {
        await createExpense(form);
        toast.success('Expense recorded');
        setShowModal(false);
        await load();
      } catch {
        toast.error('Failed to record expense');
      }
    }, 'saveExpense');
  };

  const savingExpense = isRunning('saveExpense');

  return (
    <div>
      <PageHeader
        title={t('expenses')}
        action={<Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4" />{t('create')}</Button>}
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-white p-4 dark:bg-gray-800 dark:border-gray-700">
          <p className="text-sm text-gray-500">{t('dailyRevenue')}</p>
          <p className="text-xl font-bold">{formatCurrency(todayTotal)}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 dark:bg-gray-800 dark:border-gray-700">
          <p className="text-sm text-gray-500">Total Expenses</p>
          <p className="text-xl font-bold">{formatCurrency(total)}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>
      ) : (
        <DataTable
          data={expenses}
          columns={[
            { key: 'date', label: t('date'), render: (e) => formatDate(e.date) },
            { key: 'category', label: t('category') },
            { key: 'amount', label: t('amount'), render: (e) => formatCurrency(e.amount) },
            { key: 'notes', label: t('notes') },
          ]}
        />
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={t('create')}>
        <div className="space-y-4">
          <Select label={t('category')} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })} options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))} />
          <Input label={t('amount')} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          <Input label={t('date')} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Textarea label={t('notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button onClick={handleSave} className="w-full" loading={savingExpense}>{t('save')}</Button>
        </div>
      </Modal>
    </div>
  );
}
