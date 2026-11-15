/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiErrorAlert } from '@/components/shared/api-error-alert';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { JobProgress } from '@/components/shared/job-progress';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { usePeriods } from '@/features/periods';
import { downloadFile } from '@/lib/api/download';
import { hasStatus } from '@/lib/api/errors';
import { formatPercent } from '@/lib/format';
import { nameOf, pick, rows } from '@/lib/rows';
import { useUrlState } from '@/lib/use-url-state';
import { useExportJob, usePeriodSummary, useStartExport } from '..';

export default function ReportsPage() {
  const { state, set } = useUrlState({ period: '' });
  const periods = rows(usePeriods({} as any).data);
  const periodId = state.period || periods[0]?.id;
  const q: any = usePeriodSummary(periodId);
  const start = useStartExport();
  const [jobId, setJobId] = useState<string>();
  const [error, setError] = useState<unknown>();
  const job: any = useExportJob(jobId as string);

  useEffect(() => {
    if (job.data?.status === 'SUCCESS' && job.data.download_url) void downloadFile(job.data.download_url, job.data.filename);
  }, [job.data?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const unavailable: string[] = q.data?.unavailable ?? [];

  return (
    <>
      <PageHeader
        title="Reports"
        description="One row per placement for the selected period."
        actions={
          <>
            <div className="flex items-center gap-2">
              <Label htmlFor="rep-period">Period</Label>
              <Select value={periodId} onValueChange={(v) => set({ period: v })}>
                <SelectTrigger id="rep-period" className="w-52"><SelectValue placeholder="Select a period" /></SelectTrigger>
                <SelectContent>{periods.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button
              disabled={!periodId || start.isPending}
              onClick={async () => {
                setError(undefined);
                try { const r: any = await start.mutateAsync(periodId as any); setJobId(r.job_id); } catch (e) { setError(e); }
              }}
            >
              Export CSV
            </Button>
          </>
        }
      />
      <ApiErrorAlert error={error} />
      {jobId && (
        <div className="mb-4">
          {hasStatus(job.error, 404) ? <Alert><AlertDescription>This export expired or is not yours. Start a new one.</AlertDescription></Alert> : <JobProgress job={job.data} />}
        </div>
      )}
      {import.meta.env.DEV && unavailable.length > 0 && <Alert className="mb-4"><AlertDescription>Dev only: not delivered yet: {unavailable.join(', ')}</AlertDescription></Alert>}
      {!periodId ? (
        <EmptyState title="No period yet" />
      ) : (
        <DataTable
          data={rows(q.data)}
          isLoading={q.isPending}
          error={q.error}
          onRetry={() => void q.refetch()}
          columns={[
            { header: 'Student', cell: (c) => nameOf(c.row.original.student) },
            { header: 'Status', cell: (c) => (c.row.original.status ? <StatusBadge kind="placement" status={c.row.original.status} /> : '—') },
            { header: 'Hours', cell: (c) => `${pick(c.row.original, 'approved_hours') ?? 0} / ${pick(c.row.original, 'required_hours') ?? 0}` },
            { header: 'Weeks', cell: (c) => `${pick(c.row.original, 'weeks_approved') ?? 0} / ${pick(c.row.original, 'weeks_expected') ?? 0}` },
            { header: 'Visits', cell: (c) => `${pick(c.row.original, 'visits_done') ?? 0} / ${pick(c.row.original, 'visits_required') ?? 0}` },
            { header: 'Industrial %', cell: (c) => (pick(c.row.original, 'workplace_percent', 'ws_percent') != null ? formatPercent(pick(c.row.original, 'workplace_percent', 'ws_percent')) : '—') },
            { header: 'Academic %', cell: (c) => (pick(c.row.original, 'academic_percent', 'as_percent') != null ? formatPercent(pick(c.row.original, 'academic_percent', 'as_percent')) : '—') },
            { header: 'Report', cell: (c) => (c.row.original.report_status ? <StatusBadge kind="report" status={c.row.original.report_status} /> : '—') },
            { header: 'Total', cell: (c) => (c.row.original.total_percent != null ? formatPercent(c.row.original.total_percent) : '—') },
            { header: 'Grade', cell: (c) => c.row.original.grade ?? '—' },
          ]}
        />
      )}
    </>
  );
}
