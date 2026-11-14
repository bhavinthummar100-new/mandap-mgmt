import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { InquiriesPage } from '@/features/inquiries/InquiriesPage';
import { NewInquiryPage } from '@/features/inquiries/NewInquiryPage';
import { InquiryDetailPage } from '@/features/inquiries/InquiryDetailPage';
import { EstimateDetailPage } from '@/features/inquiries/EstimateDetailPage';
import { BookingsPage } from '@/features/bookings/BookingsPage';
import { NewBookingPage } from '@/features/bookings/NewBookingPage';
import { BookingDetailPage } from '@/features/bookings/BookingDetailPage';
import { JobSheetPage } from '@/features/bookings/JobSheetPage';
import { MyJobsPage } from '@/features/bookings/MyJobsPage';
import { InventoryPage } from '@/features/inventory/InventoryPage';
import { LaborPage } from '@/features/labor/LaborPage';
import { VendorsPage } from '@/features/vendors/VendorsPage';
import { ExpensesPage } from '@/features/expenses/ExpensesPage';
import { PaymentsPage } from '@/features/payments/PaymentsPage';
import { InvoicesPage, NewInvoicePage } from '@/features/invoices/InvoicesPage';
import { CustomersPage } from '@/features/customers/CustomersPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { MorePage } from '@/features/settings/MorePage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute roles={['admin', 'manager']}>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      { path: 'inquiries', element: <ProtectedRoute roles={['admin', 'manager']}><InquiriesPage /></ProtectedRoute> },
      { path: 'inquiries/new', element: <ProtectedRoute roles={['admin', 'manager']}><NewInquiryPage /></ProtectedRoute> },
      { path: 'inquiries/:id', element: <ProtectedRoute roles={['admin', 'manager']}><InquiryDetailPage /></ProtectedRoute> },
      { path: 'estimates/:id', element: <ProtectedRoute roles={['admin', 'manager']}><EstimateDetailPage /></ProtectedRoute> },
      { path: 'bookings', element: <ProtectedRoute roles={['admin', 'manager']}><BookingsPage /></ProtectedRoute> },
      { path: 'bookings/new', element: <ProtectedRoute roles={['admin', 'manager']}><NewBookingPage /></ProtectedRoute> },
      { path: 'bookings/:id', element: <ProtectedRoute roles={['admin', 'manager', 'worker']}><BookingDetailPage /></ProtectedRoute> },
      { path: 'bookings/:id/job-sheet', element: <ProtectedRoute roles={['admin', 'manager', 'worker']}><JobSheetPage /></ProtectedRoute> },
      { path: 'calendar', element: <ProtectedRoute roles={['admin', 'manager']}><CalendarPage /></ProtectedRoute> },
      { path: 'inventory', element: <ProtectedRoute roles={['admin', 'manager']}><InventoryPage /></ProtectedRoute> },
      { path: 'labor', element: <ProtectedRoute roles={['admin', 'manager']}><LaborPage /></ProtectedRoute> },
      { path: 'vendors', element: <ProtectedRoute roles={['admin', 'manager']}><VendorsPage /></ProtectedRoute> },
      { path: 'expenses', element: <ProtectedRoute roles={['admin', 'manager']}><ExpensesPage /></ProtectedRoute> },
      { path: 'payments', element: <ProtectedRoute roles={['admin', 'manager']}><PaymentsPage /></ProtectedRoute> },
      { path: 'invoices', element: <ProtectedRoute roles={['admin', 'manager']}><InvoicesPage /></ProtectedRoute> },
      { path: 'invoices/new/:bookingId', element: <ProtectedRoute roles={['admin', 'manager']}><NewInvoicePage /></ProtectedRoute> },
      { path: 'customers', element: <ProtectedRoute roles={['admin', 'manager']}><CustomersPage /></ProtectedRoute> },
      { path: 'reports', element: <ProtectedRoute roles={['admin', 'manager']}><ReportsPage /></ProtectedRoute> },
      { path: 'settings', element: <ProtectedRoute roles={['admin']}><SettingsPage /></ProtectedRoute> },
      { path: 'more', element: <ProtectedRoute roles={['admin', 'manager']}><MorePage /></ProtectedRoute> },
      { path: 'my-jobs', element: <ProtectedRoute roles={['worker']}><MyJobsPage /></ProtectedRoute> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
