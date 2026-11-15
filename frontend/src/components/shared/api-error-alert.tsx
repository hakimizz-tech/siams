/* eslint-disable @typescript-eslint/no-explicit-any */
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { errorMessage, isApiError } from '@/lib/api/errors';

export function ApiErrorAlert({ error, messages }: { error?: unknown; messages?: string[] }) {
  const list = [...(messages ?? [])];
  let missing: string[] = [];
  if (error) {
    list.push(errorMessage(error));
    const m = isApiError(error) ? (error as any).details?.missing : undefined;
    if (Array.isArray(m)) missing = m.map(String);
  }
  if (list.length === 0 && missing.length === 0) return null;
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircle className="size-4" aria-hidden />
      <AlertDescription>
        {list.map((m, i) => (
          <p key={i}>{m}</p>
        ))}
        {missing.length > 0 && (
          <ul className="mt-2 list-disc pl-5">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
}
