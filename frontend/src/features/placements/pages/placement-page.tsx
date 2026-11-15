/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ApiErrorAlert } from '@/components/shared/api-error-alert';
import { EntityCombobox } from '@/components/shared/entity-combobox';
import { DateField, FieldShell, SelectField, TextField, TextareaField } from '@/components/shared/form-fields';
import { FormDialog } from '@/components/shared/form-dialog';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { Panel } from '@/components/shared/panel';
import { Timeline } from '@/components/shared/timeline';
import { StatusBadge } from '@/components/shared/status-badge';
import { ROUTES } from '@/config/routes';
import { organizationSchema, useCreateOrganization, useOrganizations } from '@/features/organizations';
import { usePeriods } from '@/features/periods';
import { hasStatus } from '@/lib/api/errors';
import { applyApiErrors } from '@/lib/form';
import { idOf, nameOf, rows } from '@/lib/rows';
import { useZodForm } from '@/lib/use-zod-form';
import { PlacementSummary } from '../components/placement-summary';
import {
  placementDraftSchema,
  placementSubmitSchema,
  useCreatePlacement,
  useMyPlacement,
  usePlacementTimeline,
  usePlacements,
  useSubmitPlacement,
  useUpdatePlacement,
} from '..';

function useOrgSearch(term: string) {
  const q = useOrganizations({ search: term } as any);
  return { data: rows(q.data).map((o: any) => ({ id: o.id, label: o.county ? `${o.name} (${o.county})` : o.name })), isFetching: q.isFetching };
}

function NewOrganizationDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (o: any) => void }) {
  const create = useCreateOrganization();
  const form = useZodForm(organizationSchema, { name: '', address: '', county: '', contact_email: '', contact_phone: '' });
  const [errs, setErrs] = useState<string[]>([]);
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add a new organisation"
      description="It stays unverified until a coordinator approves a placement that uses it."
      isPending={create.isPending}
      formErrors={errs}
      onSubmit={form.handleSubmit(async (v: any) => {
        setErrs([]);
        try {
          onCreated(await create.mutateAsync(v));
          onOpenChange(false);
        } catch (e) {
          setErrs(applyApiErrors(form.setError, e, Object.keys(v)).formErrors);
        }
      })}
    >
      <TextField control={form.control} name="name" label="Name" />
      <TextField control={form.control} name="address" label="Address" />
      <TextField control={form.control} name="county" label="County" />
      <TextField control={form.control} name="contact_email" label="Contact email" type="email" />
      <TextField control={form.control} name="contact_phone" label="Contact phone" type="tel" />
    </FormDialog>
  );
}

