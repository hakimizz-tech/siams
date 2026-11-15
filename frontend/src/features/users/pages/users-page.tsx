/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { DataTable } from '@/components/shared/data-table';
import { FileDropzone } from '@/components/shared/file-dropzone';
import { FilterBar } from '@/components/shared/filter-bar';
import { FormDialog } from '@/components/shared/form-dialog';
import { NumberField, SelectField, SwitchField, TextField } from '@/components/shared/form-fields';
import { JobProgress } from '@/components/shared/job-progress';
import { PageHeader } from '@/components/shared/page-header';
import { RoleBadge } from '@/components/shared/role-badge';
import { CSV_ACCEPT, MAX_CSV_MB } from '@/config/limits';
import { errorMessage } from '@/lib/api/errors';
import { applyApiErrors } from '@/lib/form';
import { useUrlState } from '@/lib/use-url-state';
import { useZodForm } from '@/lib/use-zod-form';
import { useCreateUser, useImportJob, useImportUsers, useUpdateUser, useUsers, validateCsvFile } from '..';

const ROLES = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'WORKPLACE_SUPERVISOR', label: 'Industrial supervisor' },
  { value: 'ACADEMIC_SUPERVISOR', label: 'Academic supervisor' },
  { value: 'COORDINATOR', label: 'Coordinator' },
];

const schema = z
  .object({
    email: z.string().email('Enter a valid email'),
    full_name: z.string().min(1, 'Required'),
    phone: z.string().optional(),
    role: z.string().min(1, 'Required'),
    registration_number: z.string().optional(),
    programme: z.string().optional(),
    year_of_study: z.coerce.number().optional().or(z.literal('')),
    job_title: z.string().optional(),
    department: z.string().optional(),
    send_invitation: z.boolean().optional(),
  })
  .refine((v) => v.role !== 'STUDENT' || !!v.registration_number, { path: ['registration_number'], message: 'Required for students' });

const TEMPLATE = 'email,full_name,role,phone,registration_number,programme,year_of_study,organization,job_title,department\n';

function ImportSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const start = useImportUsers();
  const [jobId, setJobId] = useState<string>();
  const [send, setSend] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>();
  const job: any = useImportJob(jobId as string);
  const data: any = job.data;
  useEffect(() => { if (data?.status === 'SUCCESS') toast.success('Import finished'); }, [data?.status]);
  const result = data?.result ?? data;

  const download = () => {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'users-template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>Import users from CSV</SheetTitle><SheetDescription>Create students or supervisors in bulk.</SheetDescription></SheetHeader>
        <div className="mt-4 space-y-4">
          <Button variant="outline" onClick={download}>Download template</Button>
          <div className="flex items-center gap-2">
            <Switch id="send-inv" checked={send} onCheckedChange={setSend} />
            <Label htmlFor="send-inv">Send invitation emails</Label>
          </div>
          <FileDropzone
            accept={CSV_ACCEPT as any}
            maxMb={MAX_CSV_MB}
            validate={validateCsvFile}
            progress={progress}
            error={error}
            disabled={start.isPending}
            label="Drag a CSV file here, or click to choose"
            onFile={async (file) => {
              setError(undefined);
              try {
                const r: any = await start.mutateAsync({ file, sendInvites: send, onProgress: setProgress } as any);
                setJobId(r.job_id);
              } catch (e) { setError(errorMessage(e)); }
            }}
          />
          <JobProgress job={data} />
          {data?.status === 'SUCCESS' && (
            <div className="space-y-2 text-sm">
              <p>{result?.created ?? 0} user(s) created.</p>
              {(result?.errors ?? []).length > 0 && (
                <table className="w-full text-left">
                  <thead><tr><th>Row</th><th>Email</th><th>Error</th></tr></thead>
                  <tbody>{result.errors.map((e: any, i: number) => <tr key={i}><td>{e.row}</td><td>{e.email}</td><td>{e.error}</td></tr>)}</tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function UsersPage() {
  const { state, set } = useUrlState({ page: 1, search: '', role: '', is_active: '' });
  const q = useUsers({ ...state, search: state.search || undefined, role: state.role || undefined, is_active: state.is_active || undefined } as any);
  const create = useCreateUser();
  const update = useUpdateUser();
  const [editing, setEditing] = useState<any | 'new' | null>(null);
  const [importing, setImporting] = useState(false);
  const [errs, setErrs] = useState<string[]>([]);
  const form = useZodForm(schema, {});
  const role = form.watch('role');

  const open = (u: any | 'new') => {
    setErrs([]);
    form.reset(u === 'new' ? { email: '', full_name: '', phone: '', role: 'STUDENT', send_invitation: true } : { ...u, ...(u.student_profile ?? {}), ...(u.supervisor_profile ?? {}) });
    setEditing(u);
  };

  return (
    <>
      <PageHeader title="Users" description="Create and manage accounts. Accounts are never deleted, only deactivated." actions={<><Button variant="outline" onClick={() => setImporting(true)}>Import CSV</Button><Button onClick={() => open('new')}>Add user</Button></>} />
      <FilterBar state={state} set={set as any} search selects={[{ name: 'role', label: 'Role', options: ROLES }, { name: 'is_active', label: 'Status', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] }]} />
      <DataTable
        data={q.data as any}
        isLoading={q.isPending}
        error={q.error}
        onRetry={() => void q.refetch()}
        state={state}
        onStateChange={set}
        columns={[
          { header: 'Name', accessorKey: 'full_name' },
          { header: 'Email', accessorKey: 'email' },
          { header: 'Role', cell: (c) => <RoleBadge role={c.row.original.role} /> },
          { header: 'Active', cell: (c) => (c.row.original.is_active ? 'Yes' : 'No') },
        ]}
        rowActions={(u: any) => (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => open(u)}>Edit</Button>
            <Button size="sm" variant="outline" onClick={async () => { try { await update.mutateAsync({ id: u.id, body: { is_active: !u.is_active } } as any); toast.success(u.is_active ? 'Deactivated' : 'Reactivated'); } catch (e) { toast.error(errorMessage(e)); } }}>
              {u.is_active ? 'Deactivate' : 'Reactivate'}
            </Button>
          </div>
        )}
      />
      <FormDialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title={editing === 'new' ? 'Add user' : 'Edit user'} isPending={create.isPending || update.isPending} formErrors={errs}
        onSubmit={form.handleSubmit(async (v: any) => {
          try {
            if (editing === 'new') await create.mutateAsync(v);
            else { const { role: _r, ...rest } = v; await update.mutateAsync({ id: editing.id, body: rest } as any); }
            toast.success('User saved');
            setEditing(null);
          } catch (e) { setErrs(applyApiErrors(form.setError, e, Object.keys(v)).formErrors); }
        })}>
        <TextField control={form.control} name="email" label="Email" type="email" disabled={editing !== 'new'} />
        <TextField control={form.control} name="full_name" label="Full name" />
        <TextField control={form.control} name="phone" label="Phone" type="tel" />
        <SelectField control={form.control} name="role" label="Role" options={ROLES} disabled={editing !== 'new'} description={editing !== 'new' ? 'The role cannot be changed after creation.' : undefined} />
        {role === 'STUDENT' && (
          <>
            <TextField control={form.control} name="registration_number" label="Registration number" />
            <TextField control={form.control} name="programme" label="Programme" />
            <NumberField control={form.control} name="year_of_study" label="Year of study" min={1} step={1} />
          </>
        )}
        {(role === 'WORKPLACE_SUPERVISOR' || role === 'ACADEMIC_SUPERVISOR') && (
          <>
            <TextField control={form.control} name="job_title" label="Job title" />
            <TextField control={form.control} name="department" label="Department" />
          </>
        )}
        {editing === 'new' && <SwitchField control={form.control} name="send_invitation" label="Send invitation email" />}
      </FormDialog>
      <ImportSheet open={importing} onOpenChange={setImporting} />
    </>
  );
}
