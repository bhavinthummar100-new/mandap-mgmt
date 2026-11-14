import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { ConfirmDialog, LoadingSkeleton, Modal, PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input, Textarea } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { getAppSettings, updateAppSettings, uploadLogo, exportAllData, importData } from '@/services/settingsService';
import { runSeedData } from '@/seed/seedRunner';
import { downloadJson } from '@/utils/helpers';
import { useTranslation } from '@/lib/i18n';
import { useAsyncActionGuard } from '@/hooks/useAsyncActionGuard';
import type { AppSettings } from '@/types';
import { previewBookingDateCleanup, applyBookingDateCleanup } from '@/services/bookingDateCleanupService';
import type { BookingDateCorrectionPreview } from '@/utils/eventDate';
import { isValidEventDate } from '@/utils/eventDate';

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [dateCleanupRows, setDateCleanupRows] = useState<BookingDateCorrectionPreview[]>([]);
  const [dateCorrections, setDateCorrections] = useState<Record<string, string>>({});
  const [showDateCleanup, setShowDateCleanup] = useState(false);
  const [confirmDateCleanup, setConfirmDateCleanup] = useState(false);
  const [cleaningDates, setCleaningDates] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const { runGuarded, isRunning } = useAsyncActionGuard();

  useEffect(() => {
    getAppSettings().then(setSettings);
  }, []);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await updateAppSettings(settings);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    const localPreview = URL.createObjectURL(file);
    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }
    setLogoPreviewUrl(localPreview);
    setLogoLoadFailed(false);

    await runGuarded(async () => {
      try {
        const url = await uploadLogo(file);
        await updateAppSettings({ logoUrl: url });
        setSettings({ ...settings, logoUrl: url });
        toast.success('Logo uploaded and saved');
      } catch {
        toast.error('Upload failed');
      }
    }, 'uploadLogo');
  };

  const handleBackup = async () => {
    await runGuarded(async () => {
      try {
        const data = await exportAllData();
        downloadJson(data, `mandap-backup-${new Date().toISOString().split('T')[0]}.json`);
        toast.success('Backup downloaded');
      } catch {
        toast.error('Backup failed');
      }
    }, 'backup');
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await runGuarded(async () => {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await importData(data);
        toast.success('Data restored');
      } catch {
        toast.error('Restore failed');
      }
    }, 'restore');
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await runSeedData();
      toast.success('Sample data loaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  const handlePreviewDateCleanup = async () => {
    try {
      const rows = await previewBookingDateCleanup();
      setDateCleanupRows(rows);
      setDateCorrections(Object.fromEntries(
        rows.map((row) => [row.id, row.candidateDates.length === 1 ? row.candidateDates[0] : ''])
      ));
      setShowDateCleanup(true);
    } catch {
      toast.error(t('dateCleanupFailed'));
    }
  };

  const handleApplyDateCleanup = async () => {
    setCleaningDates(true);
    try {
      await applyBookingDateCleanup(
        dateCleanupRows.map((row) => ({ id: row.id, eventDate: dateCorrections[row.id] ?? '' })),
        true
      );
      toast.success(t('dateCleanupApplied'));
      setConfirmDateCleanup(false);
      setShowDateCleanup(false);
      setDateCleanupRows([]);
    } catch {
      toast.error(t('dateCleanupFailed'));
    } finally {
      setCleaningDates(false);
    }
  };

  if (!settings) return <LoadingSkeleton rows={5} />;

  const resolvedLogoUrl = logoPreviewUrl ?? settings.logoUrl ?? '';
  const logoInitial = (settings.businessName?.trim().charAt(0) || 'N').toUpperCase();
  const backingUp = isRunning('backup');
  const restoring = isRunning('restore');
  const uploadingLogo = isRunning('uploadLogo');

  return (
    <div>
      <PageHeader title={t('settings')} subtitle={t('businessSettings')} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <Input label={t('businessName')} value={settings.businessName} onChange={(e) => setSettings({ ...settings, businessName: e.target.value })} />
          <Input label="Business Name (Gujarati)" value={settings.businessNameGu} onChange={(e) => setSettings({ ...settings, businessNameGu: e.target.value })} />
          <Input label={t('gstNumber')} value={settings.gstNumber ?? ''} onChange={(e) => setSettings({ ...settings, gstNumber: e.target.value })} />
          <Textarea label={t('address')} value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} />
          <Input label={t('phone')} value={settings.phone ?? ''} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
          <Input label="Default GST Rate (%)" type="number" value={settings.defaultGstRate} onChange={(e) => setSettings({ ...settings, defaultGstRate: Number(e.target.value) })} />

          <div>
            <label className="block text-sm font-medium mb-1">{t('logo')}</label>
            <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} className="text-sm" />
            <p className="mt-1 text-xs text-gray-500">Upload કર્યા પછી નીચે preview માં તરત દેખાશે.</p>
          </div>

          <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">Invoice Logo Preview</p>
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-900">
                {resolvedLogoUrl && !logoLoadFailed ? (
                  <img
                    src={resolvedLogoUrl}
                    alt="Logo preview"
                    className="h-full w-full object-contain"
                    onError={() => setLogoLoadFailed(true)}
                    onLoad={() => setLogoLoadFailed(false)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-blue-600 text-2xl font-bold text-white">
                    {logoInitial}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{settings.businessName || 'Business Name'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{settings.address || 'Business Address'}</p>
              </div>
            </div>
          </div>

          <Button onClick={handleSave} loading={saving} className="w-full">{t('save')}</Button>
        </Card>

        <Card className="space-y-4">
          <h3 className="font-semibold">Data Management</h3>
          <Button variant="outline" onClick={handleBackup} loading={backingUp} className="w-full">{t('backup')}</Button>
          <div>
            <input ref={fileRef} type="file" accept=".json" onChange={handleRestore} className="hidden" />
            <Button variant="outline" onClick={() => fileRef.current?.click()} loading={restoring} className="w-full">{t('restore')}</Button>
          </div>
          <Button variant="secondary" onClick={handleSeed} loading={seeding} className="w-full">{t('loadSampleData')}</Button>
          <p className="text-xs text-gray-500">Sample data creates customers, bookings, inventory, staff boys, vendors, expenses and invoices for testing.</p>
          <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
            <Button variant="outline" onClick={() => void handlePreviewDateCleanup()} className="w-full">
              {t('cleanupBookingDates')}
            </Button>
          </div>
        </Card>
      </div>

      <Modal
        open={showDateCleanup}
        onClose={() => setShowDateCleanup(false)}
        title={t('dateCleanupPreview')}
        maxWidthClass="sm:max-w-3xl"
      >
        {dateCleanupRows.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('noMalformedBookingDates')}</p>
            <Button className="w-full" onClick={() => setShowDateCleanup(false)}>{t('close')}</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('selectCorrectDate')}</p>
            <div className="max-h-[55vh] space-y-3 overflow-y-auto">
              {dateCleanupRows.map((row) => (
                <div key={row.id} className="grid gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-gray-500">{t('booking')}</p>
                    <p className="font-medium">{row.bookingNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('eventDate')}</p>
                    <p className="font-medium">{row.currentDate}</p>
                    {row.candidateDates.length > 0 && (
                      <p className="mt-1 text-xs text-gray-500">{row.candidateDates.join(' · ')}</p>
                    )}
                  </div>
                  <DatePicker
                    label={t('correctedDate')}
                    min="2000-01-01"
                    max="2100-12-31"
                    value={dateCorrections[row.id] ?? ''}
                    onChange={(value) => setDateCorrections({ ...dateCorrections, [row.id]: value })}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setShowDateCleanup(false)}>{t('cancel')}</Button>
              <Button
                variant="danger"
                disabled={dateCleanupRows.some((row) => !isValidEventDate(dateCorrections[row.id] ?? ''))}
                onClick={() => setConfirmDateCleanup(true)}
              >
                {t('confirm')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={confirmDateCleanup}
        title={t('dateCleanupPreview')}
        message={`${t('confirmDateCleanup')} (${dateCleanupRows.length})`}
        onCancel={() => setConfirmDateCleanup(false)}
        onConfirm={() => void handleApplyDateCleanup()}
        loading={cleaningDates}
      />
    </div>
  );
}
