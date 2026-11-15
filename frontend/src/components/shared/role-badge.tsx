import { Badge } from '@/components/ui/badge';

const LABEL: Record<string, string> = {
  STUDENT: 'Student',
  WORKPLACE_SUPERVISOR: 'Industrial supervisor',
  ACADEMIC_SUPERVISOR: 'Academic supervisor',
  COORDINATOR: 'Coordinator',
};

export function RoleBadge({ role }: { role: string }) {
  return <Badge variant="secondary">{LABEL[role] ?? role}</Badge>;
}
