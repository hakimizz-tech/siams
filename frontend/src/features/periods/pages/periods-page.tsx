/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiErrorAlert } from '@/components/shared/api-error-alert';
import { DataTable } from '@/components/shared/data-table';
import { FormDialog } from '@/components/shared/form-dialog';
import { DateField, NumberField, SelectField, TextField } from '@/components/shared/form-fields';
import { PageHeader } from '@/components/shared/page-header';
import { formatDate } from '@/lib/format';
import { applyApiErrors } from '@/lib/form';
import { rows } from '@/lib/rows';
import { useZodForm } from '@/lib/use-zod-form';
import { useCreatePeriod, useGradeBands, usePeriods, useSetGradeBands, useUpdatePeriod } from '..';

const schema = z
  .object({
    name: z.string().min(1, 'Required'),
    type: z.string().min(1, 'Required'),
    start_date: z.string().min(1, 'Required'),
    end_date: z.string().min(1, 'Required'),
    required_hours: z.coerce.number().positive('Must be above 0'),
    min_visits: z.coerce.number().min(0),
    assessment_opens_on: z.string().min(1, 'Required'),
  })
  .refine((v) => v.end_date >= v.start_date, { path: ['end_date'], message: 'End must not be before start' });

const TYPES = [{ value: 'INTERNSHIP', label: 'Internship' }, { value: 'ATTACHMENT', label: 'Attachment' }];

function BandsDialog({ period, onClose }: { period: any; onClose: () => void }) {
  const q = useGradeBands(period.id);
  const save = useSetGradeBands();
  const [bands, setBands] = useState<{ min_percent: string; label: string }[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [error, setError] = useState<unknown>();
  const current = bands ?? (q.data ? rows(q.data).map((b: any) => ({ min_percent: String(b.min_percent), label: b.label })) : []);

  const submit = async () => {
    setError(undefined);
    const problems: string[] = [];
    const nums = current.map((b) => Number(b.min_percent));
    if (!nums.includes(0)) problems.push('One band must start at 0.');
    if (new Set(nums).size !== nums.length) problems.push('Minimum percents must be unique.');
    if (new Set(current.map((b) => b.label.trim())).size !== current.length) problems.push('Labels must be unique.');
    if (current.some((b) => !b.label.trim() || !Number.isFinite(Number(b.min_percent)))) problems.push('Every band needs a label and a number.');
    setErrors(problems);
    if (problems.length) return;
    try {
      await save.mutateAsync({ periodId: period.id, bands: current.map((b) => ({ min_percent: Number(b.min_percent), label: b.label.trim() })) } as any);
      toast.success('Grade bands saved');
      onClose();
    } catch (e) { setError(e); }
  };

  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={`Grade bands: ${period.name}`} isPending={save.isPending} onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      {current.map((b, i) => (
        <div key={i} className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor={`bp-${i}`}>From %</Label>
            <Input id={`bp-${i}`} type="number" className="w-24" value={b.min_percent} onChange={(e) => setBands(current.map((x, j) => (j === i ? { ...x, min_percent: e.target.value } : x)))} />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor={`bl-${i}`}>Label</Label>
            <Input id={`bl-${i}`} value={b.label} onChange={(e) => setBands(current.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
          </div>
          <Button type="button" variant="ghost" onClick={() => setBands(current.filter((_, j) => j !== i))}>Remove</Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => setBands([...current, { min_percent: '', label: '' }])}>Add band</Button>
      <ApiErrorAlert messages={errors} error={error} />
    </FormDialog>
  );
}

export default function PeriodsPage() {
  const q = usePeriods({} as any);
  const create = useCreatePeriod();
  const update = useUpdatePeriod();
  const [editing, setEditing] = useState<any | 'new' | null>(null);
  const [bands, setBands] = useState<any>(null);
  const [errs, setErrs] = useState<string[]>([]);
  const form = useZodForm(schema, {});

  const open = (p: any | 'new') => {
    setErrs([]);
    form.reset(p === 'new' ? { name: '', type: 'INTERNSHIP', start_date: '', end_date: '', required_hours: '', min_visits: 2, assessment_opens_on: '' } : p);
    setEditing(p);
  };

  return (
    <>
      <PageHeader title="Periods" description="Internship periods and their grade bands." actions={<Button onClick={() => open('new')}>New period</Button>} />
      <DataTable
        data={rows(q.data)}
        isLoading={q.isPending}
        error={q.error}
        onRetry={() => void q.refetch()}
        columns={[
          { header: 'Name', accessorKey: 'name' },
          { header: 'Dates', cell: (c) => `${formatDate(c.row.original.start_date)} to ${formatDate(c.row.original.end_date)}` },
          { header: 'Required hours', accessorKey: 'required_hours' },
          { header: 'Min visits', accessorKey: 'min_visits' },
        ]}
        rowActions={(p: any) => (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => open(p)}>Edit</Button>
            <Button size="sm" variant="outline" onClick={() => setBands(p)}>Grade bands</Button>
          </div>
        )}
      />
      <FormDialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title={editing === 'new' ? 'New period' : 'Edit period'} isPending={create.isPending || update.isPending} formErrors={errs}
        onSubmit={form.handleSubmit(async (v: any) => {
          try {
            if (editing === 'new') await create.mutateAsync(v);
            else await update.mutateAsync({ id: editing.id, body: v } as any);
            toast.success('Period saved');
            setEditing(null);
          } catch (e) { setErrs(applyApiErrors(form.setError, e, Object.keys(v)).formErrors); }
        })}>
        <TextField control={form.control} name="name" label="Name" />
        <SelectField control={form.control} name="type" label="Type" options={TYPES} />
        <div className="grid gap-3 sm:grid-cols-2">
          <DateField control={form.control} name="start_date" label="Start date" />
          <DateField control={form.control} name="end_date" label="End date" />
        </div>
        <NumberField control={form.control} name="required_hours" label="Required hours" min={1} />
        <NumberField control={form.control} name="min_visits" label="Minimum visits" min={0} step={1} />
        <DateField control={form.control} name="assessment_opens_on" label="Assessments open on" />
      </FormDialog>
      {bands && <BandsDialog period={bands} onClose={() => setBands(null)} />}
    </>
  );
}
