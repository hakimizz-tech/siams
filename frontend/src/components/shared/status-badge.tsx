import {
  AlertCircle,
  Ban,
  BadgeCheck,
  CalendarClock,
  CalendarX,
  Check,
  CheckCircle2,
  Clock,
  Flag,
  Hourglass,
  Loader2,
  Lock,
  PencilLine,
  Undo2,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusKind = 'placement' | 'logbook' | 'report' | 'assessment' | 'visit' | 'job' | 'indicator';
type Style = 'solid' | 'outline' | 'dashed' | 'bold' | 'strike' | 'destructive' | 'plain';
type Entry = [Style, LucideIcon];

const workflow: Record<string, Entry> = {
  DRAFT: ['dashed', PencilLine],
  SUBMITTED: ['outline', Hourglass],
  RETURNED: ['bold', Undo2],
  APPROVED: ['solid', CheckCircle2],
  COMPLETED: ['solid', BadgeCheck],
  REJECTED: ['strike', XCircle],
  TERMINATED: ['strike', Ban],
};

export const STATUS_MAP: Record<StatusKind, Record<string, Entry>> = {
  placement: workflow,
  logbook: { ...workflow, MISSING: ['dashed', CalendarX] },
  report: { SUBMITTED: ['outline', Hourglass], RETURNED: ['bold', Undo2], ACCEPTED: ['solid', CheckCircle2] },
  assessment: { DRAFT: ['outline', PencilLine], SUBMITTED: ['solid', Lock] },
  visit: { SCHEDULED: ['outline', CalendarClock], COMPLETED: ['solid', CheckCircle2], CANCELLED: ['strike', Ban] },
  job: {
    PENDING: ['outline', Hourglass],
    RUNNING: ['outline', Loader2],
    SUCCESS: ['solid', CheckCircle2],
    FAILURE: ['destructive', AlertCircle],
  },
  indicator: { on_track: ['plain', Check], behind: ['outline', Clock], flagged: ['solid', Flag] },
};

const humanize = (s: string) => {
  const t = s.replace(/_/g, ' ').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export function StatusBadge({ kind, status }: { kind: StatusKind; status: string }) {
  const [style, Icon] = STATUS_MAP[kind]?.[status] ?? (['outline', undefined] as unknown as Entry);
  return (
    <Badge
      variant={style === 'solid' ? 'default' : style === 'destructive' ? 'destructive' : 'outline'}
      className={cn(
        style === 'dashed' && 'border-dashed',
        style === 'bold' && 'font-bold',
        style === 'strike' && 'line-through',
        style === 'plain' && 'border-transparent',
        'gap-1',
      )}
    >
      {Icon && <Icon className={cn('size-3', status === 'RUNNING' && 'animate-spin')} aria-hidden />}
      <span>{humanize(status)}</span>
    </Badge>
  );
}
