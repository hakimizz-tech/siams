/* eslint-disable @typescript-eslint/no-explicit-any */
import { Pin } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { Panel } from './panel';

export function NoticesCard({ notices }: { notices: any[] }) {
  const sorted = [...notices].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  return (
    <Panel title="Notices">
      {sorted.length === 0 ? (
        <p className="text-muted-foreground">No notices.</p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((n) => (
            <li key={n.id}>
              <p className="flex items-center gap-1 font-medium">
                {n.pinned && <Pin className="size-3" aria-label="Pinned" />}
                {n.title}
              </p>
              <p className="whitespace-pre-wrap text-muted-foreground">{n.body}</p>
              {n.publish_at && <p className="text-xs text-muted-foreground">{formatDateTime(n.publish_at)}</p>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
