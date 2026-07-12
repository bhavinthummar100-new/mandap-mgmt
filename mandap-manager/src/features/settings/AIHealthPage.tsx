import { useState } from 'react';
import { CircleCheck, TriangleAlert } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { parseInquiryDetailsWithGemini } from '@/services/aiService';

interface HealthResult {
  ok: boolean;
  message: string;
  details?: string;
  raw?: unknown;
}

const samplePrompt = 'Ramesh bhai 9876543210, event on 2026-08-15 at 19:30, Nikol Ahmedabad';

export function AIHealthPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<HealthResult | null>(null);
  const rawOutput = result?.raw ? JSON.stringify(result.raw, null, 2) : '';

  const runHealthCheck = async () => {
    setRunning(true);
    setResult(null);
    try {
      const parsed = await parseInquiryDetailsWithGemini(samplePrompt);
      const hasCoreFields = Boolean(parsed.mobile && parsed.eventDate && parsed.eventTime);
      setResult({
        ok: hasCoreFields,
        message: hasCoreFields
          ? 'Gemini is reachable and returned structured output.'
          : 'Gemini responded, but output is missing expected fields.',
        raw: parsed,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const isPermissionError = message.includes('PERMISSION_DENIED');
      setResult({
        ok: false,
        message: isPermissionError
          ? 'AI Logic is not enabled for this Firebase project.'
          : 'Gemini health check failed.',
        details: message,
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="AI Health"
        subtitle="Verify Gemini Flash integration for this project"
        action={<Button onClick={runHealthCheck} loading={running}>Run Health Check</Button>}
      />

      <Card className="space-y-4">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <p className="font-medium">What this check does</p>
          <p className="mt-1">Calls Gemini with a sample inquiry prompt and validates that structured fields are returned.</p>
        </div>

        <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          <p className="font-medium">Sample prompt</p>
          <p className="mt-1">{samplePrompt}</p>
        </div>

        {result && (
          <div className={`rounded-lg border p-3 text-sm ${result.ok ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300'}`}>
            <div className="flex items-center gap-2 font-medium">
              {result.ok ? <CircleCheck className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
              {result.message}
            </div>
            {result.details && <p className="mt-2 break-all text-xs">{result.details}</p>}
          </div>
        )}

        {rawOutput && (
          <pre className="overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
            {rawOutput}
          </pre>
        )}
      </Card>
    </div>
  );
}
