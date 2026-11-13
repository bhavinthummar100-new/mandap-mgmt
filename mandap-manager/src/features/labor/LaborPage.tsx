import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, MessageCircle, Plus, Printer, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { DataTable, Modal, PageHeader } from '@/components/shared';
import { PhotoPicker } from '@/components/shared/PhotoPicker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { getLaborers, getLaborAssignments, createLaborer, updateLaborer } from '@/services/laborService';
import { getBookings } from '@/services/bookingService';
import {
  createLaborAdjustment,
  createLaborLeave,
  createSalaryPayment,
  getLaborPayrollData,
  saveAttendance,
} from '@/services/laborPayrollService';
import { formatDate, formatCurrency } from '@/utils/calculations';
import {
  buildLaborSalarySlip,
  calculateLaborMonthlySummary,
  formatPayrollAmount,
  isLaborOnLeave,
  type LaborPayrollData,
  type LaborMonthlySummary,
} from '@/utils/laborPayroll';
import { isValidEventDate } from '@/utils/eventDate';
import { openWhatsApp } from '@/utils/whatsapp';
import { normalizeIndianPhoneNumber } from '@/utils/phone';
import { useTranslation, getLocale } from '@/lib/i18n';
import { useAsyncActionGuard } from '@/hooks/useAsyncActionGuard';
import type {
  Booking,
  LaborAdjustmentType,
  LaborAssignment,
  Laborer,
} from '@/types';

type LaborJobRow = LaborAssignment & Pick<Booking, 'bookingNumber' | 'customerName' | 'eventDate'>;
type AttendanceChoice = 'present' | 'half' | 'absent' | 'pending';

const emptyPayroll: LaborPayrollData = {
  attendance: [],
  leaves: [],
  adjustments: [],
  salaryPayments: [],
};

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthDates(month: string): string[] {
  if (!/^\d{4}-\d{2}$/.test(month)) return [];
  const [year, monthNumber] = month.split('-').map(Number);
  if (monthNumber < 1 || monthNumber > 12) return [];
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from({ length: lastDay }, (_, index) =>
    `${month}-${String(index + 1).padStart(2, '0')}`
  );
}

function monthEndDate(month: string): string {
  const dates = monthDates(month);
  return dates[dates.length - 1] ?? `${month}-31`;
}

function todayIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function LaborPage() {
  const [laborers, setLaborers] = useState<Laborer[]>([]);
  const [laborJobs, setLaborJobs] = useState<LaborJobRow[]>([]);
  const [payroll, setPayroll] = useState<LaborPayrollData>(emptyPayroll);
  const [loading, setLoading] = useState(true);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [editItem, setEditItem] = useState<Laborer | null>(null);
  const [selectedLaborId, setSelectedLaborId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [paymentTarget, setPaymentTarget] = useState<{ laborer: Laborer; summary: LaborMonthlySummary } | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    photoUrl: '',
    role: '',
    dailyWage: 0,
    extraPayment: 0,
    advanceGiven: 0,
    isActive: true,
  });
  const [leaveForm, setLeaveForm] = useState({ fromDate: todayIsoDate(), toDate: todayIsoDate(), reason: '' });
  const [adjustmentForm, setAdjustmentForm] = useState<{
    type: LaborAdjustmentType;
    date: string;
    amount: number;
    note: string;
  }>({ type: 'extra', date: todayIsoDate(), amount: 0, note: '' });
  const [salaryForm, setSalaryForm] = useState({ amountPaid: 0, paidOn: todayIsoDate(), note: '' });
  const [savingAction, setSavingAction] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { runGuarded, isRunning } = useAsyncActionGuard();

  const load = async () => {
    const [loadedLaborers, assignments, bookings] = await Promise.all([
      getLaborers(),
      getLaborAssignments(),
      getBookings(),
    ]);
    setLaborers(loadedLaborers);
    const bookingsById = new Map(bookings.map((booking) => [booking.id, booking]));
    setLaborJobs(
      assignments.flatMap((assignment) => {
        const booking = bookingsById.get(assignment.bookingId);
        return booking
          ? [{
              ...assignment,
              bookingNumber: booking.bookingNumber,
              customerName: booking.customerName,
              eventDate: booking.eventDate,
            }]
          : [];
      })
    );
  };

  useEffect(() => {
    let active = true;
    Promise.all([getLaborers(), getLaborAssignments(), getBookings()])
      .then(([loadedLaborers, assignments, bookings]) => {
        if (!active) return;
        setLaborers(loadedLaborers);
        const bookingsById = new Map(bookings.map((booking) => [booking.id, booking]));
        setLaborJobs(
          assignments.flatMap((assignment) => {
            const booking = bookingsById.get(assignment.bookingId);
            return booking
              ? [{
                  ...assignment,
                  bookingNumber: booking.bookingNumber,
                  customerName: booking.customerName,
                  eventDate: booking.eventDate,
                }]
              : [];
          })
        );
      })
      .catch(() => toast.error(t('loadSetupBoysFailed')))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => {
    let active = true;
    getLaborPayrollData(monthEndDate(selectedMonth))
      .then((data) => {
        if (active) setPayroll(data);
      })
      .catch((error: unknown) => {
        console.error('Failed to load monthly Setup Boy payroll data', error);
        const detail = error instanceof Error ? error.message : String(error);
        toast.error(`${t('loadPayrollFailed')}: ${detail}`);
      })
      .finally(() => {
        if (active) setPayrollLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedMonth, t]);

  const activeLaborer = laborers.find((laborer) => laborer.id === selectedLaborId)
    ?? laborers.find((laborer) => laborer.isActive)
    ?? laborers[0];
  const activeLaborerLeaves = payroll.leaves.filter(
    (leave) => leave.laborId === activeLaborer?.id
      && leave.fromDate <= monthEndDate(selectedMonth)
      && leave.toDate >= `${selectedMonth}-01`
  );
  const dates = useMemo(() => monthDates(selectedMonth), [selectedMonth]);
  const summaries = useMemo(
    () => laborers.map((laborer) => ({
      laborer,
      summary: calculateLaborMonthlySummary(laborer.id, selectedMonth, payroll),
    })),
    [laborers, payroll, selectedMonth]
  );

  const refreshPayroll = async () => {
    setPayroll(await getLaborPayrollData(monthEndDate(selectedMonth)));
  };

  const handleSave = async () => {
    await runGuarded(async () => {
      try {
        if (editItem) {
          await updateLaborer(editItem.id, {
            ...form,
            photoUrl: photoRemoved ? '' : form.photoUrl,
          }, photoFile);
        } else {
          await createLaborer({
            ...form,
            photoUrl: photoRemoved ? '' : form.photoUrl,
          }, photoFile);
        }
        toast.success(t('save'));
        setShowModal(false);
        setPhotoFile(null);
        setPhotoRemoved(false);
        await load();
      } catch (error) {
        console.error('Failed to save Setup Boy', error);
        const detail = error instanceof Error ? error.message : String(error);
        toast.error(`${t('saveSetupBoyFailed')}: ${detail}`);
      }
    }, 'saveLaborer');
  };

  const handleAttendance = async (date: string, status: AttendanceChoice) => {
    if (!activeLaborer) return;
    if (isLaborOnLeave(activeLaborer.id, date, payroll.leaves)) {
      toast.error(t('attendanceBlockedByLeave'));
      return;
    }
    const assignment = laborJobs.find((job) =>
      job.laborerId === activeLaborer.id && job.eventDate === date
    );
    try {
      await saveAttendance(activeLaborer, date, status, assignment?.bookingId);
    } catch (error) {
      console.error('Failed to save Setup Boy attendance', error);
      const detail = error instanceof Error ? error.message : String(error);
      toast.error(`${t('saveAttendanceFailed')}: ${detail}`);
      return;
    }

    try {
      await refreshPayroll();
    } catch (error) {
      console.error('Attendance saved, but monthly payroll refresh failed', error);
      const detail = error instanceof Error ? error.message : String(error);
      toast.error(`${t('loadPayrollFailed')}: ${detail}`);
    }
    if (assignment) {
      try {
        await load();
      } catch (error) {
        console.error('Attendance saved, but assigned booking status refresh failed', error);
        toast.error(t('loadSetupBoysFailed'));
      }
    }
  };

  const handleSaveLeave = async () => {
    if (!activeLaborer) return;
    if (!isValidEventDate(leaveForm.fromDate)
      || !isValidEventDate(leaveForm.toDate)
      || leaveForm.fromDate > leaveForm.toDate) {
      toast.error(t('invalidDateRange'));
      return;
    }
    setSavingAction(true);
    try {
      await createLaborLeave({
        laborId: activeLaborer.id,
        fromDate: leaveForm.fromDate,
        toDate: leaveForm.toDate,
        reason: leaveForm.reason.trim(),
      });
      toast.success(t('leaveSaved'));
      setShowLeaveModal(false);
      await refreshPayroll();
    } catch {
      toast.error(t('saveLeaveFailed'));
    } finally {
      setSavingAction(false);
    }
  };

  const handleSaveAdjustment = async () => {
    if (!activeLaborer || !isValidEventDate(adjustmentForm.date) || adjustmentForm.amount <= 0) {
      toast.error(t('invalidAdjustment'));
      return;
    }
    setSavingAction(true);
    try {
      await createLaborAdjustment({
        laborId: activeLaborer.id,
        type: adjustmentForm.type,
        date: adjustmentForm.date,
        amount: adjustmentForm.amount,
        note: adjustmentForm.note.trim(),
      });
      toast.success(t('adjustmentSaved'));
      setShowAdjustmentModal(false);
      setAdjustmentForm({ ...adjustmentForm, amount: 0, note: '' });
      await refreshPayroll();
    } catch {
      toast.error(t('saveAdjustmentFailed'));
    } finally {
      setSavingAction(false);
    }
  };

  const openSalaryPayment = (laborer: Laborer, summary: LaborMonthlySummary) => {
    setPaymentTarget({ laborer, summary });
    setSalaryForm({
      amountPaid: Math.max(0, summary.payable - summary.paid),
      paidOn: todayIsoDate(),
      note: '',
    });
    setShowSalaryModal(true);
  };

  const handleSaveSalaryPayment = async () => {
    if (!paymentTarget || salaryForm.amountPaid <= 0 || !isValidEventDate(salaryForm.paidOn)) {
      toast.error(t('invalidSalaryPayment'));
      return;
    }
    if (salaryForm.amountPaid > paymentTarget.summary.payable - paymentTarget.summary.paid) {
      toast.error(t('salaryPaymentOverRemaining'));
      return;
    }
    setSavingAction(true);
    try {
      await createSalaryPayment({
        laborId: paymentTarget.laborer.id,
        month: paymentTarget.summary.month,
        amountPaid: salaryForm.amountPaid,
        paidOn: salaryForm.paidOn,
        note: salaryForm.note.trim(),
      });
      toast.success(t('salaryPaymentSaved'));
      setShowSalaryModal(false);
      setPaymentTarget(null);
      await refreshPayroll();
    } catch {
      toast.error(t('saveSalaryPaymentFailed'));
    } finally {
      setSavingAction(false);
    }
  };

  const shareSalarySlip = (laborer: Laborer, summary: LaborMonthlySummary) => {
    const text = buildLaborSalarySlip(laborer, summary, payroll.attendance, getLocale(), payroll.leaves);
    openWhatsApp(text, laborer.mobile);
  };

  const savingLaborer = isRunning('saveLaborer');
  const attendanceMap = new Map(
    payroll.attendance
      .filter((record) => record.laborId === activeLaborer?.id)
      .map((record) => [record.date, record])
  );
  const statusLabels: Record<AttendanceChoice, string> = {
    present: t('present'),
    half: t('halfDay'),
    absent: t('absent'),
    pending: t('pending'),
  };

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <PageHeader
          title={t('labor')}
          action={(
            <Button onClick={() => {
              setEditItem(null);
              setForm({ name: '', mobile: '', photoUrl: '', role: '', dailyWage: 0, extraPayment: 0, advanceGiven: 0, isActive: true });
              setPhotoFile(null);
              setPhotoRemoved(false);
              setShowModal(true);
            }}>
              <Plus className="h-4 w-4" /> {t('create')}
            </Button>
          )}
        />
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>
      ) : (
        <>
          <Card className="print:hidden">
            <h2 className="mb-3 text-lg font-semibold">{t('setupBoys')}</h2>
            <DataTable
              data={laborers}
              onRowClick={(laborer) => {
                setEditItem(laborer);
                setForm({
                  name: laborer.name,
                  mobile: laborer.mobile,
                  photoUrl: laborer.photoUrl ?? '',
                  role: laborer.role ?? '',
                  dailyWage: laborer.dailyWage,
                  extraPayment: laborer.extraPayment,
                  advanceGiven: laborer.advanceGiven,
                  isActive: laborer.isActive,
                });
                setPhotoFile(null);
                setPhotoRemoved(false);
                setShowModal(true);
              }}
              columns={[
                {
                  key: 'name',
                  label: t('setupBoy'),
                  render: (laborer) => (
                    <span className="flex items-center gap-2">
                      {laborer.photoUrl ? (
                        <img src={laborer.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                          {(laborer.name.trim()[0] || '?').toUpperCase()}
                        </span>
                      )}
                      <span>{laborer.name}</span>
                    </span>
                  ),
                },
                { key: 'mobile', label: t('mobile') },
                { key: 'role', label: t('role'), render: (laborer) => laborer.role || '—' },
                { key: 'dailyWage', label: t('dailyWage'), render: (laborer) => formatPayrollAmount(laborer.dailyWage) },
                { key: 'extraPayment', label: t('legacyExtraPayment'), render: (laborer) => formatCurrency(laborer.extraPayment) },
                { key: 'advanceGiven', label: t('legacyAdvanceGiven'), render: (laborer) => formatCurrency(laborer.advanceGiven) },
                { key: 'isActive', label: t('status'), render: (laborer) => laborer.isActive ? t('active') : t('inactive') },
              ]}
            />
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{t('legacyAdjustmentsNote')}</p>
          </Card>

          <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
            <div className="flex flex-wrap items-end gap-3">
              <Input
                label={t('month')}
                type="month"
                value={selectedMonth}
                onChange={(event) => {
                  setPayrollLoading(true);
                  setSelectedMonth(event.target.value);
                }}
              />
              <Select
                label={t('setupBoy')}
                value={activeLaborer?.id ?? ''}
                onChange={(event) => setSelectedLaborId(event.target.value)}
                options={laborers.map((laborer) => ({ value: laborer.id, label: laborer.name }))}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={!activeLaborer} onClick={() => setShowLeaveModal(true)}>
                {t('markUnavailable')}
              </Button>
              <Button variant="outline" disabled={!activeLaborer} onClick={() => {
                setAdjustmentForm({ type: 'extra', date: `${selectedMonth}-01`, amount: 0, note: '' });
                setShowAdjustmentModal(true);
              }}>
                <Plus className="h-4 w-4" /> {t('addAdjustment')}
              </Button>
              <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> {t('printPdf')}</Button>
            </div>
          </div>

          {activeLaborer && (
            <Card className="print:hidden">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{t('monthlyAttendance')} · {activeLaborer.name}</h2>
                  <p className="text-sm text-gray-500">{selectedMonth}</p>
                </div>
              </div>
              <div className="max-h-[36rem] overflow-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-gray-500 dark:bg-gray-900 dark:text-gray-300">
                    <tr>
                      <th className="p-2">{t('date')}</th>
                      <th className="p-2">{t('attendance')}</th>
                      <th className="p-2">{t('status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {dates.map((date) => {
                      const record = attendanceMap.get(date);
                      const onLeave = isLaborOnLeave(activeLaborer.id, date, payroll.leaves);
                      const currentStatus: AttendanceChoice = onLeave
                        ? 'pending'
                        : record?.status ?? 'pending';
                      const bookingAssignment = laborJobs.find((job) =>
                        job.laborerId === activeLaborer.id && job.eventDate === date
                      );
                      return (
                        <tr key={date}>
                          <td className="whitespace-nowrap p-2 font-medium">{formatDate(date) || '—'}</td>
                          <td className="p-2">
                            {onLeave ? (
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">{t('leave')}</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {(['present', 'half', 'absent'] as const).map((status) => (
                                  <Button
                                    key={status}
                                    size="sm"
                                    variant={currentStatus === status ? 'primary' : 'outline'}
                                    onClick={() => void handleAttendance(date, status)}
                                  >
                                    {statusLabels[status]}
                                  </Button>
                                ))}
                                {record && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    aria-label={t('clearAttendance')}
                                    onClick={() => void handleAttendance(date, 'pending')}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-gray-500">
                            {onLeave
                              ? t('leave')
                              : record
                                ? statusLabels[record.status]
                                : bookingAssignment?.attendance
                                  ? t('present')
                                  : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setLeaveForm({ fromDate: `${selectedMonth}-01`, toDate: monthEndDate(selectedMonth), reason: '' });
                    setShowLeaveModal(true);
                  }}
                >
                  {t('markUnavailable')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => shareSalarySlip(
                    activeLaborer,
                    calculateLaborMonthlySummary(activeLaborer.id, selectedMonth, payroll)
                  )}
                  disabled={!normalizeIndianPhoneNumber(activeLaborer.mobile)}
                >
                  <MessageCircle className="h-4 w-4" /> {t('shareSalarySlip')}
                </Button>
              </div>
            </Card>
          )}

          {activeLaborer && (
            <Card className="print:hidden">
              <h2 className="mb-3 text-lg font-semibold">{t('leaveDays')}</h2>
              {activeLaborerLeaves.length === 0 ? (
                <p className="text-sm text-gray-500">{t('noLeavesThisMonth')}</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {activeLaborerLeaves.map((leave) => (
                    <li key={leave.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                      <span>{formatDate(leave.fromDate) || '—'} – {formatDate(leave.toDate) || '—'}</span>
                      <span>{leave.reason || '—'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <Card className="salary-print-report">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{t('monthEndOverview')}</h2>
                <p className="text-sm text-gray-500">{selectedMonth}</p>
              </div>
              {payrollLoading && <span className="text-sm text-gray-500">{t('loading')}</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <tr>
                    <th className="p-2">{t('setupBoy')}</th>
                    <th className="p-2">{t('days')}</th>
                    <th className="p-2 text-right">{t('totalWage')}</th>
                    <th className="p-2 text-right">{t('extraPayment')}</th>
                    <th className="p-2 text-right">{t('advance')}</th>
                    <th className="p-2 text-right">{t('carryForward')}</th>
                    <th className="p-2 text-right">{t('paid')}</th>
                    <th className="p-2 text-right">{t('payable')}</th>
                    <th className="p-2">{t('status')}</th>
                    <th className="p-2 print:hidden">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {summaries.map(({ laborer, summary }) => (
                    <tr key={laborer.id}>
                      <td className="p-2 font-medium">{laborer.name || '—'}</td>
                      <td className="p-2 whitespace-nowrap">
                        {summary.presentDays} / {summary.halfDays} / {summary.absentDays} / {summary.leaveDays}
                      </td>
                      <td className="p-2 text-right">{formatPayrollAmount(summary.totalWage)}</td>
                      <td className="p-2 text-right">{formatPayrollAmount(summary.extraPayment)}</td>
                      <td className="p-2 text-right">{formatPayrollAmount(summary.advance)}</td>
                      <td className="p-2 text-right">{formatPayrollAmount(summary.advanceCarriedIn)}</td>
                      <td className="p-2 text-right">{formatPayrollAmount(summary.paid)}</td>
                      <td className="p-2 text-right">
                        {summary.advanceCarriedForward > 0
                          ? `${t('advanceCarriedForward')}: ${formatPayrollAmount(summary.advanceCarriedForward)}`
                          : formatPayrollAmount(Math.max(0, summary.payable - summary.paid))}
                      </td>
                      <td className="p-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          summary.paymentStatus === 'paid'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                            : summary.paymentStatus === 'partial'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {t(summary.paymentStatus)}
                        </span>
                      </td>
                      <td className="p-2 print:hidden">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openSalaryPayment(laborer, summary)}
                            disabled={summary.payable <= summary.paid}
                          >
                            {t('markAsPaid')}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => shareSalarySlip(laborer, summary)}>
                            <MessageCircle className="h-4 w-4" /> {t('share')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {summaries.length === 0 && (
                    <tr><td className="p-4 text-center text-gray-500" colSpan={10}>{t('noSetupBoysAssigned')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              {t('summaryDayLegend')}
            </p>
          </Card>

          <Card className="print:hidden">
            <h2 className="mb-3 text-lg font-semibold">{t('assignedJobs')}</h2>
            <DataTable
              data={laborJobs}
              columns={[
                { key: 'bookingNumber', label: 'Booking #' },
                { key: 'laborerName', label: t('setupBoy') },
                { key: 'customerName', label: t('customerName') },
                { key: 'eventDate', label: t('eventDate'), render: (job) => formatDate(job.eventDate) || '—' },
                {
                  key: 'jobSheet',
                  label: t('jobSheet'),
                  render: (job) => (
                    <Button type="button" size="sm" variant="outline" onClick={() => navigate(`/bookings/${job.bookingId}/job-sheet`)}>
                      <ClipboardList className="h-4 w-4" /> {t('viewJobSheet')}
                    </Button>
                  ),
                },
              ]}
            />
          </Card>
        </>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? t('edit') : t('create')}>
        <div className="space-y-4">
          <PhotoPicker
            value={photoRemoved ? '' : form.photoUrl}
            altText={t('setupBoyPhoto')}
            onFileChange={setPhotoFile}
            onRemoveChange={setPhotoRemoved}
          />
          <Input label={t('setupBoy')} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input label={t('mobile')} value={form.mobile} onChange={(event) => setForm({ ...form, mobile: event.target.value })} />
          <Input label={t('role')} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} />
          <Input
            label={t('dailyWage')}
            type="number"
            min={0}
            value={form.dailyWage}
            onChange={(event) => setForm({ ...form, dailyWage: Number(event.target.value) })}
          />
          {editItem && form.dailyWage !== editItem.dailyWage && (
            <p className="text-xs text-blue-600 dark:text-blue-400">{t('newWageFromToday')}</p>
          )}
          <Input label={t('legacyExtraPayment')} type="number" value={form.extraPayment} onChange={(event) => setForm({ ...form, extraPayment: Number(event.target.value) })} />
          <Input label={t('legacyAdvanceGiven')} type="number" value={form.advanceGiven} onChange={(event) => setForm({ ...form, advanceGiven: Number(event.target.value) })} />
          <Button onClick={() => void handleSave()} className="w-full" loading={savingLaborer}>{t('save')}</Button>
        </div>
      </Modal>

      <Modal open={showLeaveModal} onClose={() => setShowLeaveModal(false)} title={t('markUnavailable')}>
        <div className="space-y-4">
          <Input label={t('fromDate')} type="date" min="2000-01-01" max="2100-12-31" value={leaveForm.fromDate} onChange={(event) => setLeaveForm({ ...leaveForm, fromDate: event.target.value })} />
          <Input label={t('toDate')} type="date" min="2000-01-01" max="2100-12-31" value={leaveForm.toDate} onChange={(event) => setLeaveForm({ ...leaveForm, toDate: event.target.value })} />
          <Textarea label={t('reason')} value={leaveForm.reason} onChange={(event) => setLeaveForm({ ...leaveForm, reason: event.target.value })} />
          <Button className="w-full" loading={savingAction} onClick={() => void handleSaveLeave()}>{t('save')}</Button>
        </div>
      </Modal>

      <Modal open={showAdjustmentModal} onClose={() => setShowAdjustmentModal(false)} title={t('addAdjustment')}>
        <div className="space-y-4">
          <Select
            label={t('adjustmentType')}
            value={adjustmentForm.type}
            onChange={(event) => setAdjustmentForm({ ...adjustmentForm, type: event.target.value as LaborAdjustmentType })}
            options={[
              { value: 'extra', label: t('extraPayment') },
              { value: 'advance', label: t('advance') },
            ]}
          />
          <Input label={t('date')} type="date" min="2000-01-01" max="2100-12-31" value={adjustmentForm.date} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, date: event.target.value })} />
          <Input label={t('amount')} type="number" min={0} value={adjustmentForm.amount} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, amount: Number(event.target.value) })} />
          <Textarea label={t('note')} value={adjustmentForm.note} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, note: event.target.value })} />
          <Button className="w-full" loading={savingAction} onClick={() => void handleSaveAdjustment()}>{t('save')}</Button>
        </div>
      </Modal>

      <Modal open={showSalaryModal} onClose={() => setShowSalaryModal(false)} title={t('markAsPaid')}>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {paymentTarget?.laborer.name} · {paymentTarget?.summary.month} · {t('remainingAmount')}: {formatPayrollAmount(Math.max(0, (paymentTarget?.summary.payable ?? 0) - (paymentTarget?.summary.paid ?? 0)))}
          </p>
          <Input
            label={t('amountPaid')}
            type="number"
            min={0}
            max={paymentTarget ? Math.max(0, paymentTarget.summary.payable - paymentTarget.summary.paid) : undefined}
            value={salaryForm.amountPaid}
            onChange={(event) => setSalaryForm({ ...salaryForm, amountPaid: Number(event.target.value) })}
          />
          <Input label={t('paidOn')} type="date" min="2000-01-01" max="2100-12-31" value={salaryForm.paidOn} onChange={(event) => setSalaryForm({ ...salaryForm, paidOn: event.target.value })} />
          <Textarea label={t('note')} value={salaryForm.note} onChange={(event) => setSalaryForm({ ...salaryForm, note: event.target.value })} />
          <Button className="w-full" loading={savingAction} onClick={() => void handleSaveSalaryPayment()}>{t('save')}</Button>
        </div>
      </Modal>
    </div>
  );
}
