/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ApiErrorAlert } from '@/components/shared/api-error-alert';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Panel } from '@/components/shared/panel';
import { usePeriods } from '@/features/periods';
import { hasStatus } from '@/lib/api/errors';
import { rows } from '@/lib/rows';
import { useUrlState } from '@/lib/use-url-state';
import { parseRubricJson, useAssessmentForms, useImportForm, useNewFormVersion, usePatchForm, weightsAddUp, weightsTotal } from '..';

export default function RubricPage() {
  const { state, set } = useUrlState({ period: '' });
  const periods = rows(usePeriods({} as any).data);
  const periodId = state.period || periods[0]?.id;
  const q = useAssessmentForms(periodId);
  const importForm = useImportForm();
  const newVersion = useNewFormVersion();
  const patch = usePatchForm();
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [problem, setProblem] = useState<string>();
  const [error, setError] = useState<unknown>();
  const forms = rows(q.data);
  const total = weightsTotal(forms as any);
  const ok = weightsAddUp(forms as any);

  const check = () => {
    setError(undefined);
    const parsed: any = parseRubricJson(text);
    if (parsed.success === false || parsed.ok === false || parsed.error) {
      setProblem(String(parsed.error?.message ?? parsed.error ?? 'Invalid rubric JSON'));
      setPreview(null);
    } else {
      setProblem(undefined);
      setPreview(parsed.data);
    }
  };

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setError(undefined);
    try { await fn(); toast.success(okMsg); } catch (e) {
      if (hasStatus(e, 409)) toast.error('This form is locked. Create a new version to change it.');
      else setError(e);
    }
  };

  return (
    <>
      <PageHeader
        title="Assessment rubric"
        description="Forms imported from the institution’s official rubric."
        actions={
          <div className="flex items-center gap-2">
            <Label htmlFor="rub-period">Period</Label>
            <Select value={periodId} onValueChange={(v) => set({ period: v })}>
              <SelectTrigger id="rub-period" className="w-52"><SelectValue placeholder="Select a period" /></SelectTrigger>
              <SelectContent>{periods.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        }
      />
      {!periodId ? (
        <EmptyState title="Create a period first" />
      ) : (
        <div className="space-y-4">
          {forms.length > 0 && !ok && (
            <Alert variant="destructive"><AlertDescription>Active form weights add up to {total}%, not 100%. Results cannot be finalized until they do.</AlertDescription></Alert>
          )}
          <DataTable
            data={forms}
            isLoading={q.isPending}
            error={q.error}
            onRetry={() => void q.refetch()}
            columns={[
              { header: 'Name', accessorKey: 'name' },
              { header: 'Assessor', accessorKey: 'assessor_role' },
              { header: 'Version', accessorKey: 'version' },
              { header: 'Weight %', accessorKey: 'weight_percent' },
              { header: 'State', cell: (c) => <span className="flex gap-1">{c.row.original.is_active && <Badge>Active</Badge>}{c.row.original.is_locked && <Badge variant="outline">Locked</Badge>}</span> },
            ]}
            rowActions={(f: any) => (
              <div className="flex gap-2">
                {!f.is_active && <Button size="sm" variant="outline" onClick={() => run(() => patch.mutateAsync({ id: f.id, body: { is_active: true } } as any), 'Form activated')}>Activate</Button>}
                {f.is_locked && <Button size="sm" variant="outline" onClick={() => run(() => newVersion.mutateAsync(f.id as any), 'New version created')}>New version</Button>}
              </div>
            )}
          />
          <Panel title="Import a form from JSON">
            <div className="space-y-3">
              <Label htmlFor="rubric-json">Rubric JSON</Label>
              <Textarea id="rubric-json" rows={8} value={text} onChange={(e) => setText(e.target.value)} className="font-mono" />
              <Button variant="outline" onClick={check}>Validate</Button>
              {problem && <Alert variant="destructive"><AlertDescription>{problem}</AlertDescription></Alert>}
              {preview && (
                <div className="space-y-2">
                  <p className="font-medium">{preview.name} · {preview.assessor_role} · {preview.weight_percent}%</p>
                  <ul className="list-disc pl-5 text-sm">
                    {(preview.criteria ?? []).map((c: any) => <li key={c.code}>{c.section}: {c.name} ({c.type}{c.max_score ? `, max ${c.max_score}` : ''})</li>)}
                  </ul>
                  <p className="text-sm text-muted-foreground">Importing creates the next version and deactivates the previous one.</p>
                  <Button disabled={importForm.isPending} onClick={() => run(async () => { await importForm.mutateAsync({ ...preview, period: periodId } as any); setPreview(null); setText(''); }, 'Form imported')}>Import</Button>
                </div>
              )}
              <ApiErrorAlert error={error} />
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
