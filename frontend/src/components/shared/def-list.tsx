import type { ReactNode } from 'react';

export function DefList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs text-muted-foreground">{k}</dt>
          <dd className="whitespace-pre-wrap">{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
