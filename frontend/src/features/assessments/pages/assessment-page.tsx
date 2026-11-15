/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { Panel } from '@/components/shared/panel';
import { ROUTES, to } from '@/config/routes';
import { usePlacementSummary } from '@/features/reports';
import { AssessmentEditor } from '../components/assessment-editor';

export default function AssessmentPage() {
  const { placementId = '' } = useParams();
  const s: any = usePlacementSummary(placementId).data;
  return (
    <>
      <PageHeader title="Assessment" breadcrumbs={[{ label: 'Students', to: ROUTES.students as string }, { label: 'Student', to: to.student(placementId) }, { label: 'Assessment' }]} />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <AssessmentEditor placementId={placementId} />
        <aside>
          <Panel title="Context">
            {s ? (
              <ul className="space-y-1">
                <li>Approved hours: {s.approved_hours ?? s.hours?.approved ?? 0} / {s.required_hours ?? s.hours?.required ?? 0}</li>
                <li>Weeks missing: {s.weeks?.missing ?? s.weeks_missing ?? '—'}</li>
                <li>Open flags: {Array.isArray(s.flags) ? s.flags.length : (s.flags?.open ?? s.flags ?? 0)}</li>
              </ul>
            ) : (
              <p className="text-muted-foreground">Loading summary…</p>
            )}
            <Button asChild variant="outline" className="mt-3"><Link to={ROUTES.finalReports as string}>Final reports</Link></Button>
          </Panel>
        </aside>
      </div>
    </>
  );
}
