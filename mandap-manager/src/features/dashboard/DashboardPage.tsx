import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, IndianRupee, AlertTriangle, Users, Truck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { LoadingSkeleton, PageHeader, MetricCard } from '@/components/shared';
import { CustomerAvatar } from '@/components/shared/CustomerAvatar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getDashboardStats } from '@/services/reportService';
import { getCustomers } from '@/services/customerService';
import { formatCurrency, formatDate } from '@/utils/calculations';
import { useTranslation } from '@/lib/i18n';
import type { DashboardStats } from '@/types';

const PIE_COLORS = ['#3B82F6', '#22C55E', '#F97316', '#8B5CF6', '#6B7280', '#EF4444', '#14B8A6'];

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [customerPhotos, setCustomerPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .finally(() => setLoading(false));
    getCustomers()
      .then((customers) => setCustomerPhotos(Object.fromEntries(customers.flatMap((customer) =>
        customer.photoUrl ? [[customer.id, customer.photoUrl]] : []
      ))))
      .catch((error: unknown) => console.error('Failed to load customer photos', error));
  }, []);

  if (loading) {
    return <LoadingSkeleton rows={6} />;
  }

  if (!stats) return null;

  const pieData = Object.entries(stats.bookingsByStatus).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <PageHeader title={t('dashboard')} subtitle={t('welcome')} />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard title={t('todayEvents')} value={stats.todayEvents.length} icon={<Calendar className="h-5 w-5" />} />
        <MetricCard title={t('upcomingEvents')} value={stats.upcomingEvents.length} icon={<Calendar className="h-5 w-5" />} />
        <MetricCard title={t('monthlyRevenue')} value={formatCurrency(stats.monthlyRevenue)} icon={<IndianRupee className="h-5 w-5" />} />
        <MetricCard title={t('pendingPayments')} value={formatCurrency(stats.pendingPayments)} icon={<IndianRupee className="h-5 w-5" />} />
        <MetricCard title={t('laborPaymentsPending')} value={formatCurrency(stats.laborPaymentsPending)} icon={<Users className="h-5 w-5" />} />
        <MetricCard title={t('vendorPaymentsPending')} value={formatCurrency(stats.vendorPaymentsPending)} icon={<Truck className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t('monthlyRevenue')}</CardTitle></CardHeader>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.monthlyRevenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader><CardTitle>Bookings by Status</CardTitle></CardHeader>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('todayEvents')}</CardTitle></CardHeader>
          {stats.todayEvents.length === 0 ? (
            <p className="text-sm text-gray-500">{t('noData')}</p>
          ) : (
            <div className="space-y-2">
              {stats.todayEvents.map((b) => (
                <div key={b.id} onClick={() => navigate(`/bookings/${b.id}`)} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-gradient-to-r from-white to-blue-50/50 p-3 transition hover:border-blue-200 hover:shadow-md dark:border-gray-700 dark:from-gray-800 dark:to-blue-950/20 sm:flex-row">
                  <div className="flex min-w-0 items-center gap-3">
                    <CustomerAvatar name={b.customerName} photoUrl={b.customerId ? customerPhotos[b.customerId] : undefined} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{b.customerName}</p>
                      <p className="truncate text-xs text-gray-500">{b.eventAddress}</p>
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('inventoryAlerts')}</CardTitle></CardHeader>
          {stats.inventoryAlerts.length === 0 ? (
            <p className="text-sm text-green-600">All stock levels OK</p>
          ) : (
            <div className="space-y-2">
              {stats.inventoryAlerts.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-900/20">
                  <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-orange-600">Available: {item.availableStock} / {item.totalStock}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{t('upcomingEvents')}</CardTitle></CardHeader>
          {stats.upcomingEvents.slice(0, 5).map((b) => (
            <div key={b.id} onClick={() => navigate(`/bookings/${b.id}`)} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-transparent p-3 transition hover:border-blue-100 hover:bg-blue-50/60 dark:hover:border-blue-900 dark:hover:bg-blue-950/20 sm:flex-row">
              <div className="flex min-w-0 items-center gap-3">
                <CustomerAvatar name={b.customerName} photoUrl={b.customerId ? customerPhotos[b.customerId] : undefined} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{b.customerName}</p>
                  <p className="text-xs text-gray-500">{formatDate(b.eventDate)} · {b.bookingNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{formatCurrency(b.grandTotal)}</span>
                <StatusBadge status={b.status} />
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
