/* eslint-disable @typescript-eslint/no-explicit-any */
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { RubricForm, type RubricPayload } from '@/components/shared/rubric-form';
import { StatCard } from '@/components/shared/stat-card';
import { usePlacement } from '@/features/placements';
import { formatPercent } from '@/lib/format';
import { idOf, rows } from '@/lib/rows';
import { useAssessmentForms, useAssessments, useCreateAssessment, useSubmitAssessment, useUpdateAssessment } from '..';

/** Evaluation form for the signed-in assessor (the API returns only the role's own form). */
export function AssessmentEditor({ placementId }: { placementId: string }) {
  const placement = usePlacement(placementId);
  const periodId = idOf((placement.data as any)?.period);
  const forms = useAssessmentForms(periodId as string);
  const assessments = useAssessments(placementId);
  const create = useCreateAssessment();
  const update = useUpdateAssessment();
  const submit = useSubmitAssessment();

  if (placement.isPending || (periodId && forms.isPending) || assessments.isPending) return <LoadingState variant="form" />;
  const err = placement.error ?? forms.error ?? assessments.error;
  if (err) return <ErrorState error={err} onRetry={() => { void placement.refetch(); void forms.refetch(); void assessments.refetch(); }} />;

  const list = rows(forms.data);
  const form = list.find((f: any) => f.is_active) ?? list[0];
  if (!form) return <Alert><AlertDescription>No active assessment form for this period yet.</AlertDescription></Alert>;

  const existing: any = rows(assessments.data).find((a: any) => idOf(a.form) === form.id);
  const locked = existing?.status === 'SUBMITTED';

  const saveDraft = async (p: RubricPayload) => {
    if (existing) await update.mutateAsync({ id: existing.id, body: p } as any);
    else await create.mutateAsync({ placementId, body: { form: form.id, ...p } } as any);
    toast.success('Draft saved');
  };

  const doSubmit = async (p: RubricPayload) => {
    let id = existing?.id as string | undefined;
    if (id) await update.mutateAsync({ id, body: p } as any);
    else id = ((await create.mutateAsync({ placementId, body: { form: form.id, ...p } } as any)) as any).id;
    await submit.mutateAsync({ id: id!, placementId } as any);
    toast.success('Assessment submitted');
  };

  return (
    <div className="space-y-4">
      {locked && (
        <>
          <Alert><AlertDescription>Submitted and locked.</AlertDescription></Alert>
          <div className="max-w-xs"><StatCard label="Computed percent" value={formatPercent(existing.percent)} /></div>
        </>
      )}
      <RubricForm key={`${form.id}-${existing?.id ?? 'new'}-${existing?.status ?? ''}`} form={form} existing={existing} disabled={locked} onSaveDraft={saveDraft} onSubmit={doSubmit} />
    </div>
  );
}
