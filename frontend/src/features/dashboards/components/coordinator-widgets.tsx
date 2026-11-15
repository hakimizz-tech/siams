/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { Panel } from '@/components/shared/panel';
import { ProgressMeter } from '@/components/shared/progress-meter';
import { StatCard } from '@/components/shared/stat-card';
import { ROUTES, to } from '@/config/routes';
import { nameOf } from '@/lib/rows';

export function CoordinatorWidgets({ w }: { w: any }) {
  if (w.period === null) {
    return (
      <div className="md:col-span-2">
        <EmptyState
          title="No internship period yet"
          description="Create a period to start receiving placements."
          action={<Button asChild><Link to={ROUTES.periods as string}>Create a period</Link></Button>}
        />
      </div>
    );
  }
  const counts = w.pipeline?.counts ?? {};
  const pr = w.progress ?? {};
  return (
    <>
      <div className="md:col-span-2">
        <Panel title="Placement pipeline">
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.entries(counts).map(([k, v]) => (
              <StatCard key={k} label={k.charAt(0) + k.slice(1).toLowerCase()} value={String(v)} />
            ))}
          </div>
          <p className="mb-1 font-medium">Awaiting approval</p>
          <ul className="divide-y">
            {(w.pipeline?.awaiting_approval ?? []).map((p: any) => (
              <li key={p.placement_id ?? p.id} className="py-2">
                <Link className="underline-offset-4 hover:underline" to={to.placementDetail(p.placement_id ?? p.id)}>
                  {nameOf(p.student)} · {nameOf(p.organization)}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel title="Supervisor workload">
        <ul>
          {(w.supervisor_assignment?.workload ?? []).map((s: any, i: number) => (
            <li key={i} className="flex justify-between">
              <span>{nameOf(s.supervisor)}</span>
              <span className="tabular-nums">{s.students ?? s.count}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-muted-foreground">{(w.supervisor_assignment?.pending_assignment ?? []).length} placement(s) need a supervisor</p>
      </Panel>
      <Panel title="Overall progress">
        <div className="space-y-3">
          <ProgressMeter label="Approved hours" value={pr.approved_hours ?? 0} max={pr.required_hours ?? 0} unit="h" />
          <ProgressMeter label="Weeks approved" value={pr.weeks_approved ?? 0} max={pr.weeks_expected ?? 0} />
          <p className="text-muted-foreground">Logbook compliance: {pr.logbook_compliance_percent ?? 0}%</p>
        </div>
      </Panel>
      <Panel title="Flags" action={<Link className="text-sm underline" to={ROUTES.flags as string}>Open</Link>}>
        <p className="mb-1 font-medium">{w.flags?.total ?? 0} unresolved</p>
        <ul>{Object.entries(w.flags?.by_type ?? {}).map(([k, v]) => <li key={k}>{k}: {String(v)}</li>)}</ul>
      </Panel>
      <Panel title="Assessments and reports">
        <div className="space-y-3">
          <ProgressMeter label="Assessments submitted" value={w.assessments?.submitted ?? 0} max={w.assessments?.expected ?? 0} />
          <p>
            Reports: {w.final_reports?.SUBMITTED ?? 0} submitted · {w.final_reports?.ACCEPTED ?? 0} accepted · {w.final_reports?.RETURNED ?? 0} returned
          </p>
        </div>
      </Panel>
      <Panel title="Results" action={<Link className="text-sm underline" to={ROUTES.results as string}>Open</Link>}>
        <p>{(w.results?.ready_to_finalize ?? []).length} ready to finalize · {w.results?.finalized ?? 0} finalized</p>
      </Panel>
    </>
  );
}
