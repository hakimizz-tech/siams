/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DownloadButton } from '@/components/shared/download-button';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { FileDropzone } from '@/components/shared/file-dropzone';
import { LoadingState } from '@/components/shared/loading-state';
import { PageHeader } from '@/components/shared/page-header';
import { Panel } from '@/components/shared/panel';
import { StatusBadge } from '@/components/shared/status-badge';
import { DefList } from '@/components/shared/def-list';
import { ROUTES } from '@/config/routes';
import { MAX_REPORT_MB, REPORT_ACCEPT } from '@/config/limits';
import { useMyPlacement } from '@/features/placements';
import { errorMessage, hasStatus } from '@/lib/api/errors';
import { fileSizeLabel, formatDateTime } from '@/lib/format';
import { useFinalReport, useUploadFinalReport, validateReportFile } from '..';

function Report({ placementId }: { placementId: string }) {
  const q = useFinalReport(placementId);
  const upload = useUploadFinalReport();
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>();

  if (q.isPending) return <LoadingState variant="card" />;
  const none = hasStatus(q.error, 404);
  if (q.error && !none) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const report: any = none ? null : q.data;
  const canUpload = !report || report.status === 'SUBMITTED' || report.status === 'RETURNED';

  return (
    <div className="space-y-4">
      {report?.status === 'RETURNED' && (
        <Alert>
          <AlertTitle>Returned for changes</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{report.feedback}</AlertDescription>
        </Alert>
      )}
      {report && (
        <Panel title="Your report" action={<StatusBadge kind="report" status={report.status} />}>
          <DefList items={[['Title', report.title], ['File', report.original_name], ['Size', report.size != null ? fileSizeLabel(report.size) : '—'], ['Last updated', formatDateTime(report.updated_at)]]} />
          {report.download_url && <div className="mt-3"><DownloadButton url={report.download_url} filename={report.original_name} label="Download report" /></div>}
          {report.status === 'ACCEPTED' && <p className="mt-3 text-muted-foreground">Accepted. The report is locked.</p>}
        </Panel>
      )}
      {canUpload && (
        <Panel title={report ? 'Replace the file' : 'Upload your final report'}>
          <FileDropzone
            accept={REPORT_ACCEPT as any}
            maxMb={MAX_REPORT_MB}
            validate={validateReportFile}
            progress={progress}
            error={error}
            disabled={upload.isPending}
            label="Drag your report (PDF, DOC or DOCX) here, or click to choose"
            onFile={(file) => {
              setError(undefined);
              upload.mutate({ placementId, file, onProgress: setProgress } as any, {
                onSuccess: () => toast.success('Report uploaded'),
                onError: (e) => setError(errorMessage(e)),
                onSettled: () => setProgress(0),
              });
            }}
          />
        </Panel>
      )}
    </div>
  );
}

export default function FinalReportPage() {
  const mine = useMyPlacement();
  if (mine.isPending) return <LoadingState />;
  if (mine.error && !hasStatus(mine.error, 404)) return <ErrorState error={mine.error} onRetry={() => void mine.refetch()} />;
  const placement: any = hasStatus(mine.error, 404) ? null : mine.data;
  return (
    <>
      <PageHeader title="Final report" description="Upload your report for your academic supervisor." />
      {placement?.status === 'APPROVED' ? (
        <Report placementId={placement.id} />
      ) : (
        <EmptyState title="Your placement must be approved first" action={<Button asChild><Link to={ROUTES.placement as string}>Go to my placement</Link></Button>} />
      )}
    </>
  );
}
