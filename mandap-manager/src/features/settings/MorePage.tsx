import { NavLink } from 'react-router-dom';
import {
  MessageSquare, Package, Users, Truck, Receipt, FileText,
  UserCircle, BarChart3, Settings,
} from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/utils/cn';

const moreLinks = [
  { to: '/inquiries', icon: MessageSquare, labelKey: 'inquiries' as const },
  { to: '/inventory', icon: Package, labelKey: 'inventory' as const },
  { to: '/labor', icon: Users, labelKey: 'labor' as const },
  { to: '/vendors', icon: Truck, labelKey: 'vendors' as const },
  { to: '/expenses', icon: Receipt, labelKey: 'expenses' as const },
  { to: '/invoices', icon: FileText, labelKey: 'invoices' as const },
  { to: '/customers', icon: UserCircle, labelKey: 'customers' as const },
  { to: '/reports', icon: BarChart3, labelKey: 'reports' as const },
  { to: '/settings', icon: Settings, labelKey: 'settings' as const },
];

export function MorePage() {
  const { t } = useTranslation();

  return (
    <div>
      <PageHeader title={t('more')} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {moreLinks.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors',
                isActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
              )
            }
          >
            <Icon className="h-6 w-6 text-blue-600" />
            <span className="text-xs font-medium">{t(labelKey)}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
