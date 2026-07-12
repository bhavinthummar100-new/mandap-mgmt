import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmDialog, DataTable, PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/Button';
import { deletePayment, getPayments } from '@/services/paymentService';
import { formatCurrency, formatDate } from '@/utils/calculations';
import { useTranslation } from '@/lib/i18n';
import { useAsyncActionGuard } from '@/hooks/useAsyncActionGuard';
import type { Payment } from '@/types';

export function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { runGuarded } = useAsyncActionGuard();

  useEffect(() => {
    getPayments()
      .then(setPayments)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await runGuarded(async () => {
      setDeletingId(deleteTarget.id);
      try {
        await deletePayment(deleteTarget);
        setPayments((prev) => prev.filter((payment) => payment.id !== deleteTarget.id));
        toast.success('Payment deleted');
        setDeleteTarget(null);
      } catch {
        toast.error('Failed to delete payment');
      } finally {
        setDeletingId(null);
      }
    }, `delete-${deleteTarget.id}`);
  };

  return (
    <div>
      <PageHeader title={t('payments')} subtitle="All customer payments" />
      {loading ? (
        <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>
      ) : (
        <DataTable
          data={payments}
          onRowClick={(payment) => navigate(`/bookings/${payment.bookingId}`)}
          columns={[
            { key: 'date', label: t('date'), render: (payment) => formatDate(payment.date) },
            { key: 'bookingNumber', label: 'Booking #' },
            { key: 'type', label: 'Type' },
            { key: 'amount', label: t('amount'), render: (payment) => formatCurrency(payment.amount) },
            { key: 'method', label: t('paymentMethod') },
            { key: 'notes', label: t('notes'), render: (payment) => payment.notes || '-' },
            {
              key: 'actions',
              label: t('actions'),
              render: (payment) => (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                  loading={deletingId === payment.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(payment);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  {t('delete')}
                </Button>
              ),
            },
          ]}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete payment"
        message={
          deleteTarget
            ? `Are you sure you want to delete payment of ${formatCurrency(deleteTarget.amount)} on ${formatDate(deleteTarget.date)}?`
            : ''
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={!!deletingId}
      />
    </div>
  );
}
