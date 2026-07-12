import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader, DataTable } from '@/components/shared';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getInquiries } from '@/services/inquiryService';
import { formatDate } from '@/utils/calculations';
import { useTranslation } from '@/lib/i18n';
import type { Inquiry } from '@/types';

export function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const load = () => {
    getInquiries().then(setInquiries).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader
        title={t('inquiries')}
        action={
          <Button onClick={() => navigate('/inquiries/new')}>
            <Plus className="h-4 w-4" />
            {t('newInquiry')}
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>
      ) : (
        <DataTable
          data={inquiries}
          onRowClick={(row) => navigate(`/inquiries/${row.id}`)}
          columns={[
            { key: 'customerName', label: t('customerName') },
            { key: 'mobile', label: t('mobile') },
            { key: 'eventDate', label: t('eventDate'), render: (r) => formatDate(r.eventDate) },
            { key: 'eventAddress', label: t('eventAddress') },
            { key: 'status', label: t('status'), render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      )}
    </div>
  );
}
