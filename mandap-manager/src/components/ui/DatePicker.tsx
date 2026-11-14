import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { enUS } from 'react-day-picker/locale/en-US';
import { gu } from 'react-day-picker/locale/gu';
import 'react-day-picker/style.css';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/utils/cn';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

function parseIsoDate(value?: string): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : undefined;
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DatePicker({
  value,
  onChange,
  label,
  min,
  max,
  required,
  disabled,
  className,
}: DatePickerProps) {
  const { t, locale } = useTranslation();
  const selectedDate = parseIsoDate(value);
  const minDate = parseIsoDate(min);
  const maxDate = parseIsoDate(max);
  const todayDate = new Date();
  const todayAllowed = (!minDate || todayDate >= minDate) && (!maxDate || todayDate <= maxDate);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const formattedValue = selectedDate
    ? new Intl.DateTimeFormat(locale === 'gu' ? 'gu-IN' : 'en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(selectedDate)
    : '';

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className={cn('min-w-0 space-y-1', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
        </label>
      )}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-required={required || undefined}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 w-full items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 shadow-sm transition hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-[#7B1E3A]" aria-hidden="true" />
        <span className={cn('min-w-0 flex-1 truncate', !formattedValue && 'text-gray-400 dark:text-gray-500')}>
          {formattedValue || t('selectDate')}
        </span>
      </button>
      {open && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3 sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={label || t('selectDate')}
            className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl dark:bg-gray-800 sm:p-5"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="min-w-0 truncate text-lg font-semibold text-gray-900 dark:text-gray-100">
                {label || t('selectDate')}
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label={t('close')}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex justify-center overflow-x-auto text-gray-800 dark:text-gray-100">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    onChange(formatIsoDate(date));
                    close();
                  }
                }}
                locale={locale === 'gu' ? gu : enUS}
                numerals={locale === 'gu' ? 'gujr' : 'latn'}
                startMonth={minDate}
                endMonth={maxDate}
                disabled={[
                  ...(minDate ? [{ before: minDate }] : []),
                  ...(maxDate ? [{ after: maxDate }] : []),
                ]}
                style={{
                  '--rdp-accent-color': '#7B1E3A',
                  '--rdp-accent-background-color': '#f8e9ee',
                  '--rdp-day-width': '40px',
                  '--rdp-day-height': '44px',
                } as React.CSSProperties}
              />
            </div>
            <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
              <button
                type="button"
                disabled={!todayAllowed}
                onClick={() => {
                  onChange(formatIsoDate(todayDate));
                  close();
                }}
                className="min-h-10 rounded-lg px-3 text-sm font-semibold text-[#7B1E3A] hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-rose-950/30"
              >
                {t('today')}
              </button>
              {!required && value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    close();
                  }}
                  className="min-h-10 rounded-lg px-3 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {t('clearDate')}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
