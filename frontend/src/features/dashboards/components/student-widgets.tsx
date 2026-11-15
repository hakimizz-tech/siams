/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Panel } from '@/components/shared/panel';
import { ProgressMeter } from '@/components/shared/progress-meter';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { Timeline } from '@/components/shared/timeline';
import { ROUTES } from '@/config/routes';
import { formatDateTime, formatPercent } from '@/lib/format';
import { nameOf } from '@/lib/rows';

export function StudentWidgets({ w }: { w: any }) {
  const p = w.placement;
  const wk = w.progress?.weeks ?? {};
  return (
    <>
      <Panel title="Placement" action={<Link className="text-sm underline" to={ROUTES.placement as string}>Open</Link>}>
        {p ? (
          <div className="space-y-2">
            <StatusBadge kind="placement" status={p.status} />
            <p>{nameOf(p.organization)}</p>
            {p.coordinator_remarks && (
              <Alert>
                <AlertDescription className="whitespace-pre-wrap">{p.coordinator_remarks}</AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <Button asChild>
            <Link to={ROUTES.placement as string}>Submit your placement details</Link>
          </Button>
        )}
      </Panel>
      <Panel title="History">
        <Timeline events={(w.timeline ?? []).map((t: any) => ({ label: <StatusBadge kind="placement" status={t.status ?? t.to_status} />, at: t.at ?? t.created_at, by: nameOf(t.by ?? t.changed_by), note: t.remarks ?? t.note }))} />
      </Panel>
      <Panel title="Progress">
        <div className="space-y-3">
          <ProgressMeter label="Approved hours" value={w.progress?.approved_hours ?? 0} max={w.progress?.required_hours ?? 0} unit="h" />
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Approved weeks" value={wk.approved ?? 0} />
            <StatCard label="Submitted" value={wk.submitted ?? 0} />
            <StatCard label="Returned" value={wk.returned ?? 0} />
            <StatCard label="Missing" value={wk.missing ?? 0} />
          </div>
        </div>
      </Panel>
      <Panel title="Recent feedback">
        {(w.recent_feedback ?? []).length === 0 ? (
          <p className="text-muted-foreground">No feedback yet.</p>
        ) : (
          <ul className="space-y-2">
            {w.recent_feedback.map((f: any, i: number) => (
              <li key={f.id ?? i}>
                <p className="whitespace-pre-wrap">{f.comment}</p>
                <p className="text-xs text-muted-foreground">{[nameOf(f.author), f.created_at ? formatDateTime(f.created_at) : ''].filter(Boolean).join(' · ')}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Upcoming visits">
        {(w.upcoming_visits ?? []).length === 0 ? (
          <p className="text-muted-foreground">None scheduled.</p>
        ) : (
          <ul>{w.upcoming_visits.map((v: any, i: number) => <li key={v.id ?? i}>{formatDateTime(v.scheduled_at)} · {v.mode}</li>)}</ul>
        )}
      </Panel>
      <Panel title="Final report" action={<Link className="text-sm underline" to={ROUTES.finalReport as string}>Open</Link>}>
        {w.final_report ? (
          <div className="space-y-1">
            <StatusBadge kind="report" status={w.final_report.status} />
            {w.final_report.feedback && <p className="whitespace-pre-wrap">{w.final_report.feedback}</p>}
          </div>
        ) : (
          <p className="text-muted-foreground">Not uploaded yet.</p>
        )}
      </Panel>
      {w.result && (
        <Panel title="Result" action={<Link className="text-sm underline" to={ROUTES.result as string}>Open</Link>}>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Total" value={formatPercent(w.result.total_percent)} />
            <StatCard label="Grade" value={w.result.grade} />
          </div>
        </Panel>
      )}
    </>
  );
}
