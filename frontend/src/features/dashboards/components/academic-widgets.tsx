/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link } from 'react-router-dom';
import { Panel } from '@/components/shared/panel';
import { StatusBadge } from '@/components/shared/status-badge';
import { ROUTES, to } from '@/config/routes';
import { formatDateTime } from '@/lib/format';
import { nameOf } from '@/lib/rows';

export function AcademicWidgets({ w }: { w: any }) {
  return (
    <>
      <div className="md:col-span-2">
        <Panel title="My students">
          {(w.students ?? []).length === 0 ? (
            <p className="text-muted-foreground">No students assigned.</p>
          ) : (
            <ul className="divide-y">
              {w.students.map((s: any) => (
                <li key={s.placement_id} className="flex items-center justify-between py-2">
                  <Link className="underline-offset-4 hover:underline" to={to.student(s.placement_id)}>
                    {nameOf(s.student)}
                  </Link>
                  {s.indicator && <StatusBadge kind="indicator" status={s.indicator} />}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <Panel title="Logbook monitor">
        <ul className="space-y-1">
          {(w.logbook_monitor ?? []).map((m: any) => (
            <li key={m.placement_id ?? nameOf(m.student)} className="flex justify-between">
              <span>{nameOf(m.student)}</span>
              <span className="tabular-nums text-muted-foreground">
                {m.approved ?? 0} approved · {m.submitted ?? 0} submitted · {m.missing ?? 0} missing / {m.expected ?? 0}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Visits" action={<Link className="text-sm underline" to={ROUTES.visits as string}>Open</Link>}>
        <p className="font-medium">Due</p>
        <ul className="mb-2">{(w.visits?.due ?? []).map((v: any) => <li key={v.placement_id}>{nameOf(v.student)}: {v.done} of {v.required} done</li>)}</ul>
        <p className="font-medium">Upcoming</p>
        <ul>{(w.visits?.upcoming ?? []).map((v: any, i: number) => <li key={v.id ?? i}>{formatDateTime(v.scheduled_at)} · {nameOf(v.student)}</li>)}</ul>
      </Panel>
      <Panel title="Assessments due">
        <ul>
          {(w.assessments_due ?? []).map((a: any) => (
            <li key={a.placement_id}>
              <Link className="underline-offset-4 hover:underline" to={to.assessment(a.placement_id)}>{nameOf(a.student)}</Link>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Final reports to review" action={<Link className="text-sm underline" to={ROUTES.finalReports as string}>Open</Link>}>
        <p>{(w.final_reports ?? []).length} awaiting your decision</p>
      </Panel>
      <Panel title="Flags" action={<Link className="text-sm underline" to={ROUTES.flags as string}>Open</Link>}>
        <p>{Array.isArray(w.flags) ? w.flags.length : (w.flags?.total ?? 0)} unresolved</p>
      </Panel>
    </>
  );
}
