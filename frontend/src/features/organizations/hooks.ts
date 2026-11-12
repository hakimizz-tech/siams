import { useQuery } from '@tanstack/react-query';
import { STALE } from '@/lib/api/cache';
import { useApiMutation } from '@/lib/api/hooks-utils';
import { qk } from '@/lib/api/query-keys';
import * as api from './api';

/** Search-as-you-type: call with a debounced term; the query stays off below 2 characters. */
export const useOrganizations = (filters: api.OrganizationFilters = {}) =>
    useQuery({
        queryKey: qk.organizations.list(filters),
        queryFn: ({ signal }) => api.listOrganizations(filters, signal),
        staleTime: STALE.reference,
        enabled:
            filters.search === undefined ||
            filters.search.length === 0 ||
            filters.search.length >= 2,
    });

export const useCreateOrganization = () =>
    useApiMutation({
        mutationFn: (body: api.OrganizationInput) => api.createOrganization(body),
        invalidate: () => [qk.organizations.all()],
    });

export const useUpdateOrganization = () =>
    useApiMutation({
        mutationFn: (v: { id: string; body: Partial<api.OrganizationInput> }) =>
            api.updateOrganization(v.id, v.body),
        invalidate: () => [qk.organizations.all()],
    });

export const useVerifyOrganization = () =>
    useApiMutation({
        mutationFn: (id: string) => api.verifyOrganization(id),
        invalidate: () => [qk.organizations.all()],
    });
