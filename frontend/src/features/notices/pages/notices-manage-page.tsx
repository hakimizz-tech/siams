/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DataTable } from '@/components/shared/data-table';
import { FormDialog } from '@/components/shared/form-dialog';
import { SelectField, SwitchField, TextField, TextareaField } from '@/components/shared/form-fields';
import { PageHeader } from '@/components/shared/page-header';
import { formatDateTime } from '@/lib/format';
import { applyApiErrors } from '@/lib/form';
// import { rows } from '@/lib/rows';
import { useUrlState } from '@/lib/use-url-state';
import { useZodForm } from '@/lib/use-zod-form';
import { useArchiveNotice, useCreateNotice, useNotices, useUpdateNotice } from '..';

const AUDIENCES = [
  { value: 'ALL', label: 'Everyone' },
  { value: 'STUDENTS', label: 'Students' },
  { value: 'ACADEMIC_SUPERVISORS', label: 'Academic supervisors' },
  { value: 'WORKPLACE_SUPERVISORS', label: 'Industrial supervisors' },
];

const schema = z.object({
  title: z.string().min(1, 'Required'),
  body: z.string().min(1, 'Required'),
  audience: z.string().min(1, 'Required'),
  pinned: z.boolean().optional(),
  send_email: z.boolean().optional(),
  publish_at: z.string().optional(),
  expires_at: z.string().optional(),
});

const iso = (v?: string) => (v ? new Date(v).toISOString() : undefined);
const local = (v?: string) => (v ? new Date(new Date(v).getTime() - new Date(v).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

export default function NoticesManagePage() {
  const { state, set } = useUrlState({ page: 1 });
  const q = useNotices(state);
  const create = useCreateNotice();
  const update = useUpdateNotice();
  const archive = useArchiveNotice();
  const [editing, setEditing] = useState<any | 'new' | null>(null);
  const [archiving, setArchiving] = useState<any>(null);
  const [errs, setErrs] = useState<string[]>([]);
  const form = useZodForm(schema, {});

  const open = (n: any | 'new') => {
    setErrs([]);
    form.reset(
      n === 'new'
        ? { title: '', body: '', audience: 'ALL', pinned: false, send_email: false, publish_at: '', expires_at: '' }
        : { ...n, publish_at: local(n.publish_at), expires_at: local(n.expires_at) },
    );
    setEditing(n);
  };

  const onSubmit = form.handleSubmit(async (v: any) => {
    const body = { ...v, publish_at: iso(v.publish_at), expires_at: iso(v.expires_at) };
    try {
      if (editing === 'new') await create.mutateAsync(body);
      else await update.mutateAsync({ id: editing.id, body });
      toast.success('Notice saved');
      setEditing(null);
    } catch (e) {
      setErrs(applyApiErrors(form.setError, e, Object.keys(v)).formErrors);
    }
  });

  return (
    <>
      <PageHeader title="Manage notices" description="Post, edit and archive notices." actions={<Button onClick={() => open('new')}>Post notice</Button>} />
      <DataTable
        data={q.data as any}
        isLoading={q.isPending}
        error={q.error}
        onRetry={() => void q.refetch()}
        state={state}
        onStateChange={set}
        columns={[
          { header: 'Title', accessorKey: 'title' },
          { header: 'Audience', cell: (c) => AUDIENCES.find((a) => a.value === c.row.original.audience)?.label ?? c.row.original.audience },
          { header: 'Pinned', cell: (c) => (c.row.original.pinned ? 'Yes' : 'No') },
          { header: 'Publishes', cell: (c) => (c.row.original.publish_at ? formatDateTime(c.row.original.publish_at) : '—') },
        ]}
        rowActions={(n: any) => (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => open(n)}>Edit</Button>
            <Button size="sm" variant="outline" onClick={() => setArchiving(n)}>Archive</Button>
          </div>
        )}
      />
      <FormDialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title={editing === 'new' ? 'Post notice' : 'Edit notice'} onSubmit={onSubmit} isPending={create.isPending || update.isPending} formErrors={errs}>
        <TextField control={form.control} name="title" label="Title" />
        <TextareaField control={form.control} name="body" label="Body (plain text)" />
        <SelectField control={form.control} name="audience" label="Audience" options={AUDIENCES} />
        <TextField control={form.control} name="publish_at" label="Publish at" type="datetime-local" />
        <TextField control={form.control} name="expires_at" label="Expires at" type="datetime-local" />
        <SwitchField control={form.control} name="pinned" label="Pin to the top" />
        <SwitchField control={form.control} name="send_email" label="Email the audience" />
      </FormDialog>
      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(o) => !o && setArchiving(null)}
        title="Archive this notice?"
        description="It will no longer be shown to anyone."
        confirmLabel="Archive"
        destructive
        onConfirm={async () => {
          await archive.mutateAsync(archiving.id);
          toast.success('Notice archived');
        }}
      />
    </>
  );
}

