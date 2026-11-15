/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EntityCombobox } from '@/components/shared/entity-combobox';
import { FormDialog } from '@/components/shared/form-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { Panel } from '@/components/shared/panel';
import { QueryBoundary } from '@/components/shared/query-boundary';
import { StatusBadge } from '@/components/shared/status-badge';
import { Timeline } from '@/components/shared/timeline';
import { ROUTES } from '@/config/routes';
import { useSupervisors } from '@/features/users';
import { can } from '@/lib/auth/permissions';
import { useAuth } from '@/lib/auth/use-auth';
import { hasStatus } from '@/lib/api/errors';
import { idOf, nameOf, rows } from '@/lib/rows';
import { PlacementSummary } from '../components/placement-summary';
import {
  useApprovePlacement,
  useAssignSupervisors,
  useCompletePlacement,
  usePlacement,
  usePlacementTimeline,
  useRejectPlacement,
  useReturnPlacement,
  useTerminatePlacement,
} from '..';

const supSearch = (role: string) =>
  function useSearch(term: string) {
    const q = useSupervisors(role as any);
    const t = term.toLowerCase();
    return {
      data: rows(q.data).filter((u: any) => !t || `${u.full_name} ${u.email}`.toLowerCase().includes(t)).map((u: any) => ({ id: u.id, label: `${u.full_name} (${u.email})` })),
      isFetching: q.isFetching,
    };
  };
const useAcademicSearch = supSearch('ACADEMIC_SUPERVISOR');
const useWorkplaceSearch = supSearch('WORKPLACE_SUPERVISOR');

function SupervisorDialog({ mode, placement, open, onOpenChange, onChanged }: { mode: 'approve' | 'assign'; placement: any; open: boolean; onOpenChange: (o: boolean) => void; onChanged: () => void }) {
  const approve = useApprovePlacement();
  const assign = useAssignSupervisors();
  const [ac, setAc] = useState(idOf(placement.academic_supervisor) ?? '');
  const [ws, setWs] = useState(idOf(placement.workplace_supervisor) ?? '');
  const [invite, setInvite] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [local, setLocal] = useState<string[]>([]);
  const [error, setError] = useState<unknown>();

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'approve' ? 'Approve placement' : 'Reassign supervisors'}
      submitLabel={mode === 'approve' ? 'Approve' : 'Save'}
      isPending={approve.isPending || assign.isPending}
      formErrors={[...local, ...(error ? [String((error as any).message ?? error)] : [])]}
      onSubmit={async (e) => {
        e.preventDefault();
        setError(undefined);
        const problems: string[] = [];
        if (!ac) problems.push('Choose an academic supervisor.');
        if (!ws && !invite) problems.push('Choose an industrial supervisor, or invite the proposed one.');
        setLocal(problems);
        if (problems.length) return;
        try {
          const body: any = { academic_supervisor: ac, ...(ws && !invite ? { workplace_supervisor: ws } : {}), ...(invite ? { invite_workplace_supervisor: true } : {}) };
          if (mode === 'approve') {
            if (remarks.trim()) body.remarks = remarks.trim();
            await approve.mutateAsync({ id: placement.id, body } as any);
            toast.success('Placement approved');
          } else {
            await assign.mutateAsync({ id: placement.id, body } as any);
            toast.success('Supervisors updated');
          }
          onOpenChange(false);
          onChanged();
        } catch (err) {
          if (hasStatus(err, 409)) { toast.error('This placement changed. Showing the latest state.'); onOpenChange(false); onChanged(); }
          else setError(err);
        }
      }}
    >
      <div className="space-y-1">
        <Label>Academic supervisor</Label>
        <EntityCombobox value={ac} onChange={(id) => setAc(id)} useSearch={useAcademicSearch} minChars={0} initialLabel={nameOf(placement.academic_supervisor) || undefined} placeholder="Choose academic supervisor" ariaLabel="Academic supervisor" />
      </div>
      <div className="space-y-2">
        <Label>Industrial supervisor</Label>
        {!invite && <EntityCombobox value={ws} onChange={(id) => setWs(id)} useSearch={useWorkplaceSearch} minChars={0} initialLabel={nameOf(placement.workplace_supervisor) || undefined} placeholder="Choose industrial supervisor" ariaLabel="Industrial supervisor" />}
        <div className="flex items-center gap-2">
          <Switch id="invite" checked={invite} onCheckedChange={setInvite} />
          <Label htmlFor="invite">Invite the proposed supervisor</Label>
        </div>
        {invite && (
          <p className="text-sm text-muted-foreground">
            An account will be created for {placement.proposed_supervisor_name} ({placement.proposed_supervisor_email}) and a set-password link emailed.
          </p>
        )}
      </div>
      {mode === 'approve' && (
        <div className="space-y-1">
          <Label htmlFor="remarks">Remarks (optional)</Label>
          <Textarea id="remarks" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>
      )}
    </FormDialog>
  );
}

