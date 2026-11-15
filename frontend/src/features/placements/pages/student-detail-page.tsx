/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/shared/data-table';
import { FeedbackThread } from '@/components/shared/feedback-thread';
import { FormDialog } from '@/components/shared/form-dialog';
import { SelectField, TextField, TextareaField } from '@/components/shared/form-fields';
import { PageHeader } from '@/components/shared/page-header';
import { Panel } from '@/components/shared/panel';
import { QueryBoundary } from '@/components/shared/query-boundary';
import { StatusBadge } from '@/components/shared/status-badge';
import { Timeline } from '@/components/shared/timeline';
import { ROUTES, to } from '@/config/routes';
import { useFlags, useResolveFlag } from '@/features/flags';
import { useAddFeedback, useLogbookEntry, useLogbookTimeline, useFeedback } from '@/features/logbook';
import { usePlacementSummary } from '@/features/reports';
import { useCompleteVisit, usePlacementVisits, useScheduleVisit } from '@/features/visits';
import { applyApiErrors } from '@/lib/form';
import { formatDate, formatDateTime } from '@/lib/format';
import { nameOf, rows } from '@/lib/rows';
import { useUrlState } from '@/lib/use-url-state';
import { useZodForm } from '@/lib/use-zod-form';
import { PlacementSummary } from '../components/placement-summary';
import { usePlacement, usePlacementTimeline } from '..';

const visitSchema = z.object({ mode: z.string().min(1, 'Required'), scheduled_at: z.string().min(1, 'Required'), meeting_link: z.string().optional() });
const noteSchema = z.object({ note: z.string().min(1, 'Required') });
const MODES = [{ value: 'PHONE', label: 'Phone' }, { value: 'VIDEO', label: 'Video' }, { value: 'ONSITE', label: 'On site' }];

function EntryFeedback({ entryId }: { entryId: string }) {
  const entry = useLogbookEntry(entryId);
  const fb = useFeedback(entryId);
  const add = useAddFeedback();
  return (
    <FeedbackThread
      items={rows(fb.data).length ? rows(fb.data) : ((entry.data as any)?.feedback ?? [])}
      canComment
      onSubmit={async (c) => {
        await add.mutateAsync({ id: entryId, comment: c } as any);
      }}
    />
  );
}

function LogbookTab({ id }: { id: string }) {
  const tl = useLogbookTimeline(id);
  const [open, setOpen] = useState<string | null>(null);
  const list = Array.isArray(tl.data) ? tl.data : ((tl.data as any)?.weeks ?? rows(tl.data));
  return (
    <div className="space-y-4">
      <DataTable
        data={list}
        isLoading={tl.isPending}
        error={tl.error}
        columns={[
          { header: 'Week', cell: (c) => formatDate(c.row.original.week_start) },
          { header: 'Status', cell: (c) => <StatusBadge kind="logbook" status={c.row.original.status} /> },
          { header: 'Claimed', cell: (c) => c.row.original.claimed_hours ?? '—' },
          { header: 'Approved', cell: (c) => c.row.original.approved_hours ?? '—' },
        ]}
        rowActions={(w: any) => (w.entry_id ?? w.id ? <Button size="sm" variant="outline" onClick={() => setOpen(w.entry_id ?? w.id)}>Comments</Button> : null)}
      />
      {open && <Panel title="Comments on selected week"><EntryFeedback entryId={open} /></Panel>}
    </div>
  );
}

function VisitsTab({ id }: { id: string }) {
  const q = usePlacementVisits(id);
  const schedule = useScheduleVisit();
  const complete = useCompleteVisit();
  const [dlg, setDlg] = useState<'schedule' | any | null>(null);
  const [errs, setErrs] = useState<string[]>([]);
  const vForm = useZodForm(visitSchema, { mode: 'PHONE', scheduled_at: '', meeting_link: '' });
  const nForm = useZodForm(noteSchema, { note: '' });
  return (
    <div className="space-y-3">
      <Button onClick={() => { setErrs([]); vForm.reset(); setDlg('schedule'); }}>Schedule a visit</Button>
      <DataTable
        data={rows(q.data)}
        isLoading={q.isPending}
        error={q.error}
        columns={[
          { header: 'When', cell: (c) => formatDateTime(c.row.original.scheduled_at) },
          { header: 'Mode', accessorKey: 'mode' },
          { header: 'Status', cell: (c) => <StatusBadge kind="visit" status={c.row.original.status} /> },
        ]}
        rowActions={(v: any) => (v.status === 'SCHEDULED' ? <Button size="sm" variant="outline" onClick={() => { setErrs([]); nForm.reset({ note: '' }); setDlg(v); }}>Complete</Button> : null)}
      />
      <FormDialog
        open={dlg === 'schedule'}
        onOpenChange={(o) => !o && setDlg(null)}
        title="Schedule a visit"
        isPending={schedule.isPending}
        formErrors={errs}
        onSubmit={vForm.handleSubmit(async (v: any) => {
          try {
            await schedule.mutateAsync({ placementId: id, body: { ...v, scheduled_at: new Date(v.scheduled_at).toISOString() } } as any);
            toast.success('Visit scheduled');
            setDlg(null);
          } catch (e) { setErrs(applyApiErrors(vForm.setError, e, Object.keys(v)).formErrors); }
        })}
      >
        <SelectField control={vForm.control} name="mode" label="Mode" options={MODES} />
        <TextField control={vForm.control} name="scheduled_at" label="Date and time" type="datetime-local" />
        <TextField control={vForm.control} name="meeting_link" label="Meeting link (optional)" />
      </FormDialog>
      <FormDialog
        open={!!dlg && dlg !== 'schedule'}
        onOpenChange={(o) => !o && setDlg(null)}
        title="Complete visit"
        submitLabel="Mark completed"
        isPending={complete.isPending}
        formErrors={errs}
        onSubmit={nForm.handleSubmit(async (v: any) => {
          try {
            await complete.mutateAsync({ id: dlg.id, notes: v.note } as any);
            toast.success('Visit completed');
            setDlg(null);
          } catch (e) { setErrs(applyApiErrors(nForm.setError, e, ['note']).formErrors); }
        })}
      >
        <TextareaField control={nForm.control} name="note" label="Findings" />
      </FormDialog>
    </div>
  );
}

