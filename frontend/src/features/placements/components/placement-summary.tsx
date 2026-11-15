/* eslint-disable @typescript-eslint/no-explicit-any */
import { DefList } from '@/components/shared/def-list';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate } from '@/lib/format';
import { nameOf } from '@/lib/rows';

export function PlacementSummary({ placement: p }: { placement: any }) {
  return (
    <DefList
      items={[
        ['Status', <StatusBadge key="s" kind="placement" status={p.status} />],
        ['Organisation', nameOf(p.organization)],
        ['Period', nameOf(p.period)],
        ['Role', p.role_title],
        ['Department', p.department],
        ['Dates', `${formatDate(p.start_date)} to ${formatDate(p.end_date)}`],
        ['Tasks', p.task_description],
        ['Proposed supervisor', [p.proposed_supervisor_name, p.proposed_supervisor_email, p.proposed_supervisor_phone].filter(Boolean).join(' · ')],
        ...(p.academic_supervisor ? ([['Academic supervisor', nameOf(p.academic_supervisor)]] as [string, string][]) : []),
        ...(p.workplace_supervisor ? ([['Industrial supervisor', nameOf(p.workplace_supervisor)]] as [string, string][]) : []),
        ...(p.coordinator_remarks ? ([['Coordinator remarks', p.coordinator_remarks]] as [string, string][]) : []),
      ]}
    />
  );
}
