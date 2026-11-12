import { useQuery } from '@tanstack/react-query';
import { STALE } from '@/lib/api/cache';
import { useApiMutation } from '@/lib/api/hooks-utils';
import { qk } from '@/lib/api/query-keys';
import * as api from './api';

export const usePlacements = (filters: api.PlacementFilters = {}) =>
    useQuery({
        queryKey: qk.placements.list(filters),
        queryFn: ({ signal }) => api.listPlacements(filters, signal),
        staleTime: STALE.list,
    });

export const useMyPlacement = () =>
    useQuery({
        queryKey: qk.placements.mine(),
        queryFn: ({ signal }) => api.getMyPlacement(signal),
        staleTime: STALE.detail,
        retry: false, // 404 means "no placement yet", which is a normal state
    });

export const usePlacement = (id: string | undefined) =>
    useQuery({
        queryKey: qk.placements.detail(id ?? ''),
        queryFn: ({ signal }) => api.getPlacement(id as string, signal),
        enabled: Boolean(id),
        staleTime: STALE.detail,
    });

export const usePlacementTimeline = (id: string | undefined) =>
    useQuery({
        queryKey: qk.placements.timeline(id ?? ''),
        queryFn: ({ signal }) => api.getPlacementTimeline(id as string, signal),
        enabled: Boolean(id),
        staleTime: STALE.detail,
    });

const refresh = () => [qk.placements.all(), qk.dashboards()] as const;

export const useCreatePlacement = () =>
    useApiMutation({
        mutationFn: (body: api.PlacementCreateInput) => api.createPlacement(body),
        invalidate: refresh,
    });

export const useUpdatePlacement = () =>
    useApiMutation({
        mutationFn: (v: { id: string; body: api.PlacementUpdateInput }) =>
            api.updatePlacement(v.id, v.body),
        invalidate: refresh,
    });

export const useSubmitPlacement = () =>
    useApiMutation({ mutationFn: (id: string) => api.submitPlacement(id), invalidate: refresh });

export const useApprovePlacement = () =>
    useApiMutation({
        mutationFn: (v: { id: string; body: api.ApproveInput }) =>
            api.approvePlacement(v.id, v.body),
        invalidate: () => [...refresh(), qk.users.all()],
    });

export const useReturnPlacement = () =>
    useApiMutation({
        mutationFn: (v: { id: string; remarks: string }) => api.returnPlacement(v.id, v.remarks),
        invalidate: refresh,
    });

export const useRejectPlacement = () =>
    useApiMutation({
        mutationFn: (v: { id: string; remarks: string }) => api.rejectPlacement(v.id, v.remarks),
        invalidate: refresh,
    });

export const useAssignSupervisors = () =>
    useApiMutation({
        mutationFn: (v: { id: string; body: api.AssignInput }) =>
            api.assignSupervisors(v.id, v.body),
        invalidate: refresh,
    });

export const useCompletePlacement = () =>
    useApiMutation({ mutationFn: (id: string) => api.completePlacement(id), invalidate: refresh });

export const useTerminatePlacement = () =>
    useApiMutation({
        mutationFn: (v: { id: string; reason: string }) => api.terminatePlacement(v.id, v.reason),
        invalidate: refresh,
    });
