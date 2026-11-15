import type { ReactNode } from 'react';
import { Circle } from 'lucide-react';
import { formatDateTime } from '@/lib/format';

export interface TimelineEvent {
  label: ReactNode;
  at?: string;
  by?: string | null;
  note?: string;
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-muted-foreground">No history yet.</p>;
  return (
    <ol className="space-y-3">
      {events.map((e, i) => (
        <li key={i} className="flex gap-3">
          <Circle className="mt-1 size-3 shrink-0 fill-current" aria-hidden />
          <div className="text-sm">
            <div className="font-medium">{e.label}</div>
            <div className="text-xs text-muted-foreground">
              {[e.at ? formatDateTime(e.at) : null, e.by ? `by ${e.by}` : null].filter(Boolean).join(' · ')}
            </div>
            {e.note && <p className="mt-1 whitespace-pre-wrap">{e.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
