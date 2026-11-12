/**
 * Typed request helpers. `path` must be a key of the generated OpenAPI `paths` type AND support
 * the HTTP method, so a wrong path or method is a compile error once `api.d.ts` is generated.
 * Path parameters use the schema's `{name}` syntax and are filled from `options.path`.
 */
import type { AxiosProgressEvent } from 'axios';
import type { paths } from '@/types/api';
import { http } from './client';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

export type PathsWith<M extends Method> = {
    [P in keyof paths]: M extends keyof paths[P] ? P : never;
}[keyof paths] &
    string;

export interface CallOptions {
    path?: Record<string, string | number>;
    query?: object;
    body?: unknown;
    signal?: AbortSignal;
}

export function buildUrl(path: string, params: Record<string, string | number> = {}): string {
    return path.replace(/\{(\w+)\}/g, (_, key: string) => {
        const value = params[key];
        if (value === undefined) throw new Error(`Missing path parameter "${key}" for ${path}`);
        return encodeURIComponent(String(value));
    });
}

/** Drop undefined, null and empty-string entries so filters do not send "?search=". */
export function cleanQuery(query: object): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(query).filter(
            ([, value]) => value !== undefined && value !== null && value !== '',
        ),
    );
}

async function send<T>(method: Method, path: string, options: CallOptions = {}): Promise<T> {
    const response = await http.request<T>({
        method,
        url: buildUrl(path, options.path),
        params: options.query ? cleanQuery(options.query) : undefined,
        data: options.body,
        signal: options.signal,
    });
    return response.data;
}

export const get = <T>(path: PathsWith<'get'>, options?: CallOptions) =>
    send<T>('get', path, options);
export const post = <T>(path: PathsWith<'post'>, options?: CallOptions) =>
    send<T>('post', path, options);
export const put = <T>(path: PathsWith<'put'>, options?: CallOptions) =>
    send<T>('put', path, options);
export const patch = <T>(path: PathsWith<'patch'>, options?: CallOptions) =>
    send<T>('patch', path, options);
export const del = <T = void>(path: PathsWith<'delete'>, options?: CallOptions) =>
    send<T>('delete', path, options);

export interface UploadOptions {
    path?: Record<string, string | number>;
    signal?: AbortSignal;
    onProgress?: (percent: number) => void;
}

/** multipart/form-data. The boundary header is set by the browser: never set Content-Type by hand. */
export async function upload<T>(
    path: PathsWith<'post'>,
    form: FormData,
    options: UploadOptions = {},
): Promise<T> {
    const response = await http.post<T>(buildUrl(path, options.path), form, {
        signal: options.signal,
        onUploadProgress: (event: AxiosProgressEvent) => {
            if (options.onProgress && event.total) {
                options.onProgress(Math.round((event.loaded / event.total) * 100));
            }
        },
    });
    return response.data;
}
