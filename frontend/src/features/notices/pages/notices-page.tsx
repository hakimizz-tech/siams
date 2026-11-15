/* eslint-disable @typescript-eslint/no-explicit-any */
import { Pin } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Panel } from '@/components/shared/panel';
import { QueryBoundary } from '@/components/shared/query-boundary';
import { formatDateTime } from '@/lib/format';
import { rows } from '@/lib/rows';
import { useUrlState } from '@/lib/use-url-state';
import { useNotices } from '..';

export default function NoticesPage() {
  const { state } = useUrlState({ page: 1 });
  const q = useNotices(state);
  return (
    <>
      <PageHeader title="Notices" description="Announcements for you." />
      <QueryBoundary query={q} empty={(d) => rows(d).length === 0} emptyState={<EmptyState title="No notices" />}>
        {(d) => (
          <div className="space-y-3">
            {[...rows(d)].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned)).map((n: any) => (
              <Panel key={n.id} title={n.title} action={n.pinned ? <Pin className="size-4" aria-label="Pinned" /> : undefined}>
                <p className="whitespace-pre-wrap">{n.body}</p>
                {n.publish_at && <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(n.publish_at)}</p>}
              </Panel>
            ))}
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
