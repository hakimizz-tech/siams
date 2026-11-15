/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { PageHeader } from '@/components/shared/page-header';
import { ProgressMeter } from '@/components/shared/progress-meter';
import { StatusBadge } from '@/components/shared/status-badge';
import { ROUTES, to } from '@/config/routes';
import { useMyPlacement } from '@/features/placements';
import { usePlacementSummary } from '@/features/reports';
import { hasStatus } from '@/lib/api/errors';
import { formatDate, formatHours, toDateOnly } from '@/lib/format';
import { useLogbookTimeline } from '..';
import { timelineRows, weekEntry } from '../week-entry';

/** Hours progress. A failed summary must never look like "0 hours approved". */
function HoursProgress({ placementId }: { placementId: string }) {
  const q = usePlacementSummary(placementId);
  if (q.isPending) return <Skeleton className="mb-4 h-8 max-w-md" />;
  if (q.error) {
    return <p className="mb-4 text-sm text-muted-foreground">Hours progress is unavailable right now.</p>;
  }
  const s: any = q.data ?? {};
  return (
    <div className="mb-4 max-w-md">
      <ProgressMeter
        label="Approved hours"
        value={s.approved_hours ?? s.hours?.approved ?? 0}
        max={s.required_hours ?? s.hours?.required ?? 0}
        unit="h"
      />
    </div>
  );
}

function Weeks({ placement }: { placement: any }) {
  const timeline = useLogbookTimeline(placement.id);
  const list = timelineRows(timeline.data);
  const today = toDateOnly(new Date());

  return (
    <>
      <HoursProgress placementId={placement.id} />
      <DataTable
        data={list}
        isLoading={timeline.isPending}
        error={timeline.error}
        onRetry={() => void timeline.refetch()}
        emptyState={<EmptyState title="No weeks yet" description="Weeks appear once your placement starts." />}
        columns={[
          { header: 'Week starting', cell: (c) => formatDate(c.row.original.week_start) },
          { header: 'Status', cell: (c) => <StatusBadge kind="logbook" status={c.row.original.status} /> },
          {
            header: 'Claimed',
            cell: (c) => {
              const v = weekEntry(c.row.original).claimed;
              return v != null ? formatHours(v as any) : '—';
            },
          },
          {
            header: 'Approved',
            cell: (c) => {
              const v = weekEntry(c.row.original).approved;
              return v != null ? formatHours(v as any) : '—';
            },
          },
        ]}
        rowActions={(w: any) => {
          const { id } = weekEntry(w);
          if (id) {
            return (
              <Button asChild size="sm" variant="outline">
                <Link to={to.logbookEntry(id)}>Open</Link>
              </Button>
            );
          }
          // A week that has any status other than MISSING already exists: never offer to create it again.
          if (w.status !== 'MISSING') return null;
          if (w.week_start > today) return <span className="text-xs text-muted-foreground">Not started yet</span>;
          // Nothing is created yet: the week is saved on the first save in the editor.
          return (
            <Button asChild size="sm">
              <Link to={`${to.logbookEntry('new')}?week=${w.week_start}`}>Start this week</Link>
            </Button>
          );
        }}
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
        <EmptyState
          title="Your placement must be approved first"
          action={
            <Button asChild>
              <Link to={ROUTES.placement as string}>Go to my placement</Link>
            </Button>
          }
        />
      )}
    </>
  );
}
