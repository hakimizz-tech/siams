/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { FilterBar } from '@/components/shared/filter-bar';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { to } from '@/config/routes';
import { usePeriods } from '@/features/periods';
import { formatDateTime } from '@/lib/format';
import { nameOf, rows } from '@/lib/rows';
import { useUrlState } from '@/lib/use-url-state';
import { usePlacements } from '..';

const STATUSES = ['DRAFT', 'SUBMITTED', 'RETURNED', 'APPROVED', 'REJECTED', 'COMPLETED', 'TERMINATED'];

export default function PlacementsPage() {
  const { state, set } = useUrlState({ page: 1, search: '', status: 'SUBMITTED', period: '' });
  const periods = rows(usePeriods({} as any).data);
  const q = usePlacements({ ...state, status: state.status || undefined, period: state.period || undefined, search: state.search || undefined } as any);
  return (
    <>
      <PageHeader title="Placements" description="Review and approve placement requests." />
      <FilterBar
        state={state}
        set={set as any}
        search
        selects={[
          { name: 'status', label: 'Status', options: STATUSES.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() })) },
          { name: 'period', label: 'Period', options: periods.map((p: any) => ({ value: p.id, label: p.name })) },
        ]}
      />
      <DataTable
        data={q.data as any}
        isLoading={q.isPending}
        error={q.error}
        onRetry={() => void q.refetch()}
        state={state}
        onStateChange={set}
        rowHref={(r: any) => to.placementDetail(r.id)}
        emptyState={<EmptyState title="No placements match" />}
        columns={[
          { header: 'Student', cell: (c) => nameOf(c.row.original.student) },
          { header: 'Organisation', cell: (c) => nameOf(c.row.original.organization) },
          { header: 'Period', cell: (c) => nameOf(c.row.original.period) },
          { header: 'Status', cell: (c) => <StatusBadge kind="placement" status={c.row.original.status} /> },
          { header: 'Submitted', cell: (c) => (c.row.original.submitted_at ? formatDateTime(c.row.original.submitted_at) : '—') },
        ]}
      />
    </>
  );
}
