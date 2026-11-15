/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useAcademicDashboard,
  useCoordinatorDashboard,
  useStudentDashboard,
  useWorkplaceDashboard,
} from '..';
import { useAuth } from '@/lib/auth/use-auth';
import { usePeriods } from '@/features/periods';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { rows } from '@/lib/rows';
import { useUrlState } from '@/lib/use-url-state';
import { DashView } from '../components/dashboard-shell';
import { AcademicWidgets } from '../components/academic-widgets';
import { CoordinatorWidgets } from '../components/coordinator-widgets';
import { StudentWidgets } from '../components/student-widgets';
import { WorkplaceWidgets } from '../components/workplace-widgets';

function Student() {
  const q = useStudentDashboard();
  return <DashView query={q}>{(w) => <StudentWidgets w={w} />}</DashView>;
}
function Workplace() {
  const q = useWorkplaceDashboard();
  return <DashView query={q}>{(w) => <WorkplaceWidgets w={w} />}</DashView>;
}
function Academic() {
  const q = useAcademicDashboard();
  return <DashView query={q}>{(w) => <AcademicWidgets w={w} />}</DashView>;
}
function Coordinator() {
  const { state, set } = useUrlState({ period: '' });
  const periods = rows(usePeriods({}).data);
  const q = useCoordinatorDashboard(state.period || undefined);
  const picker = (
    <div className="flex items-center gap-2">
      <Label htmlFor="dash-period">Period</Label>
      <Select value={state.period || undefined} onValueChange={(v) => set({ period: v })}>
        <SelectTrigger id="dash-period" className="w-52">
          <SelectValue placeholder="Latest period" />
        </SelectTrigger>
        <SelectContent>
          {periods.map((p: any) => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
  return <DashView query={q} actions={picker}>{(w) => <CoordinatorWidgets w={w} />}</DashView>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  switch ((user as any)?.role) {
    case 'STUDENT':
      return <Student />;
    case 'WORKPLACE_SUPERVISOR':
      return <Workplace />;
    case 'ACADEMIC_SUPERVISOR':
      return <Academic />;
    case 'COORDINATOR':
      return <Coordinator />;
    default:
      return null;
  }
}
