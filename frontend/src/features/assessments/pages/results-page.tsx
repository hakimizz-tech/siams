/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { useCoordinatorDashboard } from '@/features/dashboards';
import { usePeriodSummary } from '@/features/reports';
import { usePeriods } from '@/features/periods';
import { hasStatus } from '@/lib/api/errors';
import { formatPercent } from '@/lib/format';
import { nameOf, pick, rows } from '@/lib/rows';
import { useUrlState } from '@/lib/use-url-state';
import { useFinalizeResult, useResult } from '..';

function Preview({ placementId }: { placementId: string }) {
  const q = useResult(placementId);
  const fin = useFinalizeResult();
  const [confirm, setConfirm] = useState(false);
  if (q.isPending) return <LoadingState variant="card" />;
  if (q.error && !hasStatus(q.error, 404)) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const r: any = q.data ?? {};
  const missing: string[] = r.missing ?? [];
  const ready = r.ready ?? missing.length === 0;
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total" value={formatPercent(r.total_percent ?? r.total)} />
        <StatCard label="Grade" value={r.grade ?? '—'} />
      </div>
      <ul className="space-y-1 text-sm">
        {(r.breakdown ?? r.forms ?? []).map((b: any, i: number) => <li key={i}>{b.name ?? b.form_name}: {formatPercent(b.percent)} × {b.weight_percent ?? b.weight}%</li>)}
      </ul>
      {missing.length > 0 && (
        <Alert><AlertDescription><p className="font-medium">Still missing:</p><ul className="list-disc pl-5">{missing.map((m) => <li key={m}>{m}</li>)}</ul></AlertDescription></Alert>
      )}
      {r.finalized_at ? <Badge>Finalized</Badge> : <Button disabled={!ready} onClick={() => setConfirm(true)}>Finalize and release</Button>}
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Release this result?" description="This releases the result to the student and cannot be undone." confirmLabel="Finalize" destructive
        onConfirm={async () => { await fin.mutateAsync(placementId as any); toast.success('Result finalized'); }} />
    </div>
  );
}

export default function ResultsPage() {
  const { state, set } = useUrlState({ period: '' });
  const periods = rows(usePeriods({} as any).data);
  const periodId = state.period || periods[0]?.id;
  const summary = usePeriodSummary(periodId);
  const dash: any = useCoordinatorDashboard(periodId).data;
  const ready = new Set<string>((dash?.widgets?.results?.ready_to_finalize ?? []).map((r: any) => r.placement_id ?? r.id));
  const [sel, setSel] = useState<any>(null);

  return (
    <>
      <PageHeader
        title="Results"
        description="Preview and release final results."
        actions={
          <div className="flex items-center gap-2">
            <Label htmlFor="res-period">Period</Label>
            <Select value={periodId} onValueChange={(v) => set({ period: v })}>
              <SelectTrigger id="res-period" className="w-52"><SelectValue placeholder="Select a period" /></SelectTrigger>
              <SelectContent>{periods.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        }
      />
      {!periodId ? (
        <EmptyState title="No period yet" />
      ) : (
        <DataTable
          data={rows(summary.data)}
          isLoading={summary.isPending}
          error={summary.error}
          onRetry={() => void summary.refetch()}
          columns={[
            { header: 'Student', cell: (c) => nameOf(c.row.original.student) },
            { header: 'Total', cell: (c) => (c.row.original.total_percent != null ? formatPercent(c.row.original.total_percent) : '—') },
            { header: 'Grade', cell: (c) => c.row.original.grade ?? '—' },
            { header: 'Ready', cell: (c) => (ready.has(pick(c.row.original, 'placement_id', 'id')) ? <Badge>Ready</Badge> : <Badge variant="outline">Not ready</Badge>) },
          ]}
          rowActions={(r: any) => <Button size="sm" variant="outline" onClick={() => setSel(r)}>Preview</Button>}
        />
      )}
      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>{nameOf(sel?.student)}</SheetTitle><SheetDescription>Result preview</SheetDescription></SheetHeader>
          {sel && <Preview placementId={pick(sel, 'placement_id', 'id')} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
