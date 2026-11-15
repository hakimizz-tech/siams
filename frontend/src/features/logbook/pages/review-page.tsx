/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiErrorAlert } from '@/components/shared/api-error-alert';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { FeedbackThread } from '@/components/shared/feedback-thread';
import { PageHeader } from '@/components/shared/page-header';
import { Panel } from '@/components/shared/panel';
import { ProtectedImage } from '@/components/shared/protected-image';
import { QueryBoundary } from '@/components/shared/query-boundary';
import { StatusBadge } from '@/components/shared/status-badge';
import { ROUTES } from '@/config/routes';
import { hasStatus } from '@/lib/api/errors';
import { formatDate, formatHours, toNumber } from '@/lib/format';
import { nameOf } from '@/lib/rows';
import { imageFileUrl, useAddFeedback, useApproveWeek, useLogbookEntry, useReturnWeek } from '..';

function Review({ entry, refetch }: { entry: any; refetch: () => unknown }) {
  const navigate = useNavigate();
  const approve = useApproveWeek();
  const returnWeek = useReturnWeek();
  const addFeedback = useAddFeedback();
  const acts: any[] = entry.activities ?? [];
  const [approved, setApproved] = useState<Record<string, string>>(() => Object.fromEntries(acts.map((a) => [a.work_date, String(a.hours)])));
  const [comment, setComment] = useState('');
  const [error, setError] = useState<unknown>();
  const [local, setLocal] = useState<string[]>([]);
  const [returning, setReturning] = useState(false);
  const reviewable = entry.status === 'SUBMITTED';

  const doApprove = async () => {
    setError(undefined);
    const problems: string[] = [];
    const adjustments = acts
      .map((a) => ({ work_date: a.work_date, claimed: toNumber(a.hours) ?? 0, value: Number(approved[a.work_date]) }))
      .filter((a) => {
        if (!Number.isFinite(a.value) || a.value < 0) problems.push(`${formatDate(a.work_date)}: enter a valid number of hours.`);
        else if (a.value > a.claimed) problems.push(`${formatDate(a.work_date)}: approved hours cannot exceed claimed hours.`);
        return Number.isFinite(a.value) && a.value !== a.claimed;
      })
      .map((a) => ({ work_date: a.work_date, approved_hours: a.value }));
    if (adjustments.length > 0 && !comment.trim()) problems.push('A comment is required when you reduce hours.');
    setLocal(problems);
    if (problems.length) return;
    try {
      await approve.mutateAsync({ id: entry.id, body: { ...(adjustments.length ? { adjustments } : {}), ...(comment.trim() ? { comment: comment.trim() } : {}) } } as any);
      toast.success('Week approved');
      navigate(ROUTES.reviews as string);
    } catch (e) {
      if (hasStatus(e, 409)) {
        toast.error('This entry changed. Showing the latest state.');
        void refetch();
      } else setError(e);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <StatusBadge kind="logbook" status={entry.status} />
        <span className="text-sm">{nameOf(entry.student)} · week of {formatDate(entry.week_start)}</span>
      </div>
      {!reviewable && <Alert><AlertDescription>This entry is no longer awaiting review.</AlertDescription></Alert>}
      <Panel title="Daily lines">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Claimed</TableHead>
                <TableHead>Approved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {acts.map((a) => (
                <TableRow key={a.work_date}>
                  <TableCell>{formatDate(a.work_date)}</TableCell>
                  <TableCell className="whitespace-pre-wrap">{a.description}</TableCell>
                  <TableCell>{formatHours(a.hours)}</TableCell>
                  <TableCell>
                    {reviewable ? (
                      <Input aria-label={`Approved hours for ${formatDate(a.work_date)}`} type="number" step="0.25" min={0} max={toNumber(a.hours) ?? undefined} className="w-24" value={approved[a.work_date] ?? ''} onChange={(e) => setApproved((s) => ({ ...s, [a.work_date]: e.target.value }))} />
                    ) : (
                      formatHours(a.approved_hours ?? a.hours)
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
      {(entry.images ?? []).length > 0 && (
        <Panel title="Images">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {entry.images.map((img: any) => <ProtectedImage key={img.id} imageUrl={imageFileUrl(img.id)} alt={img.caption || img.original_name || 'Logbook image'} />)}
          </div>
        </Panel>
      )}
      {reviewable && (
        <Panel title="Decision">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="review-comment">Comment (required if you reduce hours)</Label>
              <Textarea id="review-comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
            </div>
            <ApiErrorAlert messages={local} error={error} />
            <div className="flex gap-2">
              <Button disabled={approve.isPending} onClick={() => void doApprove()}>Approve</Button>
              <Button variant="outline" onClick={() => setReturning(true)}>Return to student</Button>
            </div>
          </div>
        </Panel>
      )}
      <Panel title="Feedback">
        <FeedbackThread items={entry.feedback ?? []} canComment onSubmit={async (c) => { await addFeedback.mutateAsync({ id: entry.id, comment: c } as any); }} />
      </Panel>
      <ConfirmDialog
        open={returning}
        onOpenChange={setReturning}
        title="Return this week to the student?"
        description="The student will be asked to edit and resubmit."
        confirmLabel="Return"
        requireReason={{ label: 'Comment for the student' }}
        onConfirm={async (reason) => {
          await returnWeek.mutateAsync({ id: entry.id, comment: reason! } as any);
          toast.success('Returned to student');
          navigate(ROUTES.reviews as string);
        }}
      />
    </div>
  );
}

export default function ReviewPage() {
  const { entryId = '' } = useParams();
  const q = useLogbookEntry(entryId, { refetchOnWindowFocus: false } as any);
  return (
    <>
      <PageHeader title="Review a week" breadcrumbs={[{ label: 'Reviews', to: ROUTES.reviews as string }, { label: 'Week' }]} />
      <QueryBoundary query={q as any}>{(entry: any) => <Review entry={entry} refetch={q.refetch} />}</QueryBoundary>
    </>
  );
}
