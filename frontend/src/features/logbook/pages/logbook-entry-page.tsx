/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useFieldArray, useWatch } from 'react-hook-form';
import { addDays } from 'date-fns';
import { toast } from 'sonner';
import { z } from 'zod';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ApiErrorAlert } from '@/components/shared/api-error-alert';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { FeedbackThread } from '@/components/shared/feedback-thread';
import { FileDropzone } from '@/components/shared/file-dropzone';
import { NumberField, SelectField, TextareaField } from '@/components/shared/form-fields';
import { PageHeader } from '@/components/shared/page-header';
import { Panel } from '@/components/shared/panel';
import { ProtectedImage } from '@/components/shared/protected-image';
import { QueryBoundary } from '@/components/shared/query-boundary';
import { StatusBadge } from '@/components/shared/status-badge';
import { ROUTES } from '@/config/routes';
import { HOURS_OUTLIER_DAY, IMAGE_ACCEPT, MAX_HOURS_PER_DAY, MAX_IMAGES_PER_WEEK, MAX_IMAGE_MB, MIN_ACTIVITY_CHARS } from '@/config/limits';
import { applyApiErrors } from '@/lib/form';
import { formatDate, formatHours, parseDateOnly, toDateOnly } from '@/lib/format';
import { useZodForm } from '@/lib/use-zod-form';
import { imageFileUrl, useDeleteImage, useLogbookEntry, useSubmitWeek, useUpdateWeek, useUploadImage, validateImageFile } from '..';

const schema = z.object({
  summary: z.string().optional(),
  activities: z.array(
    z.object({
      work_date: z.string().min(1, 'Pick a day'),
      hours: z.coerce.number({ error: 'Enter hours' }).gt(0, 'Hours must be above 0').max(MAX_HOURS_PER_DAY, `At most ${MAX_HOURS_PER_DAY} hours`),
      description: z.string().min(MIN_ACTIVITY_CHARS, `At least ${MIN_ACTIVITY_CHARS} characters`),
    }),
  ),
});

