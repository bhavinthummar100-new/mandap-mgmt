import { useEffect, useId, useState } from 'react';
import toast from 'react-hot-toast';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, GripVertical, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { Card } from '@/components/ui/Card';
import { DatePicker } from '@/components/ui/DatePicker';
import { getInventoryItems } from '@/services/inventoryService';
import type { InventoryItem } from '@/types';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  backTo?: string;
  backLabel?: string;
}

interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
}

export function LoadingSkeleton({ rows = 4, className }: LoadingSkeletonProps) {
  return (
    <div role="status" aria-label="Loading" aria-busy="true" className={cn('space-y-3', className)}>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="loading-shimmer mb-3 h-4 w-2/5 rounded" />
          <div className="loading-shimmer h-3 w-full rounded" />
          {index % 2 === 0 && <div className="loading-shimmer mt-2 h-3 w-3/4 rounded" />}
        </div>
      ))}
      <span className="sr-only">Loading data…</span>
    </div>
  );
}

export function PageHeader({ title, subtitle, action, backTo, backLabel }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {backTo && (
          <Link
            to={backTo}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label={backLabel}
            title={backLabel}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0 sm:justify-end">{action}</div>}
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
            className={cn(
              'relative rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50',
              loading && 'isolate overflow-hidden'
            )}
          >
            {loading && <span aria-hidden="true" className="button-shimmer pointer-events-none absolute inset-0 z-0" />}
            <span className="relative z-10">{loading ? 'Processing...' : 'Confirm'}</span>
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
  mobileEditLabel?: string;
  emptyMessage?: string;
}

type SortDirection = 'asc' | 'desc';

function getDefaultSortKey<T extends { id: string }>(data: T[]): string | null {
  const rows = data as (T & Record<string, unknown>)[];
  return ['createdAt', 'date', 'eventDate', 'lastEventDate', 'updatedAt'].find(
    (key) => rows.some((row) => row[key] !== undefined && row[key] !== null)
  ) ?? null;
}

function getSortValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value;
  return String(value);
}

function compareSortValues(left: unknown, right: unknown, key: string): number {
  const leftValue = getSortValue(left);
  const rightValue = getSortValue(right);
  if (leftValue === null) return rightValue === null ? 0 : 1;
  if (rightValue === null) return -1;

  if (/(At|Date|^date$|^timestamp$)/i.test(key)) {
    const leftDate = typeof leftValue === 'number' ? leftValue : Date.parse(String(leftValue));
    const rightDate = typeof rightValue === 'number' ? rightValue : Date.parse(String(rightValue));
    if (Number.isFinite(leftDate) && Number.isFinite(rightDate)) return leftDate - rightDate;
  }

  if (typeof leftValue === 'number' && typeof rightValue === 'number') {
    return leftValue - rightValue;
  }
  if (typeof leftValue === 'boolean' && typeof rightValue === 'boolean') {
    return Number(leftValue) - Number(rightValue);
  }
  return String(leftValue).localeCompare(String(rightValue), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  mobileEditLabel,
  emptyMessage = 'No data found',
}: DataTableProps<T>) {
  const sortSelectId = useId();
  const [sort, setSort] = useState<{ key: string | null; direction: SortDirection }>(() => ({
    key: getDefaultSortKey(data),
    direction: 'desc',
  }));

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-600">
        {emptyMessage}
      </div>
    );
  }

  const sortableData = sort.key
    ? [...data].sort((a, b) => {
        const left = (a as T & Record<string, unknown>)[sort.key!];
        const right = (b as T & Record<string, unknown>)[sort.key!];
        const leftValue = getSortValue(left);
        const rightValue = getSortValue(right);
        if (leftValue === null || rightValue === null) {
          if (leftValue === null && rightValue === null) return 0;
          return leftValue === null ? 1 : -1;
        }
        const result = compareSortValues(left, right, sort.key!);
        return sort.direction === 'asc' ? result : -result;
      })
    : data;

  const handleSort = (key: string) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortableColumns = columns.filter((column) =>
    data.some((row) => Object.prototype.hasOwnProperty.call(row, column.key))
  );

  return (
    <>
      <div className="space-y-3 md:hidden">
        {sortableColumns.length > 0 && (
          <div className="flex items-center justify-end gap-2">
            <label htmlFor={sortSelectId} className="text-xs text-gray-500 dark:text-gray-400">
              Sort
            </label>
            <select
              id={sortSelectId}
              value={sort.key ?? ''}
              onChange={(event) => setSort({ key: event.target.value || null, direction: 'desc' })}
              className="max-w-[65%] rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              {sortableColumns.map((column) => (
                <option key={column.key} value={column.key}>{column.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSort((current) => ({ ...current, direction: current.direction === 'asc' ? 'desc' : 'asc' }))}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300"
              aria-label={`Sort ${sort.direction === 'asc' ? 'descending' : 'ascending'}`}
              title={`Sort ${sort.direction === 'asc' ? 'descending' : 'ascending'}`}
            >
              {sort.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </button>
          </div>
        )}
        {sortableData.map((row) => (
          <div
            key={row.id}
            onClick={() => onRowClick?.(row)}
            className={cn(
              'rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm shadow-slate-200/40 transition-all dark:border-gray-700 dark:from-gray-800 dark:to-gray-800/80 dark:shadow-black/10',
              onRowClick && 'cursor-pointer hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md active:translate-y-0 dark:hover:border-blue-800'
            )}
          >
            {columns.map((col, index) => {
              const value = col.render
                ? col.render(row)
                : (row as Record<string, unknown>)[col.key] as React.ReactNode;
              if (index === 0) {
                return (
                  <div key={col.key} className="mb-3 flex min-w-0 items-center justify-between gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                    <span className="min-w-0">{value}</span>
                    {mobileEditLabel && (
                      <span
                        title={mobileEditLabel}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">{mobileEditLabel}</span>
                      </span>
                    )}
                  </div>
                );
              }
              return (
                <div
                  key={col.key}
                  className="flex min-w-0 items-start justify-between gap-3 border-t border-gray-100 py-2 text-sm last:pb-0 dark:border-gray-700"
                >
                  <span className="shrink-0 text-gray-500 dark:text-gray-400">{col.label}</span>
                  <span className="min-w-0 break-words text-right text-gray-900 dark:text-gray-100">{value}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
            {columns.map((col) => {
              const isSortable = data.some((row) =>
                Object.prototype.hasOwnProperty.call(row, col.key)
              );
              const isSorted = sort.key === col.key;
              return (
                <th
                  key={col.key}
                  aria-sort={isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                  className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400"
                >
                  {isSortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-1 text-left hover:text-gray-900 dark:hover:text-gray-100"
                    >
                      {col.label}
                      {isSorted ? (
                        sort.direction === 'asc'
                          ? <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                          : <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
                      )}
                    </button>
                  ) : col.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortableData.map((row) => (
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
    </>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-xl bg-white p-4 shadow-xl dark:bg-gray-800 sm:max-h-[calc(100dvh-2rem)] sm:p-6', maxWidthClass)}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
          <h3 className="min-w-0 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain pb-1">{children}</div>
      </div>
    </div>
  );
}

type EditableLineItem = {
  itemName: string;
  quantity: number;
  rate: number;
  total: number;
  rentalDays?: number;
  startDate?: string;
  endDate?: string;
};

interface LineItemsEditorProps {
  items: EditableLineItem[];
  onChange: (items: EditableLineItem[]) => void;
  defaultEventDate?: string;
}

interface SortableLineItemRowProps {
  rowId: string;
  children: React.ReactNode;
}

function SortableLineItemRow({ rowId, children }: SortableLineItemRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: rowId,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'rounded-lg border border-gray-200 p-3 dark:border-gray-700',
        isDragging && 'cursor-grabbing opacity-80 shadow-lg'
      )}
    >
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="inline-flex cursor-grab items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 active:cursor-grabbing dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          aria-label="Drag to reorder item"
          title="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
          Move
        </button>
      </div>
      {children}
    </div>
  );
}

export function LineItemsEditor({ items, onChange, defaultEventDate }: LineItemsEditorProps) {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const inventoryListId = useId();
  const [customDateEnabled, setCustomDateEnabled] = useState<Record<string, boolean>>({});
  const [numberDrafts, setNumberDrafts] = useState<Record<string, string>>({});
  const [rentalDaysDrafts, setRentalDaysDrafts] = useState<Record<string, string>>({});
  const [rowIds, setRowIds] = useState<string[]>(() => items.map(() => crypto.randomUUID()));
  const [isMultiDayEnabled, setIsMultiDayEnabled] = useState(() => items.some((item) => (item.rentalDays ?? 1) > 1));
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  useEffect(() => {
    let active = true;
    getInventoryItems()
      .then((loadedItems) => {
        if (active) setInventoryItems(loadedItems);
      })
      .catch((error: unknown) => {
        console.error('Failed to load inventory suggestions', error);
        toast.error('Failed to load inventory item suggestions');
      });
    return () => {
      active = false;
    };
  }, []);

  const getDaysFromDates = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
    const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  };

  const recalc = (item: EditableLineItem, multiDayEnabled = isMultiDayEnabled): EditableLineItem => {
    const rentalDays = multiDayEnabled
      ? Math.max(1, item.rentalDays ?? getDaysFromDates(item.startDate, item.endDate))
      : 1;
    return {
      ...item,
      rentalDays,
      total: Number(item.quantity) * Number(item.rate) * rentalDays,
    };
  };

  const setMultiDayMode = (enabled: boolean) => {
    setIsMultiDayEnabled(enabled);
    setRentalDaysDrafts({});
    onChange(items.map((item) => recalc(item, enabled)));
  };

  const addItem = () => {
    setRowIds((prev) => [...prev, crypto.randomUUID()]);
    onChange([
      ...items,
      recalc({ itemName: '', quantity: 1, rate: 0, rentalDays: 1, startDate: '', endDate: '', total: 0 }),
    ]);
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value } as (typeof items)[number];

    if (field === 'startDate' || field === 'endDate') {
      const startDate = field === 'startDate' ? String(value) : item.startDate;
      const endDate = field === 'endDate' ? String(value) : item.endDate;
      item.rentalDays = isMultiDayEnabled ? getDaysFromDates(startDate, endDate) : 1;
    }

    if (field === 'rentalDays') {
      item.rentalDays = isMultiDayEnabled ? Math.max(1, Number(value) || 1) : 1;
    }

    updated[index] = recalc(item);
    onChange(updated);
  };

  const removeItem = (index: number) => {
    const rowId = rowIds[index];
    if (rowId) {
      setCustomDateEnabled((prev) => {
        if (!(rowId in prev)) return prev;
        const next = { ...prev };
        delete next[rowId];
        return next;
      });
      setRentalDaysDrafts((prev) => {
        if (!(rowId in prev)) return prev;
        const next = { ...prev };
        delete next[rowId];
        return next;
      });
      setNumberDrafts((prev) => {
        const next = { ...prev };
        delete next[`${rowId}:quantity`];
        delete next[`${rowId}:rate`];
        return next;
      });
    }
    setRowIds((prev) => prev.filter((_, i) => i !== index));
    onChange(items.filter((_, i) => i !== index));
  };

  const isCustomDatesEnabled = (rowId: string, item: (typeof items)[number]) =>
    customDateEnabled[rowId] ?? Boolean(item.startDate || item.endDate);

  const toggleCustomDates = (rowId: string, index: number, enabled: boolean) => {
    setCustomDateEnabled((prev) => ({ ...prev, [rowId]: enabled }));
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

  const rowData = items.map((item, index) => ({ item, index, rowId: rowIds[index] ?? `pending-${index}` }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = rowIds.indexOf(String(active.id));
    const newIndex = rowIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    setRowIds((prev) => arrayMove(prev, oldIndex, newIndex));
    onChange(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
        <span className="text-gray-600 dark:text-gray-300">Rental duration</span>
        <label className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
          <input
            type="radio"
            name="rental-duration-mode"
            checked={!isMultiDayEnabled}
            onChange={() => setMultiDayMode(false)}
            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Single day (default)
        </label>
        <label className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
          <input
            type="radio"
            name="rental-duration-mode"
            checked={isMultiDayEnabled}
            onChange={() => setMultiDayMode(true)}
            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Multiple days
        </label>
      </div>

      <div
        className={cn(
          'hidden gap-2 px-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 md:grid',
          isMultiDayEnabled
            ? 'md:grid-cols-[minmax(180px,1fr)_minmax(90px,110px)_minmax(90px,110px)_minmax(90px,110px)_auto]'
            : 'md:grid-cols-[minmax(220px,1fr)_minmax(90px,110px)_minmax(90px,110px)_auto]'
        )}
      >
        <span>Item</span>
        <span>Qty</span>
        <span>Rate</span>
        {isMultiDayEnabled && <span>Days</span>}
        <span className="text-right">Total</span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rowData.map(({ rowId }) => rowId)} strategy={verticalListSortingStrategy}>
          {rowData.map(({ item, index, rowId }) => (
            <SortableLineItemRow key={rowId} rowId={rowId}>
          <div
            className={cn(
              'grid grid-cols-1 gap-2',
              isMultiDayEnabled
                ? 'md:grid-cols-[minmax(180px,1fr)_minmax(90px,110px)_minmax(90px,110px)_minmax(90px,110px)_auto] md:items-end'
                : 'md:grid-cols-[minmax(220px,1fr)_minmax(90px,110px)_minmax(90px,110px)_auto] md:items-end'
            )}
          >
            <div>
              <input
                placeholder="Item name"
                value={item.itemName}
                list={inventoryListId}
                onChange={(e) => {
                  const match = inventoryItems.find((inventoryItem) =>
                    inventoryItem.name.toLocaleLowerCase() === e.target.value.trim().toLocaleLowerCase()
                  );
                  const updated = [...items];
                  updated[index] = recalc({
                    ...updated[index],
                    itemName: e.target.value,
                    ...(match?.rate !== undefined ? { rate: match.rate } : {}),
                  });
                  onChange(updated);
                }}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
              />
              <datalist id={inventoryListId}>
                {inventoryItems.map((inventoryItem) => (
                  <option key={inventoryItem.id} value={inventoryItem.name} />
                ))}
              </datalist>
            </div>
            <div>
              <input
                type="number"
                placeholder="Qty"
                value={numberDrafts[`${rowId}:quantity`] ?? item.quantity}
                onChange={(e) => {
                  const value = e.target.value;
                  setNumberDrafts((prev) => ({ ...prev, [`${rowId}:quantity`]: value }));
                  updateItem(index, 'quantity', Number(value) || 0);
                }}
                onBlur={() => {
                  const key = `${rowId}:quantity`;
                  if (numberDrafts[key] === '') return;
                  setNumberDrafts((prev) => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                  });
                }}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
            <div>
              <input
                type="number"
                placeholder="Rate"
                value={numberDrafts[`${rowId}:rate`] ?? item.rate}
                onChange={(e) => {
                  const value = e.target.value;
                  setNumberDrafts((prev) => ({ ...prev, [`${rowId}:rate`]: value }));
                  updateItem(index, 'rate', Number(value) || 0);
                }}
                onBlur={() => {
                  const key = `${rowId}:rate`;
                  if (numberDrafts[key] === '') return;
                  setNumberDrafts((prev) => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                  });
                }}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
            {isMultiDayEnabled && (
              <div>
                <input
                  type="number"
                  min={1}
                  placeholder="Days"
                  value={rentalDaysDrafts[rowId] ?? item.rentalDays ?? 1}
                  onChange={(e) => {
                    const value = e.target.value;
                    setRentalDaysDrafts((prev) => ({ ...prev, [rowId]: value }));
                    if (value !== '' && Number.isFinite(Number(value))) {
                      updateItem(index, 'rentalDays', Number(value));
                    }
                  }}
                  onBlur={() => {
                    const draft = rentalDaysDrafts[rowId];
                    if (draft === undefined) return;
                    updateItem(index, 'rentalDays', Math.max(1, Number(draft) || 1));
                    setRentalDaysDrafts((prev) => {
                      const next = { ...prev };
                      delete next[rowId];
                      return next;
                    });
                  }}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
            )}
            <div className="py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-right">
              ₹{item.total}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-gray-600 sm:min-w-[170px] dark:text-gray-300">
              <input
                type="checkbox"
                checked={isCustomDatesEnabled(rowId, item)}
                onChange={(e) => toggleCustomDates(rowId, index, e.target.checked)}
                className="h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Custom item dates
            </label>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="shrink-0 text-sm text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>

          {isCustomDatesEnabled(rowId, item) ? (
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <DatePicker
                value={item.startDate ?? ''}
                onChange={(value) => updateItem(index, 'startDate', value)}
                label="From date"
              />
              <DatePicker
                value={item.endDate ?? ''}
                onChange={(value) => updateItem(index, 'endDate', value)}
                label="To date"
              />
            </div>
          ) : (
            <p className="mt-2 text-xs text-gray-500">
              Using event date as default item date.
            </p>
          )}
            </SortableLineItemRow>
          ))}
        </SortableContext>
      </DndContext>
      <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:text-blue-700">
        + Add Item
      </button>
    </div>
  );
}
