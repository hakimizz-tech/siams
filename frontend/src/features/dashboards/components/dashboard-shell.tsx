/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ActionItemsCard } from '@/components/shared/action-items-card';
import { NoticesCard } from '@/components/shared/notices-card';
import { PageHeader } from '@/components/shared/page-header';
import { QueryBoundary } from '@/components/shared/query-boundary';
import { actionTarget } from './action-target';

export function DashboardShell({
  title = 'Dashboard',
  data,
  actions,
  children,
}: {
  title?: string;
  data: any;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const items = (data?.action_items ?? []).map((a: any) => ({
    type: a.type,
    label: a.label ?? a.message ?? a.title ?? String(a.type).replace(/_/g, ' '),
    to: actionTarget(a.type),
  }));
  return (
    <>
      <PageHeader title={title} actions={actions} />
      {import.meta.env.DEV && data?.unavailable?.length > 0 && (
        <Alert className="mb-4">
          <AlertDescription>Dev only: backend selectors not delivered yet: {data.unavailable.join(', ')}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-4">
        <ActionItemsCard items={items} />
        <div className="grid gap-4 md:grid-cols-2">{children}</div>
        <NoticesCard notices={data?.notices ?? []} />
      </div>
    </>
  );
}

/** Renders one dashboard query through the shared envelope. */
export function DashView({
  query,
  actions,
  children,
}: {
  query: any;
  actions?: ReactNode;
  children: (widgets: any, data: any) => ReactNode;
}) {
  return (
    <QueryBoundary query={query}>
      {(data: any) => (
        <DashboardShell data={data} actions={actions}>
          {children(data?.widgets ?? {}, data)}
        </DashboardShell>
      )}
    </QueryBoundary>
  );
}