function FlagsTab({ id }: { id: string }) {
  const q = useFlags({ placement: id, resolved: false } as any);
  const resolve = useResolveFlag();
  const [flag, setFlag] = useState<any>(null);
  const [errs, setErrs] = useState<string[]>([]);
  const form = useZodForm(noteSchema, { note: '' });
  return (
    <>
      <DataTable
        data={rows(q.data)}
        isLoading={q.isPending}
        error={q.error}
        columns={[{ header: 'Type', accessorKey: 'type' }, { header: 'Detail', accessorKey: 'detail' }, { header: 'Raised', cell: (c) => formatDateTime(c.row.original.created_at) }]}
        rowActions={(f: any) => <Button size="sm" variant="outline" onClick={() => { form.reset({ note: '' }); setErrs([]); setFlag(f); }}>Resolve</Button>}
      />
      <FormDialog open={!!flag} onOpenChange={(o) => !o && setFlag(null)} title="Resolve flag" submitLabel="Resolve" isPending={resolve.isPending} formErrors={errs}
        onSubmit={form.handleSubmit(async (v: any) => {
          try { await resolve.mutateAsync({ id: flag.id, note: v.note } as any); toast.success('Flag resolved'); setFlag(null); }
          catch (e) { setErrs(applyApiErrors(form.setError, e, ['note']).formErrors); }
        })}>
        <TextareaField control={form.control} name="note" label="Resolution note" />
      </FormDialog>
    </>
  );
}

export default function StudentDetailPage() {
  const { placementId = '' } = useParams();
  const { state, set } = useUrlState({ tab: 'overview' });
  const placement = usePlacement(placementId);
  const summary: any = usePlacementSummary(placementId).data;
  const timeline = usePlacementTimeline(placementId);

  return (
    <>
      <PageHeader title="Student" breadcrumbs={[{ label: 'Students', to: ROUTES.students as string }, { label: 'Detail' }]} />
      <QueryBoundary query={placement as any}>
        {(p: any) => (
          <Tabs value={state.tab} onValueChange={(v) => set({ tab: v })}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="logbook">Logbook</TabsTrigger>
              <TabsTrigger value="visits">Visits</TabsTrigger>
              <TabsTrigger value="flags">Flags</TabsTrigger>
              <TabsTrigger value="assessment">Assessment and report</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <Panel title={nameOf(p.student)}><PlacementSummary placement={p} /></Panel>
              {summary && <Panel title="Summary"><p>Approved hours: {summary.approved_hours ?? summary.hours?.approved ?? 0} / {summary.required_hours ?? summary.hours?.required ?? 0}</p></Panel>}
              <Panel title="History">
                <Timeline events={rows(timeline.data).map((t: any) => ({ label: <StatusBadge kind="placement" status={t.status ?? t.to_status} />, at: t.at ?? t.created_at, by: nameOf(t.by ?? t.changed_by), note: t.remarks ?? t.note }))} />
              </Panel>
            </TabsContent>
            <TabsContent value="logbook"><LogbookTab id={placementId} /></TabsContent>
            <TabsContent value="visits"><VisitsTab id={placementId} /></TabsContent>
            <TabsContent value="flags"><FlagsTab id={placementId} /></TabsContent>
            <TabsContent value="assessment">
              <div className="flex gap-2">
                <Button asChild><Link to={to.assessment(placementId)}>Open assessment</Link></Button>
                <Button asChild variant="outline"><Link to={ROUTES.finalReports as string}>Final reports</Link></Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </QueryBoundary>
    </>
  );
}
