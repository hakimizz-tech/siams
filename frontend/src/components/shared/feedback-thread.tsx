/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '@/lib/format';
import { nameOf } from '@/lib/rows';
import { ApiErrorAlert } from './api-error-alert';

export function FeedbackThread({
  items,
  onSubmit,
  canComment,
}: {
  items: any[];
  onSubmit?: (comment: string) => Promise<void>;
  canComment: boolean;
}) {
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>();
  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No feedback yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((f, i) => (
            <li key={f.id ?? i} className="rounded-md border p-3 text-sm">
              <p className="whitespace-pre-wrap">{f.comment}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {[nameOf(f.author ?? f.created_by), f.kind, f.created_at ? formatDateTime(f.created_at) : null].filter(Boolean).join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      )}
      {canComment && onSubmit && (
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!text.trim()) return;
            setPending(true);
            setError(undefined);
            try {
              await onSubmit(text.trim());
              setText('');
            } catch (err) {
              setError(err);
            } finally {
              setPending(false);
            }
          }}
        >
          <Label htmlFor="feedback-text">Add a comment</Label>
          <Textarea id="feedback-text" value={text} onChange={(e) => setText(e.target.value)} rows={3} />
          <ApiErrorAlert error={error} />
          <Button type="submit" size="sm" disabled={pending || !text.trim()}>
            Post comment
          </Button>
        </form>
      )}
    </div>
  );
}
