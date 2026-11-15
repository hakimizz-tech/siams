/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { FilterBar } from '@/components/shared/filter-bar';
import { FormDialog } from '@/components/shared/form-dialog';
import { SelectField, TextField, TextareaField } from '@/components/shared/form-fields';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { usePlacements } from '@/features/placements';
import { applyApiErrors } from '@/lib/form';
import { formatDateTime } from '@/lib/format';
import { nameOf, rows } from '@/lib/rows';
import { useUrlState } from '@/lib/use-url-state';
import { useZodForm } from '@/lib/use-zod-form';
import { useCompleteVisit, useScheduleVisit, useUpdateVisit, useVisits } from '..';

const schedSchema = z.object({ placement: z.string().min(1, 'Choose a student'), mode: z.string().min(1, 'Required'), scheduled_at: z.string().min(1, 'Required'), meeting_link: z.string().optional() });
const doneSchema = z.object({ notes: z.string().min(1, 'Findings are required') });
const MODES = [{ value: 'PHONE', label: 'Phone' }, { value: 'VIDEO', label: 'Video' }, { value: 'ONSITE', label: 'On site' }];

export default function VisitsPage() {
  const { state, set } = useUrlState({ page: 1, status: '' });
  const q = useVisits({ ...state, status: state.status || undefined } as any);
  const placements = rows(usePlacements({ status: 'APPROVED' } as any).data);
  const schedule = useScheduleVisit();
  const update = useUpdateVisit();
  const complete = useCompleteVisit();
  const [dlg, setDlg] = useState<'new' | null>(null);
  const [done, setDone] = useState<any>(null);
  const [cancel, setCancel] = useState<any>(null);
  const [errs, setErrs] = useState<string[]>([]);
  const sForm = useZodForm(schedSchema, { placement: '', mode: 'PHONE', scheduled_at: '', meeting_link: '' });
  const dForm = useZodForm(doneSchema, { notes: '' });

  return (
    <>
      <PageHeader title="Visits" description="Schedule and record phone, video or on-site visits." actions={<Button onClick={() => { setErrs([]); sForm.reset(); setDlg('new'); }}>Schedule a visit</Button>} />
      <FilterBar state={state} set={set as any} selects={[{ name: 'status', label: 'Status', options: ['SCHEDULED', 'COMPLETED', 'CANCELLED'].map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() })) }]} />
      <DataTable
        data={q.data as any}
        isLoading={q.isPending}
        error={q.error}
        onRetry={() => void q.refetch()}
        state={state}
        onStateChange={set}
        emptyState={<EmptyState title="No visits" />}
        columns={[
          { header: 'Student', cell: (c) => nameOf(c.row.original.student) || nameOf(c.row.original.placement?.student) },
          { header: 'When', cell: (c) => formatDateTime(c.row.original.scheduled_at) },
          { header: 'Mode', accessorKey: 'mode' },
          { header: 'Status', cell: (c) => <StatusBadge kind="visit" status={c.row.original.status} /> },
        ]}
        rowActions={(v: any) =>
          v.status === 'SCHEDULED' ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { dForm.reset({ notes: '' }); setErrs([]); setDone(v); }}>Complete</Button>
              <Button size="sm" variant="outline" onClick={() => setCancel(v)}>Cancel</Button>
            </div>
          ) : null
        }
      />
      <FormDialog open={dlg === 'new'} onOpenChange={(o) => !o && setDlg(null)} title="Schedule a visit" isPending={schedule.isPending} formErrors={errs}
        onSubmit={sForm.handleSubmit(async (v: any) => {
          try {
            await schedule.mutateAsync({ placementId: v.placement, body: { mode: v.mode, scheduled_at: new Date(v.scheduled_at).toISOString(), meeting_link: v.meeting_link } } as any);
            toast.success('Visit scheduled');
            setDlg(null);
          } catch (e) { setErrs(applyApiErrors(sForm.setError, e, Object.keys(v)).formErrors); }
        })}>
        <SelectField control={sForm.control} name="placement" label="Student" options={placements.map((p: any) => ({ value: p.id, label: nameOf(p.student) }))} />
        <SelectField control={sForm.control} name="mode" label="Mode" options={MODES} />
        <TextField control={sForm.control} name="scheduled_at" label="Date and time" type="datetime-local" />
        <TextField control={sForm.control} name="meeting_link" label="Meeting link (optional)" />
      </FormDialog>
      <FormDialog open={!!done} onOpenChange={(o) => !o && setDone(null)} title="Complete visit" submitLabel="Mark completed" isPending={complete.isPending} formErrors={errs}
        onSubmit={dForm.handleSubmit(async (v: any) => {
          try { await complete.mutateAsync({ id: done.id, notes: v.notes } as any); toast.success('Visit completed'); setDone(null); }
          catch (e) { setErrs(applyApiErrors(dForm.setError, e, ['notes']).formErrors); }
        })}>
        <TextareaField control={dForm.control} name="notes" label="Findings" />
      </FormDialog>
      <ConfirmDialog open={!!cancel} onOpenChange={(o) => !o && setCancel(null)} title="Cancel this visit?" description="The student and supervisor will see it as cancelled." confirmLabel="Cancel visit" destructive
        onConfirm={async () => { await update.mutateAsync({ id: cancel.id, body: { status: 'CANCELLED' } } as any); toast.success('Visit cancelled'); }} />
    </>
  );
}
