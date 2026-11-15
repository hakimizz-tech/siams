/* eslint-disable @typescript-eslint/no-explicit-any */
import { EmptyState } from '@/components/shared/empty-state';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { ProgressMeter } from '@/components/shared/progress-meter';
import { StatusBadge } from '@/components/shared/status-badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { to } from '@/config/routes';
import { useAcademicDashboard } from '@/features/dashboards';
import { usePeriods } from '@/features/periods';
import { nameOf, pick, rows } from '@/lib/rows';
import { useUrlState } from '@/lib/use-url-state';
import { usePeriodSummary } from '..';

export default function StudentsPage() {
  const { state, set } = useUrlState({ period: '' });
  const periods = rows(usePeriods({} as any).data);
  const periodId = state.period || periods[0]?.id;
  const summary = usePeriodSummary(periodId);
  const dash: any = useAcademicDashboard().data;
  const indicators = new Map<string, string>((dash?.widgets?.students ?? []).map((s: any) => [s.placement_id, s.indicator]));

  return (
    <>
      <PageHeader
        title="Students"
        description="Your students and how they are progressing."
        actions={
          <div className="flex items-center gap-2">
            <Label htmlFor="stu-period">Period</Label>
            <Select value={periodId} onValueChange={(v) => set({ period: v })}>
              <SelectTrigger id="stu-period" className="w-52"><SelectValue placeholder="Select a period" /></SelectTrigger>
              <SelectContent>{periods.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        }
      />
      {!periodId ? (
        <EmptyState title="No period selected" />
      ) : (
        <DataTable
          data={rows(summary.data)}
          isLoading={summary.isPending}
          error={summary.error}
          onRetry={() => void summary.refetch()}
          rowHref={(r: any) => to.student(pick(r, 'placement_id', 'placement', 'id'))}
          columns={[
            { header: 'Student', cell: (c) => nameOf(c.row.original.student) },
            { header: 'Organisation', cell: (c) => nameOf(c.row.original.organization) },
            { header: 'Status', cell: (c) => <StatusBadge kind="placement" status={c.row.original.status} /> },
            { header: 'Hours', cell: (c) => <ProgressMeter label="Hours" value={pick(c.row.original, 'approved_hours') ?? 0} max={pick(c.row.original, 'required_hours') ?? 0} unit="h" /> },
            { header: 'Weeks', cell: (c) => `${pick(c.row.original, 'weeks_approved') ?? 0}/${pick(c.row.original, 'weeks_expected') ?? 0} (${pick(c.row.original, 'weeks_missing') ?? 0} missing)` },
            { header: 'Visits', cell: (c) => `${pick(c.row.original, 'visits_done') ?? 0}/${pick(c.row.original, 'visits_required') ?? 0}` },
            { header: 'Report', cell: (c) => (c.row.original.report_status ? <StatusBadge kind="report" status={c.row.original.report_status} /> : '—') },
            {
              header: 'Indicator',
              cell: (c) => {
                const i = indicators.get(pick(c.row.original, 'placement_id', 'id'));
                return i ? <StatusBadge kind="indicator" status={i} /> : '—';
              },
            },
          ]}
        />
      )}
    </>
  );
}
