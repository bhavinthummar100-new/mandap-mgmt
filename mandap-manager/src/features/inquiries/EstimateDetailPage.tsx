import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getEstimate, sendEstimate, approveEstimate } from '@/services/estimateService';
import { convertEstimateToBooking } from '@/services/bookingService';
import { getAppSettings } from '@/services/settingsService';
import { generateEstimatePdf } from '@/utils/pdf/documents';
import { formatDate, formatTime, formatCurrency } from '@/utils/calculations';
import { useTranslation } from '@/lib/i18n';
import type { Estimate } from '@/types';

export function EstimateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [advance, setAdvance] = useState(0);
  const [converting, setConverting] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (id) getEstimate(id).then(setEstimate);
  }, [id]);

  const handleSend = async () => {
    if (!id) return;
    await sendEstimate(id);
    toast.success('Estimate sent');
    getEstimate(id).then(setEstimate);
  };

  const handleApprove = async () => {
    if (!id) return;
    await approveEstimate(id);
    toast.success('Estimate approved');
    getEstimate(id).then(setEstimate);
  };

  const handlePdf = async () => {
    if (!estimate) return;
    const settings = await getAppSettings();
    generateEstimatePdf(estimate, settings);
  };

  const handleConvert = async () => {
    if (!estimate) return;
    setConverting(true);
    try {
      const { bookingId, warnings } = await convertEstimateToBooking(estimate, advance);
      if (warnings.length) toast.error(`Stock warnings: ${warnings.join(', ')}`);
      toast.success('Booking created');
      navigate(`/bookings/${bookingId}`);
    } catch {
      toast.error('Failed to convert');
    } finally {
      setConverting(false);
    }
  };

  if (!estimate) return <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;

  return (
    <div>
      <PageHeader title={estimate.estimateNumber} subtitle={estimate.customerName} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex justify-between"><span>{t('status')}</span><StatusBadge status={estimate.status} /></div>
          <div>{t('mobile')}: {estimate.mobile}</div>
          <div>{t('eventDate')}: {formatDate(estimate.eventDate)} {formatTime(estimate.eventTime)}</div>
          <div>{t('eventAddress')}: {estimate.eventAddress}</div>
          <div className="border-t pt-3 space-y-1">
            {estimate.lineItems.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{item.quantity}x {item.itemName} @ {formatCurrency(item.rate)}</span>
                <span>{formatCurrency(item.total)}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-2">
            <div className="flex justify-between"><span>{t('subtotal')}</span><span>{formatCurrency(estimate.subTotal)}</span></div>
            <div className="flex justify-between"><span>{t('discount')}</span><span>{formatCurrency(estimate.discount)}</span></div>
            <div className="flex justify-between font-bold text-lg"><span>{t('grandTotal')}</span><span>{formatCurrency(estimate.grandTotal)}</span></div>
          </div>
        </Card>

        <Card className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {estimate.status === 'draft' && (
              <Button onClick={handleSend}>{t('sendEstimate')}</Button>
            )}
            {estimate.status === 'sent' && (
              <Button onClick={handleApprove}>{t('approveEstimate')}</Button>
            )}
            <Button variant="outline" onClick={handlePdf}>{t('generatePdf')}</Button>
          </div>

          {(estimate.status === 'approved' || estimate.status === 'sent') && (
            <div className="border-t pt-4 space-y-3">
              <h3 className="font-semibold">{t('convertToBooking')}</h3>
              <Input label={t('advancePayment')} type="number" value={advance} onChange={(e) => setAdvance(Number(e.target.value))} />
              <Button onClick={handleConvert} loading={converting} className="w-full">
                {t('convertToBooking')}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
