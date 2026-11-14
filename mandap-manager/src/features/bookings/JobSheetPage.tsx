import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, MessageCircle, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { LoadingSkeleton, PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTranslation } from '@/lib/i18n';
import { getBooking } from '@/services/bookingService';
import { getCustomer } from '@/services/customerService';
import { getLaborAssignments, getLaborer } from '@/services/laborService';
import type { Booking, Customer, LaborAssignment } from '@/types';
import { buildJobSheetText, JOB_SHEET_ICONS } from '@/utils/jobSheet';
import { copyToClipboard, openWhatsApp } from '@/utils/whatsapp';

export function JobSheetPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [assignments, setAssignments] = useState<LaborAssignment[]>([]);
  const [firstAssignedStaffMobile, setFirstAssignedStaffMobile] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const navigate = useNavigate();
  const { t, locale } = useTranslation();

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!id) {
        setFailed(true);
        setLoading(false);
        return;
      }

      try {
        const loadedBooking = await getBooking(id);
        if (!loadedBooking) {
          if (active) setFailed(true);
          return;
        }
        const [loadedCustomer, loadedAssignments] = await Promise.all([
          loadedBooking.customerId ? getCustomer(loadedBooking.customerId) : Promise.resolve(null),
          getLaborAssignments(id),
        ]);
        const firstAssignedLaborer = loadedAssignments[0]
          ? await getLaborer(loadedAssignments[0].laborerId)
          : null;
        if (active) {
          setBooking(loadedBooking);
          setCustomer(loadedCustomer);
          setAssignments(loadedAssignments);
          setFirstAssignedStaffMobile(firstAssignedLaborer?.mobile ?? '');
        }
      } catch {
        if (active) {
          setFailed(true);
          toast.error(t('loadJobSheetFailed'));
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [id, t]);

  const jobSheetText = useMemo(() => {
    if (!booking) return '';
    return buildJobSheetText(booking, customer, booking.lineItems, assignments, locale);
  }, [assignments, booking, customer, locale]);

  const jobSheetWhatsAppText = useMemo(() => {
    if (!booking) return '';
    return buildJobSheetText(booking, customer, booking.lineItems, assignments, locale, { includeIcons: false });
  }, [assignments, booking, customer, locale]);

  const handleCopy = async () => {
    const copied = await copyToClipboard(jobSheetText);
    toast.success(copied ? t('jobSheetCopied') : t('jobSheetCopyFailed'));
  };

  const handleShare = () => {
    if (firstAssignedStaffMobile) openWhatsApp(jobSheetWhatsAppText, firstAssignedStaffMobile);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  if (failed || !booking) {
    return (
      <div className="space-y-4">
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> {t('backToBooking')}
        </Button>
        <Card>{t('bookingNotFound')}</Card>
      </div>
    );
  }

  const lines = jobSheetText.split('\n');

  return (
    <div className="job-sheet-page mx-auto max-w-4xl">
      <div className="job-sheet-actions">
        <PageHeader
          title={t('jobSheet')}
          subtitle={booking.bookingNumber}
          action={
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> {t('printSavePdf')}
              </Button>
              <Button type="button" variant="outline" onClick={handleShare} disabled={!firstAssignedStaffMobile}>
                <MessageCircle className="h-4 w-4" /> {t('shareJobSheet')}
              </Button>
              <Button type="button" variant="outline" onClick={handleCopy}>
                <Copy className="h-4 w-4" /> {t('copyText')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate(`/bookings/${booking.id}`)}>
                <ArrowLeft className="h-4 w-4" /> {t('backToBooking')}
              </Button>
            </div>
          }
        />
      </div>

      <Card className="job-sheet-document p-6 text-base leading-relaxed sm:p-10">
        <div className="space-y-1">
          {lines.map((line, index) => {
            const isTitle = line.startsWith(`*${JOB_SHEET_ICONS.title} `);
            const isSection = /^\*[^*]+\*$/.test(line);
            const content = line.replace(/\*/g, '');
            const parts = line.split(/(\*[^*]+\*)/g).filter(Boolean);

            if (!line) return <div key={index} className="h-3" />;
            if (isTitle) {
              return (
                <h1 key={index} className="mb-5 text-3xl font-bold tracking-wide">
                  {content}
                </h1>
              );
            }
            if (isSection) {
              return (
                <h2 key={index} className="mb-1 mt-4 text-lg font-bold">
                  {content}
                </h2>
              );
            }
            if (/^https?:\/\/\S+$/i.test(line)) {
              return (
                <p key={index} className="break-all">
                  <a href={line} target="_blank" rel="noreferrer" className="text-blue-600 underline dark:text-blue-400">
                    {line}
                  </a>
                </p>
              );
            }
            return (
              <p key={index} className="break-words">
                {parts.map((part, partIndex) =>
                  part.startsWith('*') && part.endsWith('*')
                    ? <strong key={partIndex}>{part.slice(1, -1)}</strong>
                    : part
                )}
              </p>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
