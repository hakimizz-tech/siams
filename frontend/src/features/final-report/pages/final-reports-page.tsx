/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DataTable } from '@/components/shared/data-table';
import { DefList } from '@/components/shared/def-list';
import { DownloadButton } from '@/components/shared/download-button';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { QueryBoundary } from '@/components/shared/query-boundary';
import { StatusBadge } from '@/components/shared/status-badge';
import { useAcademicDashboard } from '@/features/dashboards';
import { hasStatus } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/format';
import { nameOf } from '@/lib/rows';
import { useAcceptReport, useFinalReport, useReturnReport } from '..';

function Review({ placementId }: { placementId: string }) {
  const q = useFinalReport(placementId);
  const accept = useAcceptReport();
  const ret = useReturnReport();
  const [dlg, setDlg] = useState<'accept' | 'return' | null>(null);
  if (q.isPending) return <LoadingState variant="card" />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const r: any = q.data;
  const reviewable = r.status === 'SUBMITTED';
  const handle = async (fn: () => Promise<void>) => {
    try { await fn(); } catch (e) { if (hasStatus(e, 409)) { toast.error('This report changed. Showing the latest state.'); void q.refetch(); } else throw e; }
  };
  return (
    <div className="mt-4 space-y-4">
      <DefList items={[['Status', <StatusBadge key="s" kind="report" status={r.status} />], ['Title', r.title], ['File', r.original_name], ['Updated', formatDateTime(r.updated_at)], ['Feedback', r.feedback]]} />
      {r.download_url && <DownloadButton url={r.download_url} filename={r.original_name} label="Download report" />}
      {reviewable && (
        <div className="flex gap-2">
          <Button onClick={() => setDlg('accept')}>Accept</Button>
          <Button variant="outline" onClick={() => setDlg('return')}>Return</Button>
        </div>
      )}
      <ConfirmDialog open={dlg === 'accept'} onOpenChange={(o) => !o && setDlg(null)} title="Accept this report?" description="The report will be locked." confirmLabel="Accept"
        onConfirm={() => handle(async () => { await accept.mutateAsync({ id: r.id, placementId } as any); toast.success('Report accepted'); })} />
      <ConfirmDialog open={dlg === 'return'} onOpenChange={(o) => !o && setDlg(null)} title="Return this report?" description="The student will upload a corrected version." confirmLabel="Return" requireReason={{ label: 'Feedback for the student' }}
        onConfirm={(reason) => handle(async () => { await ret.mutateAsync({ id: r.id, placementId, feedback: reason! } as any); toast.success('Report returned'); })} />
    </div>
  );
}

export default function FinalReportsPage() {
  const q = useAcademicDashboard();
  const [sel, setSel] = useState<any>(null);
  return (
    <>
      <PageHeader title="Final reports" description="Reports waiting for your decision." />
      <QueryBoundary query={q as any} empty={(d: any) => (d?.widgets?.final_reports ?? []).length === 0} emptyState={<EmptyState title="No reports awaiting review" />}>
        {(d: any) => (
          <DataTable
            data={d.widgets.final_reports}
            columns={[{ header: 'Student', cell: (c) => nameOf(c.row.original.student) }, { header: 'Status', cell: (c) => <StatusBadge kind="report" status={c.row.original.status ?? 'SUBMITTED'} /> }]}
            rowActions={(r: any) => <Button size="sm" onClick={() => setSel(r)}>Review</Button>}
          />
        )}
      </QueryBoundary>
      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>{nameOf(sel?.student)}</SheetTitle><SheetDescription>Final report</SheetDescription></SheetHeader>
          {sel && <Review placementId={sel.placement_id ?? sel.placement} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
