import { get, patch, post } from '@/lib/api/endpoints';
import type { Page, PageParams } from '@/lib/api/pagination';
import type { Organization } from '@/types/domain';

export interface OrganizationFilters extends PageParams {
    is_verified?: boolean;
    county?: string;
}

export interface OrganizationInput {
    name: string;
    address?: string;
    county?: string;
    contact_email?: string;
    contact_phone?: string;
}

export const listOrganizations = (filters: OrganizationFilters = {}, signal?: AbortSignal) =>
    get<Page<Organization>>('/api/v1/organizations/', { query: filters, signal });

export const createOrganization = (body: OrganizationInput) =>
    post<Organization>('/api/v1/organizations/', { body });

export const updateOrganization = (id: string, body: Partial<OrganizationInput>) =>
    patch<Organization>('/api/v1/organizations/{id}/', { path: { id }, body });

export const verifyOrganization = (id: string) =>
    post<Organization>('/api/v1/organizations/{id}/verify/', { path: { id } });