function PlacementForm({ placement, rejection }: { placement: any | null; rejection?: string }) {
  const periods = rows(usePeriods({} as any).data);
  const create = useCreatePlacement();
  const update = useUpdatePlacement();
  const submit = useSubmitPlacement();
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [orgDialog, setOrgDialog] = useState(false);
  const [orgLabel, setOrgLabel] = useState<string | undefined>(nameOf(placement?.organization) || undefined);

  const form = useZodForm(placementDraftSchema, {
    period: idOf(placement?.period) ?? periods[0]?.id ?? '',
    organization: idOf(placement?.organization) ?? '',
    role_title: placement?.role_title ?? '',
    department: placement?.department ?? '',
    task_description: placement?.task_description ?? '',
    start_date: placement?.start_date ?? '',
    end_date: placement?.end_date ?? '',
    proposed_supervisor_name: placement?.proposed_supervisor_name ?? '',
    proposed_supervisor_email: placement?.proposed_supervisor_email ?? '',
    proposed_supervisor_phone: placement?.proposed_supervisor_phone ?? '',
  });
  const periodId = form.watch('period');
  const period = periods.find((p: any) => p.id === periodId);

  const persist = async (values: any): Promise<string> => {
    if (placement) {
      await update.mutateAsync({ id: placement.id, body: values });
      return placement.id;
    }
    const created: any = await create.mutateAsync(values);
    return created.id;
  };

  const save = form.handleSubmit(async (values: any) => {
    setFormErrors([]);
    try {
      await persist(values);
      toast.success('Draft saved');
    } catch (e) {
      setFormErrors(applyApiErrors(form.setError, e, Object.keys(values)).formErrors);
    }
  });

  const submitForApproval = async () => {
    setFormErrors([]);
    const values = form.getValues();
    const check = placementSubmitSchema.safeParse(values);
    if (!check.success) {
      setFormErrors(['Complete these before submitting:', ...check.error.issues.map((i) => `${i.path.join('.') || 'form'}: ${i.message}`)]);
      return;
    }
    try {
      const id = await persist(values);
      await submit.mutateAsync(id);
      toast.success('Submitted for approval');
    } catch (e) {
      setFormErrors(applyApiErrors(form.setError, e, Object.keys(values)).formErrors);
    }
  };

  const busy = create.isPending || update.isPending || submit.isPending;

  return (
    <>
      {rejection && (
        <Alert className="mb-4">
          <AlertTitle>Your previous request was rejected</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{rejection}</AlertDescription>
        </Alert>
      )}
      {placement?.status === 'RETURNED' && placement.coordinator_remarks && (
        <Alert className="mb-4">
          <AlertTitle>Returned for changes</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{placement.coordinator_remarks}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={save} className="max-w-2xl space-y-4" noValidate>
        <SelectField control={form.control} name="period" label="Internship period" options={periods.map((p: any) => ({ value: p.id, label: p.name }))} />
        <FieldShell control={form.control} name="organization" label="Host organisation">
          {({ value, onChange }) => (
            <div className="flex gap-2">
              <div className="flex-1">
                <EntityCombobox value={value} onChange={(id, l) => { onChange(id); setOrgLabel(l); }} useSearch={useOrgSearch} initialLabel={orgLabel} placeholder="Search organisations" ariaLabel="Host organisation" />
              </div>
              <Button type="button" variant="outline" onClick={() => setOrgDialog(true)}>
                Add new
              </Button>
            </div>
          )}
        </FieldShell>
        <TextField control={form.control} name="role_title" label="Role title" />
        <TextField control={form.control} name="department" label="Department" />
        <TextareaField control={form.control} name="task_description" label="Task description" />
        <div className="grid gap-4 sm:grid-cols-2">
          <DateField control={form.control} name="start_date" label="Start date" min={period?.start_date} max={period?.end_date} />
          <DateField control={form.control} name="end_date" label="End date" min={period?.start_date} max={period?.end_date} />
        </div>
        <TextField control={form.control} name="proposed_supervisor_name" label="Proposed supervisor name" />
        <TextField control={form.control} name="proposed_supervisor_email" label="Proposed supervisor email" type="email" />
        <TextField control={form.control} name="proposed_supervisor_phone" label="Proposed supervisor phone" type="tel" />
        <ApiErrorAlert messages={formErrors} />
        <div className="flex gap-2">
          <Button type="submit" variant="outline" disabled={busy}>
            Save draft
          </Button>
          <Button type="button" disabled={busy} onClick={() => void submitForApproval()}>
            {placement?.status === 'RETURNED' ? 'Resubmit' : 'Submit for approval'}
          </Button>
        </div>
      </form>
      <NewOrganizationDialog
        open={orgDialog}
        onOpenChange={setOrgDialog}
        onCreated={(o) => {
          form.setValue('organization', o.id, { shouldDirty: true });
          setOrgLabel(o.name);
        }}
      />
    </>
  );
}

function TimelineCard({ id }: { id: string }) {
  const q = usePlacementTimeline(id);
  return (
    <Panel title="Approval timeline">
      {q.isPending ? (
        <LoadingState variant="card" />
      ) : (
        <Timeline events={rows(q.data).map((t: any) => ({ label: <StatusBadge kind="placement" status={t.status ?? t.to_status} />, at: t.at ?? t.created_at, by: nameOf(t.by ?? t.changed_by), note: t.remarks ?? t.note }))} />
      )}
    </Panel>
  );
}

export default function PlacementPage() {
  const mine = useMyPlacement();
  const rejected = usePlacements({ status: 'REJECTED' } as any);

  if (mine.isPending) return <LoadingState variant="form" />;
  const none = hasStatus(mine.error, 404);
  if (mine.error && !none) return <ErrorState error={mine.error} onRetry={() => void mine.refetch()} />;

  const placement: any = none ? null : mine.data;
  const status: string | undefined = placement?.status;
  const lastRejection = rows(rejected.data)[0]?.coordinator_remarks as string | undefined;

  return (
    <>
      <PageHeader title="My placement" description="Submit your host organisation details and track approval." />
      {(!placement || status === 'DRAFT' || status === 'RETURNED') && (
        <PlacementForm key={`${placement?.id ?? 'new'}-${status}`} placement={placement} rejection={!placement ? lastRejection : undefined} />
      )}
      {placement && status !== 'DRAFT' && status !== 'RETURNED' && (
        <div className="space-y-4">
          {status === 'SUBMITTED' && (
            <Alert>
              <AlertDescription>Waiting for the coordinator’s decision.</AlertDescription>
            </Alert>
          )}
          <Panel title="Placement details">
            <PlacementSummary placement={placement} />
          </Panel>
          {status === 'APPROVED' && (
            <div className="flex gap-2">
              <Button asChild variant="outline"><Link to={ROUTES.logbook as string}>Open logbook</Link></Button>
              <Button asChild variant="outline"><Link to={ROUTES.finalReport as string}>Final report</Link></Button>
            </div>
          )}
        </div>
      )}
      {placement && <div className="mt-4"><TimelineCard id={placement.id} /></div>}
    </>
  );
}
