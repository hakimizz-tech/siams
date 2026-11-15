/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ApiErrorAlert } from '@/components/shared/api-error-alert';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { ProgressMeter } from '@/components/shared/progress-meter';
import { StatusBadge } from '@/components/shared/status-badge';
import { ROUTES, to } from '@/config/routes';
import { useMyPlacement } from '@/features/placements';
import { usePlacementSummary } from '@/features/reports';
import { hasStatus } from '@/lib/api/errors';
import { formatDate, formatHours } from '@/lib/format';
import { rows } from '@/lib/rows';
import { useCreateWeek, useLogbookTimeline } from '..';

function Weeks({ placement }: { placement: any }) {
  const navigate = useNavigate();
  const timeline = useLogbookTimeline(placement.id);
  const summary: any = usePlacementSummary(placement.id).data;
  const create = useCreateWeek();
  const [error, setError] = useState<unknown>();
  const list = Array.isArray(timeline.data) ? timeline.data : ((timeline.data as any)?.weeks ?? rows(timeline.data));

  const start = async (weekStart: string) => {
    setError(undefined);
    try {
      const entry: any = await create.mutateAsync({ placementId: placement.id, body: { week_start: weekStart, summary: '', activities: [] } } as any);
      navigate(to.logbookEntry(entry.id));
    } catch (e) {
      setError(e);
    }
  };

  return (
    <>
      <div className="mb-4 max-w-md">
        <ProgressMeter
          label="Approved hours"
          value={summary?.approved_hours ?? summary?.hours?.approved ?? 0}
          max={summary?.required_hours ?? summary?.hours?.required ?? 0}
          unit="h"
        />
      </div>
      <ApiErrorAlert error={error} />
      <DataTable
        data={list}
        isLoading={timeline.isPending}
        error={timeline.error}
        onRetry={() => void timeline.refetch()}
        emptyState={<EmptyState title="No weeks yet" description="Weeks appear once your placement starts." />}
        columns={[
          { header: 'Week starting', cell: (c) => formatDate(c.row.original.week_start) },
          { header: 'Status', cell: (c) => <StatusBadge kind="logbook" status={c.row.original.status} /> },
          { header: 'Claimed', cell: (c) => (c.row.original.claimed_hours != null ? formatHours(c.row.original.claimed_hours) : '—') },
          { header: 'Approved', cell: (c) => (c.row.original.approved_hours != null ? formatHours(c.row.original.approved_hours) : '—') },
        ]}
        rowActions={(w: any) =>
          w.entry_id || w.id ? (
            <Button asChild size="sm" variant="outline"><Link to={to.logbookEntry(w.entry_id ?? w.id)}>Open</Link></Button>
          ) : (
            <Button size="sm" disabled={create.isPending} onClick={() => void start(w.week_start)}>Start this week</Button>
          )
        }
      />
    </>
  );
}

export default function LogbookPage() {
  const mine = useMyPlacement();
  if (mine.isPending) return <LoadingState />;
  if (mine.error && !hasStatus(mine.error, 404)) return <ErrorState error={mine.error} onRetry={() => void mine.refetch()} />;
  const placement: any = hasStatus(mine.error, 404) ? null : mine.data;
  return (
    <>
      <PageHeader title="Logbook" description="One entry per week, written as daily lines." />
      {placement?.status === 'APPROVED' ? (
        <Weeks placement={placement} />
      ) : (
        <EmptyState title="Your placement must be approved first" action={<Button asChild><Link to={ROUTES.placement as string}>Go to my placement</Link></Button>} />
      )}
    </>
  );
}
