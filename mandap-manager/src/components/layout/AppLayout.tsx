import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  CalendarDays,
  Package,
  Users,
  Truck,
  Receipt,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Globe,
  Briefcase,
  UserCircle,
  IndianRupee,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation, setLocale } from '@/lib/i18n';
import { cn } from '@/utils/cn';

const adminNav = [
  { to: '/', icon: LayoutDashboard, labelKey: 'dashboard' as const },
  { to: '/inquiries', icon: MessageSquare, labelKey: 'inquiries' as const },
  { to: '/bookings', icon: Briefcase, labelKey: 'bookings' as const },
  { to: '/calendar', icon: CalendarDays, labelKey: 'calendar' as const },
  { to: '/customers', icon: UserCircle, labelKey: 'customers' as const },
  { to: '/labor', icon: Users, labelKey: 'labor' as const },
  { to: '/inventory', icon: Package, labelKey: 'inventory' as const },
  { to: '/invoices', icon: FileText, labelKey: 'invoices' as const },
  { to: '/payments', icon: IndianRupee, labelKey: 'payments' as const },
  { to: '/vendors', icon: Truck, labelKey: 'vendors' as const },
  { to: '/expenses', icon: Receipt, labelKey: 'expenses' as const },
  { to: '/reports', icon: BarChart3, labelKey: 'reports' as const },
  { to: '/settings', icon: Settings, labelKey: 'settings' as const },
];

const workerNav = [
  { to: '/my-jobs', icon: Briefcase, labelKey: 'myJobs' as const },
];

const mobileTabs = [
  { to: '/', icon: LayoutDashboard, labelKey: 'dashboard' as const },
  { to: '/bookings', icon: Briefcase, labelKey: 'bookings' as const },
  { to: '/calendar', icon: CalendarDays, labelKey: 'calendar' as const },
  { to: '/more', icon: Menu, labelKey: 'more' as const },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = user?.role === 'worker' ? workerNav : adminNav;

  const toggleLanguage = () => {
    setLocale(locale === 'en' ? 'gu' : 'en');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop Sidebar */}
      <aside className="hidden print:hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white lg:dark:border-gray-700 lg:dark:bg-gray-800">
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-4 dark:border-gray-700">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-bold">
            M
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{t('appName')}</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-3 dark:border-gray-700">
          <p className="mb-2 truncate text-xs text-gray-500">{user?.displayName}</p>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <LogOut className="h-4 w-4" />
            {t('logout')}
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 shadow-xl">
            <div className="flex h-16 items-center justify-between border-b px-4 dark:border-gray-700">
              <span className="font-semibold">{t('appName')}</span>
              <button onClick={() => setSidebarOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <nav className="p-3 space-y-1">
              {navItems.map(({ to, icon: Icon, labelKey }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {t(labelKey)}
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800 lg:px-6 print:hidden">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              title={t('language')}
            >
              <Globe className="h-4 w-4" />
              {locale.toUpperCase()}
            </button>
            <button
              onClick={toggleTheme}
              className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6 print:overflow-visible print:p-0">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        {user?.role !== 'worker' && (
          <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 lg:hidden print:hidden">
            {mobileTabs.map(({ to, icon: Icon, labelKey }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs',
                    isActive ? 'text-blue-600' : 'text-gray-500'
                  )
                }
              >
                <Icon className="h-5 w-5" />
                {t(labelKey)}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
