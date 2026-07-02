import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, Trash2 } from 'lucide-react';
import { PageHeader, DataTable, Modal, ConfirmDialog } from '@/components/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getInvoices, generateInvoice, deleteInvoice } from '@/services/invoiceService';
import { getBooking } from '@/services/bookingService';
import { getAppSettings } from '@/services/settingsService';
import { generateInvoicePdf, getInvoicePreviewPdfUrl } from '@/utils/pdf/documents';
import { formatCurrency, formatDate } from '@/utils/calculations';
import { useTranslation } from '@/lib/i18n';
import type { Invoice, InvoiceType } from '@/types';

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    getInvoices().then(setInvoices).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewPdfUrl]);

  const handlePdf = async (invoice: Invoice) => {
    setDownloadingId(invoice.id);
    try {
      const settings = await getAppSettings();
      await generateInvoicePdf(invoice, settings);
      toast.success('Invoice exported');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreview = async (invoice: Invoice) => {
    try {
      const settings = await getAppSettings();
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
      setPreviewTitle(invoice.invoiceNumber);
      setPreviewPdfUrl(await getInvoicePreviewPdfUrl(invoice, settings));
    } catch {
      toast.error('Failed to load preview');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await deleteInvoice(deleteTarget.id);
      setInvoices((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      toast.success('Invoice deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete invoice');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <PageHeader title={t('invoices')} />
      {loading ? (
        <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>
      ) : (
        <DataTable
          data={invoices}
          columns={[
            { key: 'invoiceNumber', label: 'Invoice #' },
            { key: 'customerName', label: t('customerName') },
            { key: 'invoiceType', label: 'Type', render: (i) => i.invoiceType === 'gst' ? t('gstInvoice') : t('nonGstInvoice') },
            { key: 'grandTotal', label: t('grandTotal'), render: (i) => formatCurrency(i.grandTotal) },
            { key: 'remainingBalance', label: t('remainingAmount'), render: (i) => formatCurrency(i.remainingBalance) },
            { key: 'createdAt', label: t('date'), render: (i) => formatDate(i.createdAt.toISOString()) },
            {
              key: 'actions',
              label: t('actions'),
              render: (i) => (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handlePreview(i); }}>
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={downloadingId === i.id}
                    onClick={(e) => { e.stopPropagation(); handlePdf(i); }}
                  >
                    {t('generatePdf')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                    loading={deletingId === i.id}
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(i); }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}

      <Modal
        open={!!previewPdfUrl}
        onClose={() => {
          if (previewPdfUrl) {
            URL.revokeObjectURL(previewPdfUrl);
          }
          setPreviewPdfUrl(null);
        }}
        title={`Invoice Preview · ${previewTitle}`}
      >
        {previewPdfUrl && (
          <div className="overflow-auto rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700">
            <iframe
              title="Invoice preview"
              src={previewPdfUrl}
              className="h-[70vh] w-full bg-white"
            />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Invoice"
        message={
          deleteTarget
            ? `Are you sure you want to delete ${deleteTarget.invoiceNumber}? This action cannot be undone.`
            : ''
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={!!deletingId}
      />
    </div>
  );
}

export function NewInvoicePage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('non_gst');
  const [generating, setGenerating] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleGenerate = async () => {
    if (!bookingId) return;
    setGenerating(true);
    try {
      const booking = await getBooking(bookingId);
      if (!booking) throw new Error('Booking not found');
      await generateInvoice(booking, invoiceType);
      toast.success('Invoice generated');
      navigate(`/invoices`);
    } catch {
      toast.error('Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <PageHeader title={t('invoices')} subtitle="Generate new invoice" />
      <Card className="max-w-md space-y-4">
        <h3 className="font-semibold">Select Invoice Type</h3>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => setInvoiceType('non_gst')}
            className={`flex-1 rounded-lg border p-4 text-center ${invoiceType === 'non_gst' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}
          >
            <p className="font-medium">{t('nonGstInvoice')}</p>
            <p className="text-xs text-gray-500">No tax · INV-XXXX</p>
          </button>
          <button
            onClick={() => setInvoiceType('gst')}
            className={`flex-1 rounded-lg border p-4 text-center ${invoiceType === 'gst' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}
          >
            <p className="font-medium">{t('gstInvoice')}</p>
            <p className="text-xs text-gray-500">18% GST · INV-GST-XXXX</p>
          </button>
        </div>
        <Button onClick={handleGenerate} loading={generating} className="w-full">{t('generatePdf')}</Button>
      </Card>
    </div>
  );
}
