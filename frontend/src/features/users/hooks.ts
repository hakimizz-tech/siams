import { useQuery } from '@tanstack/react-query';
import { STALE } from '@/lib/api/cache';
import { useApiMutation } from '@/lib/api/hooks-utils';
import { usePollJob } from '@/lib/api/jobs';
import { qk } from '@/lib/api/query-keys';
import type { Role } from '@/types/domain';
import * as api from './api';

export const useUsers = (filters: api.UserFilters = {}) =>
    useQuery({
        queryKey: qk.users.list(filters),
        queryFn: ({ signal }) => api.listUsers(filters, signal),
        staleTime: STALE.list,
    });

/** Feeds the approve dialog and reassignment pickers. */
export const useSupervisors = (role?: Role) =>
    useQuery({
        queryKey: qk.users.supervisors(role),
        queryFn: ({ signal }) => api.listSupervisors(role, signal),
        staleTime: STALE.reference,
    });

export const useCreateUser = () =>
    useApiMutation({
        mutationFn: (body: api.UserInput) => api.createUser(body),
        invalidate: () => [qk.users.all()],
    });

export const useUpdateUser = () =>
    useApiMutation({
        mutationFn: (v: { id: string; body: Partial<api.UserInput> }) =>
            api.updateUser(v.id, v.body),
        invalidate: () => [qk.users.all()],
    });

export const useImportUsers = () =>
    useApiMutation({
        mutationFn: (v: {
            file: File;
            sendInvites: boolean;
            onProgress?: (percent: number) => void;
        }) => api.importUsers(v.file, v.sendInvites, v.onProgress),
    });

/** Poll a CSV import started by useImportUsers. */
export const useImportJob = (jobId: string | null | undefined) =>
    usePollJob({ jobId, queryKey: qk.users.importJob(jobId ?? ''), fetcher: api.getImportJob });
