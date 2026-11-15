/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/data-table';
import { FilterBar } from '@/components/shared/filter-bar';
import { FormDialog } from '@/components/shared/form-dialog';
import { TextField } from '@/components/shared/form-fields';
import { PageHeader } from '@/components/shared/page-header';
import { applyApiErrors } from '@/lib/form';
import { useUrlState } from '@/lib/use-url-state';
import { useZodForm } from '@/lib/use-zod-form';
import { organizationSchema, useCreateOrganization, useOrganizations, useUpdateOrganization, useVerifyOrganization } from '..';

export default function OrganizationsPage() {
  const { state, set } = useUrlState({ page: 1, search: '', is_verified: '' });
  const q = useOrganizations({ ...state, search: state.search || undefined, is_verified: state.is_verified || undefined } as any);
  const create = useCreateOrganization();
  const update = useUpdateOrganization();
  const verify = useVerifyOrganization();
  const [editing, setEditing] = useState<any | 'new' | null>(null);
  const [errs, setErrs] = useState<string[]>([]);
  const form = useZodForm(organizationSchema, {});

  const open = (o: any | 'new') => {
    setErrs([]);
    form.reset(o === 'new' ? { name: '', address: '', county: '', contact_email: '', contact_phone: '' } : o);
    setEditing(o);
  };

  return (
    <>
      <PageHeader title="Organisations" description="Host organisations and their verification." actions={<Button onClick={() => open('new')}>Add organisation</Button>} />
      <FilterBar state={state} set={set as any} search selects={[{ name: 'is_verified', label: 'Verification', options: [{ value: 'true', label: 'Verified' }, { value: 'false', label: 'Unverified' }] }]} />
      <DataTable
        data={q.data as any}
        isLoading={q.isPending}
        error={q.error}
        onRetry={() => void q.refetch()}
        state={state}
        onStateChange={set}
        columns={[
          { header: 'Name', accessorKey: 'name' },
          { header: 'County', accessorKey: 'county' },
          { header: 'Contact', cell: (c) => c.row.original.contact_email ?? '—' },
          { header: 'Verified', cell: (c) => (c.row.original.is_verified ? <Badge>Verified</Badge> : <Badge variant="outline" className="border-dashed">Unverified</Badge>) },
        ]}
        rowActions={(o: any) => (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => open(o)}>Edit</Button>
            {!o.is_verified && (
              <Button size="sm" onClick={async () => { try { await verify.mutateAsync(o.id as any); toast.success('Organisation verified'); } catch (e: any) { toast.error(e?.message ?? 'Failed'); } }}>
                Verify
              </Button>
            )}
          </div>
        )}
      />
      <FormDialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title={editing === 'new' ? 'Add organisation' : 'Edit organisation'} isPending={create.isPending || update.isPending} formErrors={errs}
        onSubmit={form.handleSubmit(async (v: any) => {
          try {
            if (editing === 'new') await create.mutateAsync(v);
            else await update.mutateAsync({ id: editing.id, body: v } as any);
            toast.success('Organisation saved');
            setEditing(null);
          } catch (e) { setErrs(applyApiErrors(form.setError, e, Object.keys(v)).formErrors); }
        })}>
        <TextField control={form.control} name="name" label="Name" />
        <TextField control={form.control} name="address" label="Address" />
        <TextField control={form.control} name="county" label="County" />
        <TextField control={form.control} name="contact_email" label="Contact email" type="email" />
        <TextField control={form.control} name="contact_phone" label="Contact phone" type="tel" />
      </FormDialog>
    </>
  );
}
