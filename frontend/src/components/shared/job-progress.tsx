import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from './status-badge';

export function JobProgress({ job }: { job: { status: string; error?: string } | undefined }) {
  if (!job) return null;
  const running = job.status === 'PENDING' || job.status === 'RUNNING';
  return (
    <div className="space-y-2" aria-live="polite">
      <StatusBadge kind="job" status={job.status} />
      {running && <Progress value={undefined} aria-label="Working" />}
      {job.status === 'FAILURE' && (
        <Alert variant="destructive">
          <AlertDescription>{job.error ?? 'The job failed.'}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
