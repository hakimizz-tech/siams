/* eslint-disable @typescript-eslint/no-explicit-any */
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { PageHeader } from '@/components/shared/page-header';
import { Panel } from '@/components/shared/panel';
import { StatCard } from '@/components/shared/stat-card';
import { DataTable } from '@/components/shared/data-table';
import { useMyPlacement } from '@/features/placements';
import { hasStatus } from '@/lib/api/errors';
import { formatPercent } from '@/lib/format';
import { nameOf, rows } from '@/lib/rows';
import { useAssessments, useResult } from '..';

function Released({ placementId }: { placementId: string }) {
  const result = useResult(placementId);
  const assessments = useAssessments(placementId);
  if (result.isPending) return <LoadingState variant="card" />;
  // 404 means "not released yet", not an error.
  if (hasStatus(result.error, 404)) return <EmptyState title="Your result has not been released yet" description="You will be emailed when the coordinator releases it." />;
  if (result.error) return <ErrorState error={result.error} onRetry={() => void result.refetch()} />;
  const r: any = result.data;
  const breakdown: any[] = r.breakdown ?? r.forms ?? [];
  return (
    <div className="space-y-4">
      <div className="grid max-w-md grid-cols-2 gap-3">
        <StatCard label="Total" value={formatPercent(r.total_percent ?? r.total)} />
        <StatCard label="Grade" value={r.grade ?? '—'} />
      </div>
      <Panel title="Breakdown">
        <DataTable
          data={breakdown}
          columns={[
            { header: 'Form', cell: (c) => c.row.original.name ?? c.row.original.form_name },
            { header: 'Weight', cell: (c) => `${c.row.original.weight_percent ?? c.row.original.weight ?? ''}%` },
            { header: 'Percent', cell: (c) => formatPercent(c.row.original.percent) },
          ]}
        />
      </Panel>
      {rows(assessments.data).map((a: any) => (
        <Panel key={a.id} title={`${nameOf(a.form)} — ${nameOf(a.assessor)}`}>
          <ul className="space-y-1">
            {(a.scores ?? []).map((s: any, i: number) => (
              <li key={s.id ?? i}>
                {nameOf(s.criterion) || s.criterion_name}: {s.score ?? '—'} {s.remark && <span className="text-muted-foreground">— {s.remark}</span>}
              </li>
            ))}
          </ul>
          {a.comment && <p className="mt-2 whitespace-pre-wrap">{a.comment}</p>}
        </Panel>
      ))}
    </div>
  );
}

export default function ResultPage() {
  const mine = useMyPlacement();
  if (mine.isPending) return <LoadingState />;
  const placement: any = hasStatus(mine.error, 404) ? null : mine.data;
  return (
    <>
      <PageHeader title="Result" />
      {placement ? <Released placementId={placement.id} /> : <EmptyState title="No placement yet" />}
    </>
  );
}
