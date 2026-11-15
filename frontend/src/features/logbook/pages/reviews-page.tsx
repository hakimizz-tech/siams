/* eslint-disable @typescript-eslint/no-explicit-any */
import { Clock } from 'lucide-react';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { to } from '@/config/routes';
import { formatDate, formatDateTime } from '@/lib/format';
import { nameOf } from '@/lib/rows';
import { useUrlState } from '@/lib/use-url-state';
import { usePendingReviews } from '..';

export default function ReviewsPage() {
  const { state, set } = useUrlState({ page: 1 });
  const q = usePendingReviews(state as any);
  return (
    <>
      <PageHeader title="Weekly reviews" description="Entries waiting for your approval, oldest first." />
      <DataTable
        data={q.data as any}
        isLoading={q.isPending}
        error={q.error}
        onRetry={() => void q.refetch()}
        state={state}
        onStateChange={set}
        rowHref={(r: any) => to.review(r.id)}
        emptyState={<EmptyState title="Nothing to review" description="You are all caught up." />}
        columns={[
          { header: 'Student', cell: (c) => nameOf(c.row.original.student) },
          { header: 'Week starting', cell: (c) => formatDate(c.row.original.week_start) },
          { header: 'Submitted', cell: (c) => (c.row.original.submitted_at ? formatDateTime(c.row.original.submitted_at) : '—') },
          {
            header: 'Overdue',
            cell: (c) =>
              c.row.original.overdue ? (
                <span className="flex items-center gap-1 font-medium"><Clock className="size-3" aria-hidden /> Overdue</span>
              ) : null,
          },
        ]}
      />
    </>
  );
}