export default function PlacementDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const q = usePlacement(id);
  const tl = usePlacementTimeline(id);
  const ret = useReturnPlacement();
  const rej = useRejectPlacement();
  const done = useCompletePlacement();
  const term = useTerminatePlacement();
  const [dlg, setDlg] = useState<'approve' | 'assign' | 'return' | 'reject' | 'complete' | 'terminate' | null>(null);

  const guard = (refetch: () => unknown, fn: () => Promise<void>) => async () => {
    try { await fn(); } catch (e) { if (hasStatus(e, 409)) { toast.error('This placement changed. Showing the latest state.'); void refetch(); } else throw e; }
  };

  return (
    <>
      <PageHeader title="Placement" breadcrumbs={[{ label: 'Placements', to: ROUTES.placements as string }, { label: 'Detail' }]} />
      <QueryBoundary query={q as any}>
        {(p: any) => {
          const submitted = p.status === 'SUBMITTED';
          const approved = p.status === 'APPROVED';
          const mayDecide = can(user as any, 'placement:approve' as any);
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge kind="placement" status={p.status} />
                <span className="font-medium">{nameOf(p.student)}</span>
                {mayDecide && submitted && (
                  <>
                    <Button onClick={() => setDlg('approve')}>Approve</Button>
                    <Button variant="outline" onClick={() => setDlg('return')}>Return</Button>
                    <Button variant="outline" onClick={() => setDlg('reject')}>Reject</Button>
                  </>
                )}
                {mayDecide && approved && (
                  <>
                    <Button variant="outline" onClick={() => setDlg('assign')}>Reassign supervisors</Button>
                    <Button variant="outline" onClick={() => setDlg('complete')}>Complete</Button>
                    <Button variant="outline" onClick={() => setDlg('terminate')}>Terminate</Button>
                  </>
                )}
              </div>
              {submitted && p.organization && !p.organization.is_verified && (
                <Alert><AlertDescription>This organisation will be verified when you approve the placement.</AlertDescription></Alert>
              )}
              <Panel title="Details"><PlacementSummary placement={p} /></Panel>
              <Panel title="History">
                <Timeline events={rows(tl.data).map((t: any) => ({ label: <StatusBadge kind="placement" status={t.status ?? t.to_status} />, at: t.at ?? t.created_at, by: nameOf(t.by ?? t.changed_by), note: t.remarks ?? t.note }))} />
              </Panel>

              {dlg === 'approve' && <SupervisorDialog mode="approve" placement={p} open onOpenChange={(o) => !o && setDlg(null)} onChanged={() => void q.refetch()} />}
              {dlg === 'assign' && <SupervisorDialog mode="assign" placement={p} open onOpenChange={(o) => !o && setDlg(null)} onChanged={() => void q.refetch()} />}

              <ConfirmDialog open={dlg === 'return'} onOpenChange={(o) => !o && setDlg(null)} title="Return to the student?" description="They will be asked to correct and resubmit." confirmLabel="Return" requireReason={{ label: 'Remarks (required)' }}
                onConfirm={(r) => guard(q.refetch, async () => { await ret.mutateAsync({ id, remarks: r! } as any); toast.success('Returned'); })()} />
              <ConfirmDialog open={dlg === 'reject'} onOpenChange={(o) => !o && setDlg(null)} title="Reject this placement?" description="This is final. The student will have to start a new request." confirmLabel="Reject" destructive requireReason={{ label: 'Remarks (required)' }}
                onConfirm={(r) => guard(q.refetch, async () => { await rej.mutateAsync({ id, remarks: r! } as any); toast.success('Rejected'); })()} />
              <ConfirmDialog open={dlg === 'complete'} onOpenChange={(o) => !o && setDlg(null)} title="Mark as completed?" description="The placement will be closed." confirmLabel="Complete"
                onConfirm={() => guard(q.refetch, async () => { await done.mutateAsync(id as any); toast.success('Completed'); })()} />
              <ConfirmDialog open={dlg === 'terminate'} onOpenChange={(o) => !o && setDlg(null)} title="Terminate this placement?" description="It ends the placement early." confirmLabel="Terminate" destructive requireReason={{ label: 'Reason (required)' }}
                onConfirm={(r) => guard(q.refetch, async () => { await term.mutateAsync({ id, reason: r! } as any); toast.success('Terminated'); })()} />
            </div>
          );
        }}
      </QueryBoundary>
    </>
  );
}
