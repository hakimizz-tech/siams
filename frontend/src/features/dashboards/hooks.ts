import { useQuery } from '@tanstack/react-query';
import { STALE } from '@/lib/api/cache';
import { qk } from '@/lib/api/query-keys';
import type { Role } from '@/types/domain';
import * as api from './api';

export function useDashboard<W>(role: Role, params: object = {}) {
    return useQuery({
        queryKey: qk.dashboard(role, params),
        queryFn: ({ signal }) => api.getDashboard<W>(role, params, signal),
        staleTime: STALE.dashboard,
        refetchOnWindowFocus: true,
    });
}

export const useStudentDashboard = () => useDashboard<api.StudentWidgets>('STUDENT');
export const useWorkplaceDashboard = () =>
    useDashboard<api.WorkplaceWidgets>('WORKPLACE_SUPERVISOR');
export const useAcademicDashboard = () => useDashboard<api.AcademicWidgets>('ACADEMIC_SUPERVISOR');
export const useCoordinatorDashboard = (period?: string) =>
    useDashboard<api.CoordinatorWidgets>('COORDINATOR', period ? { period } : {});
