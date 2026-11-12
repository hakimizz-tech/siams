import { get, patch, post, upload } from '@/lib/api/endpoints';
import type { Page, PageParams } from '@/lib/api/pagination';
import type { ImportJob, JobStart, Role, SupervisorOption, User } from '@/types/domain';

export interface UserFilters extends PageParams {
    role?: Role;
    is_active?: boolean;
}

export interface UserInput {
    email: string;
    full_name: string;
    role: Role;
    phone?: string;
    is_active?: boolean;
    send_invite?: boolean;
    registration_number?: string;
    programme?: string;
    year_of_study?: number | null;
    organization?: string | null;
    job_title?: string;
    department?: string;
}

export const listUsers = (filters: UserFilters = {}, signal?: AbortSignal) =>
    get<Page<User>>('/api/v1/users/', { query: filters, signal });

export const createUser = (body: UserInput) => post<User>('/api/v1/users/', { body });

export const updateUser = (id: string, body: Partial<UserInput>) =>
    patch<User>('/api/v1/users/{id}/', { path: { id }, body });

export const listSupervisors = (role?: Role, signal?: AbortSignal) =>
    get<Page<SupervisorOption>>('/api/v1/supervisors/', {
        query: { role, page_size: 100 },
        signal,
    });

export function importUsers(
    file: File,
    sendInvites: boolean,
    onProgress?: (percent: number) => void,
) {
    const form = new FormData();
    form.append('file', file);
    form.append('send_invites', String(sendInvites));
    return upload<JobStart>('/api/v1/users/import/', form, { onProgress });
}

export const getImportJob = (jobId: string, signal?: AbortSignal) =>
    get<ImportJob>('/api/v1/users/import/{job_id}/', { path: { job_id: jobId }, signal });
