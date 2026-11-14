import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LoadingSkeleton, PageHeader } from '@/components/shared';
import { CustomerAvatar } from '@/components/shared/CustomerAvatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getEstimate, sendEstimate, approveEstimate } from '@/services/estimateService';
import { convertEstimateToBooking, getBookingByEstimateId } from '@/services/bookingService';
import { getAppSettings } from '@/services/settingsService';
import { getCustomer } from '@/services/customerService';
import { generateEstimatePdf } from '@/utils/pdf/documents';
import { formatDate, formatTime, formatCurrency } from '@/utils/calculations';
import { useTranslation } from '@/lib/i18n';
import { useAsyncActionGuard } from '@/hooks/useAsyncActionGuard';
import { buildEstimateMessage, openWhatsApp } from '@/utils/whatsapp';
import type { AppSettings, Estimate } from '@/types';
import { MessageCircle } from 'lucide-react';

export function EstimateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [customerPhotoUrl, setCustomerPhotoUrl] = useState('');
  const [hasBooking, setHasBooking] = useState(false);
  const [loadingEstimate, setLoadingEstimate] = useState(true);
  const [business, setBusiness] = useState<Pick<AppSettings, 'businessName' | 'phone'> | null>(null);
  const [advance, setAdvance] = useState(0);
  const [converting, setConverting] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { runGuarded, isRunning } = useAsyncActionGuard();

  useEffect(() => {
    let active = true;
    if (!id) return;

    const loadEstimate = async () => {
      try {
        const currentEstimate = await getEstimate(id);
        const existingBooking = currentEstimate
          ? await getBookingByEstimateId(currentEstimate.id)
          : null;
        if (active) {
          setEstimate(currentEstimate);
          setHasBooking(Boolean(existingBooking));
          if (currentEstimate?.customerId) {
            getCustomer(currentEstimate.customerId)
              .then((customer) => {
                if (active) setCustomerPhotoUrl(customer?.photoUrl ?? '');
              })
              .catch((error: unknown) => console.error('Failed to load customer photo', error));
          } else {
            setCustomerPhotoUrl('');
          }
        }
      } catch (error) {
        console.error('Failed to load estimate details', error);
        toast.error('Failed to load estimate');
      } finally {
        if (active) setLoadingEstimate(false);
      }
    };

    void loadEstimate();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    getAppSettings()
      .then(({ businessName, phone }) => setBusiness({ businessName, phone }))
      .catch(() => toast.error('Failed to load business settings'));
  }, []);

  const handleSend = async () => {
    if (!id) return;
    await runGuarded(async () => {
      try {
        await sendEstimate(id);
        toast.success('Estimate sent');
        const updated = await getEstimate(id);
        setEstimate(updated);
      } catch {
        toast.error('Failed to send estimate');
      }
    }, 'sendEstimate');
  };

  const handleApprove = async () => {
    if (!id) return;
    await runGuarded(async () => {
      try {
        await approveEstimate(id);
        toast.success('Estimate approved');
        const updated = await getEstimate(id);
        setEstimate(updated);
      } catch {
        toast.error('Failed to approve estimate');
      }
    }, 'approveEstimate');
  };

  const handlePdf = async () => {
    if (!estimate) return;
    await runGuarded(async () => {
      try {
        const settings = await getAppSettings();
        await generateEstimatePdf(estimate, settings);
      } catch {
        toast.error('Failed to generate PDF');
      }
    }, 'estimatePdf');
  };

  const sendingEstimate = isRunning('sendEstimate');
  const approvingEstimate = isRunning('approveEstimate');
  const generatingPdf = isRunning('estimatePdf');

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

  if (!id) return null;
  if (loadingEstimate || !estimate) return <LoadingSkeleton rows={5} />;

  return (
    <div>
      <PageHeader title={estimate.estimateNumber} subtitle={estimate.customerName} backTo="/inquiries" backLabel={t('back')} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-gray-700">
            <CustomerAvatar name={estimate.customerName} photoUrl={customerPhotoUrl} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-900 dark:text-gray-100">{estimate.customerName}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{estimate.mobile}</p>
            </div>
          </div>
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
            <Button
              variant="outline"
              disabled={!business}
              onClick={() => {
                if (!business) return;
                openWhatsApp(
                  buildEstimateMessage(
                    { ...estimate, advancePayment: advance },
                    { name: estimate.customerName },
                    business
                  ),
                  estimate.mobile
                );
              }}
            >
              <MessageCircle className="h-4 w-4" /> Send Estimate on WhatsApp
            </Button>
            {estimate.status === 'draft' && (
              <Button onClick={handleSend} loading={sendingEstimate}>{t('sendEstimate')}</Button>
            )}
            {estimate.status === 'sent' && (
              <Button onClick={handleApprove} loading={approvingEstimate}>{t('approveEstimate')}</Button>
            )}
            <Button variant="outline" onClick={handlePdf} loading={generatingPdf}>{t('generatePdf')}</Button>
          </div>

          {!hasBooking && (estimate.status === 'approved' || estimate.status === 'sent') && (
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
