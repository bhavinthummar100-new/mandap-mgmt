import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { getAppSettings, updateAppSettings, uploadLogo, exportAllData, importData } from '@/services/settingsService';
import { runSeedData } from '@/seed/seedRunner';
import { downloadJson } from '@/utils/helpers';
import { useTranslation } from '@/lib/i18n';
import type { AppSettings } from '@/types';

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

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

    try {
      const url = await uploadLogo(file);
      await updateAppSettings({ logoUrl: url });
      setSettings({ ...settings, logoUrl: url });
      toast.success('Logo uploaded and saved');
    } catch {
      toast.error('Upload failed');
    }
  };

  const handleBackup = async () => {
    const data = await exportAllData();
    downloadJson(data, `mandap-backup-${new Date().toISOString().split('T')[0]}.json`);
    toast.success('Backup downloaded');
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importData(data);
      toast.success('Data restored');
    } catch {
      toast.error('Restore failed');
    }
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

  if (!settings) return <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;

  const resolvedLogoUrl = logoPreviewUrl ?? settings.logoUrl ?? '';
  const logoInitial = (settings.businessName?.trim().charAt(0) || 'N').toUpperCase();

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
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm" />
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
          <Button variant="outline" onClick={handleBackup} className="w-full">{t('backup')}</Button>
          <div>
            <input ref={fileRef} type="file" accept=".json" onChange={handleRestore} className="hidden" />
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full">{t('restore')}</Button>
          </div>
          <Button variant="secondary" onClick={handleSeed} loading={seeding} className="w-full">{t('loadSampleData')}</Button>
          <p className="text-xs text-gray-500">Sample data creates customers, bookings, inventory, labor, vendors, expenses and invoices for testing.</p>
        </Card>
      </div>
    </div>
  );
}
