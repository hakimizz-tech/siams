import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { errorMessage, hasStatus } from '@/lib/api/errors';

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const notFound = hasStatus(error, 404);
  const forbidden = hasStatus(error, 403);
  const text = notFound
    ? 'We could not find that. It may not exist, or you may not have access to it.'
    : forbidden
      ? 'You are not allowed to do that.'
      : errorMessage(error);
  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" aria-hidden />
      <AlertTitle>{notFound ? 'Not found' : 'Something went wrong'}</AlertTitle>
      <AlertDescription>
        <p>{text}</p>
        {onRetry && !notFound && (
          <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
