/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Panel } from '@/components/shared/panel';
import { ProgressMeter } from '@/components/shared/progress-meter';
import { to } from '@/config/routes';
import { formatDate } from '@/lib/format';
import { nameOf } from '@/lib/rows';

export function WorkplaceWidgets({ w }: { w: any }) {
  const pending: any[] = w.pending_reviews ?? [];
  return (
    <>
      <div className="md:col-span-2">
        <Panel title={`Weekly entries awaiting approval${w.overdue_reviews ? ` (${w.overdue_reviews} overdue)` : ''}`}>
          {pending.length === 0 ? (
            <p className="text-muted-foreground">No entries waiting.</p>
          ) : (
            <ul className="divide-y">
              {pending.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2">
                  <Link className="underline-offset-4 hover:underline" to={to.review(e.id)}>
                    {nameOf(e.student)} · week of {formatDate(e.week_start)}
                  </Link>
                  {e.overdue && (
                    <span className="flex items-center gap-1 text-xs font-medium">
                      <Clock className="size-3" aria-hidden /> Overdue
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <Panel title="My interns">
        <div className="space-y-4">
          {(w.interns ?? []).length === 0 && <p className="text-muted-foreground">No interns assigned.</p>}
          {(w.interns ?? []).map((i: any) => (
            <div key={i.placement_id}>
              <p className="mb-1 font-medium">{nameOf(i.student)}</p>
              <ProgressMeter label="Approved hours" value={i.approved_hours ?? 0} max={i.required_hours ?? 0} unit="h" />
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Evaluations due">
        {(w.evaluations_due ?? []).length === 0 ? (
          <p className="text-muted-foreground">Nothing to evaluate.</p>
        ) : (
          <ul>
            {w.evaluations_due.map((e: any) => (
              <li key={e.placement_id}>
                <Link className="underline-offset-4 hover:underline" to={to.evaluation(e.placement_id)}>
                  {nameOf(e.student)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
