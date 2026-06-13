import { useState } from 'react';
import { cn } from '@/utils/cn';
import { Card } from '@/components/ui/Card';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 gap-2">{action}</div>}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
  className?: string;
}

export function MetricCard({ title, value, icon, trend, className }: MetricCardProps) {
  return (
    <Card className={cn('', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          {trend && <p className="mt-1 text-xs text-gray-400">{trend}</p>}
        </div>
        {icon && <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">{icon}</div>}
      </div>
    </Card>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel, loading }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DataTableProps<T> {
  columns: { key: string; label: string; render?: (row: T) => React.ReactNode }[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data found',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-600">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'border-b border-gray-100 dark:border-gray-700',
                onRowClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50'
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-gray-900 dark:text-gray-100">
                  {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export function Modal({ open, onClose, title, children, maxWidthClass = 'sm:max-w-lg' }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className={cn('max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-6 shadow-xl dark:bg-gray-800 sm:rounded-xl', maxWidthClass)}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface LineItemsEditorProps {
  items: {
    itemName: string;
    quantity: number;
    rate: number;
    total: number;
    rentalDays?: number;
    startDate?: string;
    endDate?: string;
  }[];
  onChange: (
    items: {
      itemName: string;
      quantity: number;
      rate: number;
      total: number;
      rentalDays?: number;
      startDate?: string;
      endDate?: string;
    }[]
  ) => void;
  defaultEventDate?: string;
}

export function LineItemsEditor({ items, onChange, defaultEventDate }: LineItemsEditorProps) {
  const [customDateEnabled, setCustomDateEnabled] = useState<Record<number, boolean>>({});

  const getDaysFromDates = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
    const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  };

  const recalc = (item: {
    itemName: string;
    quantity: number;
    rate: number;
    total: number;
    rentalDays?: number;
    startDate?: string;
    endDate?: string;
  }) => {
    const rentalDays = Math.max(1, item.rentalDays ?? getDaysFromDates(item.startDate, item.endDate));
    return {
      ...item,
      rentalDays,
      total: Number(item.quantity) * Number(item.rate) * rentalDays,
    };
  };

  const addItem = () => {
    onChange([
      ...items,
      { itemName: '', quantity: 1, rate: 0, rentalDays: 1, startDate: '', endDate: '', total: 0 },
    ]);
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value } as (typeof items)[number];

    if (field === 'startDate' || field === 'endDate') {
      const startDate = field === 'startDate' ? String(value) : item.startDate;
      const endDate = field === 'endDate' ? String(value) : item.endDate;
      item.rentalDays = getDaysFromDates(startDate, endDate);
    }

    if (field === 'rentalDays') {
      item.rentalDays = Math.max(1, Number(value) || 1);
    }

    updated[index] = recalc(item);
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const isCustomDatesEnabled = (index: number, item: (typeof items)[number]) =>
    customDateEnabled[index] ?? Boolean(item.startDate || item.endDate);

  const toggleCustomDates = (index: number, enabled: boolean) => {
    setCustomDateEnabled((prev) => ({ ...prev, [index]: enabled }));
    const updated = [...items];
    const item = { ...updated[index] };
    if (!enabled) {
      item.startDate = '';
      item.endDate = '';
      if (!item.rentalDays || item.rentalDays < 1) item.rentalDays = 1;
    } else if (!item.startDate && defaultEventDate) {
      item.startDate = defaultEventDate;
      item.endDate = defaultEventDate;
      item.rentalDays = 1;
    }
    updated[index] = recalc(item);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-12 sm:col-span-5">
              <input
                placeholder="Item name"
                value={item.itemName}
                onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
            <div className="col-span-4 sm:col-span-2">
              <input
                type="number"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
            <div className="col-span-4 sm:col-span-2">
              <input
                type="number"
                placeholder="Rate"
                value={item.rate}
                onChange={(e) => updateItem(index, 'rate', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
            <div className="col-span-4 sm:col-span-1">
              <input
                type="number"
                min={1}
                placeholder="Days"
                value={item.rentalDays ?? 1}
                onChange={(e) => updateItem(index, 'rentalDays', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
            <div className="col-span-12 sm:col-span-2 text-sm font-medium text-gray-700 dark:text-gray-300 py-1.5 sm:text-right">
              ₹{item.total}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={isCustomDatesEnabled(index, item)}
                onChange={(e) => toggleCustomDates(index, e.target.checked)}
              />
              Custom item dates
            </label>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Remove
            </button>
          </div>

          {isCustomDatesEnabled(index, item) ? (
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="date"
                value={item.startDate ?? ''}
                onChange={(e) => updateItem(index, 'startDate', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                title="From date"
              />
              <input
                type="date"
                value={item.endDate ?? ''}
                onChange={(e) => updateItem(index, 'endDate', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                title="To date"
              />
            </div>
          ) : (
            <p className="mt-2 text-xs text-gray-500">
              Using event date as default item date.
            </p>
          )}
        </div>
      ))}
      <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:text-blue-700">
        + Add Item
      </button>
    </div>
  );
}
