/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { QueryBoundary } from '@/components/shared/query-boundary';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { to } from '@/config/routes';
import { useWorkplaceDashboard } from '@/features/dashboards';
import { nameOf } from '@/lib/rows';

export default function EvaluationsPage() {
  const q = useWorkplaceDashboard();
  return (
    <>
      <PageHeader title="Evaluations" description="Interns you have not evaluated yet." />
      <QueryBoundary query={q as any} empty={(d: any) => (d?.widgets?.evaluations_due ?? []).length === 0} emptyState={<EmptyState title="No evaluations due" />}>
        {(d: any) => (
          <DataTable
            data={d.widgets.evaluations_due}
            columns={[{ header: 'Student', cell: (c) => nameOf(c.row.original.student) }]}
            rowActions={(r: any) => <Button asChild size="sm"><Link to={to.evaluation(r.placement_id)}>Evaluate</Link></Button>}
          />
        )}
      </QueryBoundary>
    </>
  );
}
