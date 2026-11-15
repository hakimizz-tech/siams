/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from 'react';
import { can } from '@/lib/auth/permissions';
import { useAuth } from '@/lib/auth/use-auth';

export function RoleGate({ action, fallback = null, children }: { action: any; fallback?: ReactNode; children: ReactNode }) {
  const { user } = useAuth();
  return <>{can(user as any, action) ? children : fallback}</>;
}
