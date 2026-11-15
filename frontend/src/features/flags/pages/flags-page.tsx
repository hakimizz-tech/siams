/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { FilterBar } from '@/components/shared/filter-bar';
import { FormDialog } from '@/components/shared/form-dialog';
import { TextareaField } from '@/components/shared/form-fields';
import { PageHeader } from '@/components/shared/page-header';
import { applyApiErrors } from '@/lib/form';
import { formatDateTime } from '@/lib/format';
import { nameOf } from '@/lib/rows';
import { useUrlState } from '@/lib/use-url-state';
import { useZodForm } from '@/lib/use-zod-form';
import { useFlags, useResolveFlag } from '..';

const schema = z.object({ note: z.string().min(1, 'A note is required') });

export default function FlagsPage() {
  const { state, set } = useUrlState({ page: 1, resolved: 'false' });
  const q = useFlags({ page: state.page, resolved: state.resolved === 'true' } as any);
  const resolve = useResolveFlag();
  const [flag, setFlag] = useState<any>(null);
  const [errs, setErrs] = useState<string[]>([]);
  const form = useZodForm(schema, { note: '' });
  return (
    <>
      <PageHeader title="Integrity flags" description="Flags inform supervisors. They never block a student." />
      <FilterBar state={state} set={set as any} selects={[{ name: 'resolved', label: 'Show', options: [{ value: 'false', label: 'Unresolved' }, { value: 'true', label: 'Resolved' }] }]} />
      <DataTable
        data={q.data as any}
        isLoading={q.isPending}
        error={q.error}
        onRetry={() => void q.refetch()}
        state={state}
        onStateChange={set}
        emptyState={<EmptyState title="No flags" />}
        columns={[
          { header: 'Type', cell: (c) => <span className="flex items-center gap-1"><Flag className="size-3" aria-hidden />{String(c.row.original.type).replace(/_/g, ' ')}</span> },
          { header: 'Student', cell: (c) => nameOf(c.row.original.student) || nameOf(c.row.original.placement?.student) },
          { header: 'Detail', accessorKey: 'detail' },
          { header: 'Raised', cell: (c) => formatDateTime(c.row.original.created_at) },
        ]}
        rowActions={(f: any) => (!f.resolved ? <Button size="sm" variant="outline" onClick={() => { form.reset({ note: '' }); setErrs([]); setFlag(f); }}>Resolve</Button> : null)}
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