function Editor({ entry }: { entry: any }) {
  const editable = entry.status === 'DRAFT' || entry.status === 'RETURNED';
  const update = useUpdateWeek();
  const submit = useSubmitWeek();
  const upload = useUploadImage();
  const del = useDeleteImage();
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string>();
  const [toDelete, setToDelete] = useState<any>(null);

  const form = useZodForm(schema, { summary: entry.summary ?? '', activities: entry.activities ?? [] });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'activities' });
  const watched: any[] = useWatch({ control: form.control, name: 'activities' }) ?? [];

  // Reset only when a different entry or status arrives, never on a background refetch.
  useEffect(() => {
    form.reset({ summary: entry.summary ?? '', activities: entry.activities ?? [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id, entry.status]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = toDateOnly(addDays(parseDateOnly(entry.week_start), i));
    return { value: d, label: formatDate(d) };
  });

  const save = async (values: any) => {
    await update.mutateAsync({ id: entry.id, body: { summary: values.summary ?? '', activities: values.activities } } as any);
  };

  const onSave = form.handleSubmit(async (values: any) => {
    setFormErrors([]);
    try {
      await save(values);
      toast.success('Week saved');
    } catch (e) {
      setFormErrors(applyApiErrors(form.setError, e, Object.keys(values)).formErrors);
    }
  });

  const onSubmit = form.handleSubmit(async (values: any) => {
    setFormErrors([]);
    if (values.activities.length === 0) {
      setFormErrors(['Add at least one daily line before submitting.']);
      return;
    }
    try {
      await save(values);
      await submit.mutateAsync(entry.id);
      toast.success('Week submitted for review');
    } catch (e) {
      setFormErrors(applyApiErrors(form.setError, e, Object.keys(values)).formErrors);
    }
  });

  const images: any[] = entry.images ?? [];
  const latestReturn = [...(entry.feedback ?? [])].reverse()[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <StatusBadge kind="logbook" status={entry.status} />
        <span className="text-sm text-muted-foreground">
          Claimed {formatHours(entry.claimed_hours ?? 0)}
          {entry.status === 'APPROVED' && ` · Approved ${formatHours(entry.approved_hours ?? 0)}`}
        </span>
      </div>
      {entry.status === 'SUBMITTED' && <Alert><AlertDescription>Waiting for your supervisor’s review.</AlertDescription></Alert>}
      {entry.status === 'RETURNED' && latestReturn && (
        <Alert><AlertDescription className="whitespace-pre-wrap">Returned: {latestReturn.comment}</AlertDescription></Alert>
      )}

      <Panel title="Daily lines">
        <form className="space-y-4" onSubmit={onSave} noValidate>
          <TextareaField control={form.control} name="summary" label="Week summary (optional)" rows={2} disabled={!editable} />
          {fields.map((f, i) => {
            const a = watched[i] ?? {};
            const weekend = a.work_date && [0, 6].includes(parseDateOnly(a.work_date).getDay());
            const len = String(a.description ?? '').length;
            return (
              <fieldset key={f.id} className="space-y-3 rounded-md border p-3">
                <legend className="px-1 text-sm font-medium">Line {i + 1}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField control={form.control} name={`activities.${i}.work_date`} label="Day" options={days} disabled={!editable} />
                  <NumberField control={form.control} name={`activities.${i}.hours`} label="Hours" min={0} max={MAX_HOURS_PER_DAY} step="0.25" disabled={!editable} />
                </div>
                <TextareaField control={form.control} name={`activities.${i}.description`} label="What did you do?" rows={3} disabled={!editable} description={`${len} / ${MIN_ACTIVITY_CHARS} characters minimum`} />
                {Number(a.hours) > HOURS_OUTLIER_DAY && <p className="text-xs">Warning: over {HOURS_OUTLIER_DAY} hours will be flagged for review.</p>}
                {weekend && <p className="text-xs">Warning: weekend work will be flagged for review.</p>}
                {editable && <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>Remove line</Button>}
              </fieldset>
            );
          })}
          {editable && (
            <Button type="button" variant="outline" onClick={() => append({ work_date: days[0]!.value, hours: '', description: '' })}>
              Add a daily line
            </Button>
          )}
          <ApiErrorAlert messages={formErrors} />
          {editable && (
            <div className="flex gap-2">
              <Button type="submit" variant="outline" disabled={update.isPending || submit.isPending}>Save</Button>
              <Button type="button" disabled={update.isPending || submit.isPending} onClick={() => void onSubmit()}>Submit week</Button>
            </div>
          )}
        </form>
      </Panel>

      <Panel title={`Images (${images.length} / ${MAX_IMAGES_PER_WEEK})`}>
        {editable && (
          <FileDropzone
            accept={IMAGE_ACCEPT as any}
            maxMb={MAX_IMAGE_MB}
            validate={(file) => validateImageFile(file, images.length)}
            progress={progress}
            error={uploadError}
            disabled={upload.isPending || images.length >= MAX_IMAGES_PER_WEEK}
            label="Drag an image here, or click to choose"
            onFile={(file) => {
              setUploadError(undefined);
              upload.mutate({ entryId: entry.id, file, onProgress: setProgress } as any, {
                onError: (e: any) => setUploadError(e?.message ?? 'Upload failed'),
                onSettled: () => setProgress(0),
              });
            }}
          />
        )}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img) => (
            <figure key={img.id} className="space-y-1">
              <ProtectedImage imageUrl={imageFileUrl(img.id)} alt={img.caption || img.original_name || 'Logbook image'} />
              {editable && <Button size="sm" variant="outline" onClick={() => setToDelete(img)}>Delete</Button>}
            </figure>
          ))}
        </div>
      </Panel>

      <Panel title="Feedback">
        <FeedbackThread items={entry.feedback ?? []} canComment={false} />
      </Panel>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this image?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          await del.mutateAsync({ imageId: toDelete.id, entryId: entry.id } as any);
        }}
      />
    </div>
  );
}

export default function LogbookEntryPage() {
  const { entryId = '' } = useParams();
  const q = useLogbookEntry(entryId, { refetchOnWindowFocus: false } as any);
  return (
    <>
      <PageHeader title="Weekly entry" breadcrumbs={[{ label: 'Logbook', to: ROUTES.logbook as string }, { label: 'Week' }]} />
      <QueryBoundary query={q as any}>{(entry: any) => <Editor entry={entry} />}</QueryBoundary>
    </>
  );
}
