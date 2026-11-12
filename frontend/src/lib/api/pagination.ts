export interface Page<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface PageParams {
    page?: number;
    page_size?: number;
    search?: string;
    ordering?: string;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const emptyPage = <T>(): Page<T> => ({ count: 0, next: null, previous: null, results: [] });

export const pageCount = (count: number, pageSize = DEFAULT_PAGE_SIZE): number =>
    Math.max(1, Math.ceil(count / Math.max(1, pageSize)));
