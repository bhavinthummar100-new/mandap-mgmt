import { cn } from '@/utils/cn';

const statusColors: Record<string, string> = {
  Inquiry: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  'Estimate Sent': 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200',
  Approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  'Advance Received': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  'Material Dispatched': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  'Event Completed': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  'Payment Completed': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  pending: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  new: 'bg-sky-100 text-sky-700',
  New: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  'Follow-up': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  Converted: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Lost: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        statusColors[status] ?? 'bg-gray-100 text-gray-700',
        className
      )}
    >
      {status}
    </span>
  );
}
