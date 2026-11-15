/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DataTable } from '@/components/shared/data-table';
import { DefList } from '@/components/shared/def-list';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingState } from '@/components/shared/loading-state';
import { PageHeader } from '@/components/shared/page-header';
import { ProgressMeter } from '@/components/shared/progress-meter';
import { QueryBoundary } from '@/components/shared/query-boundary';
import { useWorkplaceDashboard } from '@/features/dashboards';
import { nameOf } from '@/lib/rows';
import { usePlacementSummary } from '..';

function Detail({ id }: { id: string }) {
  const q = usePlacementSummary(id);
  if (q.isPending) return <LoadingState variant="card" />;
  const s: any = q.data ?? {};
  return (
    <DefList
      items={[
        ['Hours', `${s.approved_hours ?? s.hours?.approved ?? 0} / ${s.required_hours ?? s.hours?.required ?? 0}`],
        ['Weeks approved', String(s.weeks?.approved ?? s.weeks_approved ?? '—')],
        ['Weeks missing', String(s.weeks?.missing ?? s.weeks_missing ?? '—')],
        ['Open flags', String(Array.isArray(s.flags) ? s.flags.length : (s.flags?.open ?? s.flags ?? 0))],
      ]}
    />
  );
}

export default function InternsPage() {
  const q = useWorkplaceDashboard();
  const [selected, setSelected] = useState<any>(null);
  return (
    <>
      <PageHeader title="Interns" description="Interns assigned to you and their progress." />
      <QueryBoundary query={q as any} empty={(d: any) => (d?.widgets?.interns ?? []).length === 0} emptyState={<EmptyState title="No interns assigned yet" />}>
        {(d: any) => (
          <DataTable
            data={d.widgets.interns}
            columns={[
              { header: 'Student', cell: (c) => nameOf(c.row.original.student) },
              { header: 'Hours', cell: (c) => <ProgressMeter label="Approved hours" value={c.row.original.approved_hours ?? 0} max={c.row.original.required_hours ?? 0} unit="h" /> },
            ]}
            rowActions={(row: any) => <Button size="sm" variant="outline" onClick={() => setSelected(row)}>Details</Button>}
          />
        )}
      </QueryBoundary>
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{nameOf(selected?.student)}</SheetTitle>
            <SheetDescription>Placement summary</SheetDescription>
          </SheetHeader>
          {selected && <div className="mt-4"><Detail id={selected.placement_id} /></div>}
        </SheetContent>
      </Sheet>
    </>
  );
}
