/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiErrorAlert } from './api-error-alert';
import { ConfirmDialog } from './confirm-dialog';

export interface RubricPayload {
  scores: { criterion: string; score?: number; remark?: string }[];
  comment: string;
}

/**
 * Evaluation form generated from the rubric data (criteria[]): SCORE -> bounded number,
 * COMMENT -> textarea, `section` groups the fields. Nothing about the rubric is hard-coded.
 */
export function RubricForm({
  form,
  existing,
  onSaveDraft,
  onSubmit,
  disabled,
}: {
  form: any;
  existing?: { scores?: any[]; comment?: string };
  onSaveDraft: (p: RubricPayload) => Promise<void>;
  onSubmit: (p: RubricPayload) => Promise<void>;
  disabled?: boolean;
}) {
  const criteria: any[] = [...(form.criteria ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const initial = (c: any) => existing?.scores?.find((s) => (s.criterion?.id ?? s.criterion) === c.id);
  const [values, setValues] = useState<Record<string, { score: string; remark: string }>>(() =>
    Object.fromEntries(criteria.map((c) => [c.id, { score: String(initial(c)?.score ?? ''), remark: initial(c)?.remark ?? '' }])),
  );
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<unknown>();
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);

  const validate = (strict: boolean) => {
    const next: Record<string, string> = {};
    for (const c of criteria) {
      if (c.type !== 'SCORE') continue;
      const raw = values[c.id]?.score ?? '';
      if (raw === '') {
        if (strict && c.required) next[c.id] = 'Required';
        continue;
      }
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > c.max_score) next[c.id] = `Enter a score from 0 to ${c.max_score}`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const payload = (): RubricPayload => ({
    comment,
    scores: criteria
      .filter((c) => (c.type === 'SCORE' ? values[c.id]?.score !== '' : !!values[c.id]?.remark))
      .map((c) => ({
        criterion: c.id,
        ...(c.type === 'SCORE' ? { score: Number(values[c.id]!.score) } : {}),
        remark: values[c.id]?.remark ?? '',
      })),
  });

  const run = async (fn: (p: RubricPayload) => Promise<void>, strict: boolean) => {
    setServerError(undefined);
    if (!validate(strict)) return false;
    setPending(true);
    try {
      await fn(payload());
      return true;
    } catch (e) {
      setServerError(e);
      return false;
    } finally {
      setPending(false);
    }
  };

  const sections = Array.from(new Set(criteria.map((c) => c.section ?? 'General')));

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <fieldset key={section} className="space-y-4 rounded-md border p-4">
          <legend className="px-1 text-sm font-semibold">{section}</legend>
          {criteria
            .filter((c) => (c.section ?? 'General') === section)
            .map((c) => (
              <div key={c.id} className="space-y-1">
                <Label htmlFor={`c-${c.id}`}>
                  {c.name}
                  {c.type === 'SCORE' && <span className="text-muted-foreground"> (0–{c.max_score}{c.required ? ', required' : ''})</span>}
                </Label>
                {c.type === 'SCORE' ? (
                  <>
                    <Input
                      id={`c-${c.id}`}
                      type="number"
                      min={0}
                      max={c.max_score}
                      step="any"
                      disabled={disabled}
                      value={values[c.id]?.score ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [c.id]: { ...v[c.id]!, score: e.target.value } }))}
                      aria-invalid={!!errors[c.id]}
                      className="w-28"
                    />
                    <Input
                      aria-label={`Remark for ${c.name}`}
                      placeholder="Remark (optional)"
                      disabled={disabled}
                      value={values[c.id]?.remark ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [c.id]: { ...v[c.id]!, remark: e.target.value } }))}
                    />
                  </>
                ) : (
                  <Textarea
                    id={`c-${c.id}`}
                    rows={3}
                    disabled={disabled}
                    value={values[c.id]?.remark ?? ''}
                    onChange={(e) => setValues((v) => ({ ...v, [c.id]: { ...v[c.id]!, remark: e.target.value } }))}
                  />
                )}
                {errors[c.id] && (
                  <p role="alert" className="text-xs text-destructive">
                    {errors[c.id]}
                  </p>
                )}
              </div>
            ))}
        </fieldset>
      ))}
      <div className="space-y-1">
        <Label htmlFor="rubric-comment">Overall comment</Label>
        <Textarea id="rubric-comment" rows={3} disabled={disabled} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>
      <ApiErrorAlert error={serverError} />
      {!disabled && (
        <div className="flex gap-2">
          <Button variant="outline" disabled={pending} onClick={() => void run(onSaveDraft, false)}>
            Save draft
          </Button>
          <Button
            disabled={pending}
            onClick={() => {
              if (validate(true)) setConfirm(true);
            }}
          >
            Submit
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Submit this assessment?"
        description="You cannot edit it after submitting."
        confirmLabel="Submit"
        onConfirm={async () => {
          const ok = await run(onSubmit, true);
          if (!ok) throw new Error('Submission failed. See the message on the form.');
        }}
      />
    </div>
  );
}
