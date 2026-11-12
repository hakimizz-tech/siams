import axios from 'axios';

/** One error type for every failed request: the backend envelope {code, message, details}. */
export class ApiError extends Error {
    status: number;
    code: string;
    details: Record<string, unknown>;
    retryAfter?: number;

    constructor(
        status: number,
        code: string,
        message: string,
        details: Record<string, unknown> = {},
        retryAfter?: number,
    ) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
        this.retryAfter = retryAfter;
    }
}

interface Envelope {
    code?: string;
    message?: string;
    details?: unknown;
}

function isEnvelope(value: unknown): value is Envelope {
    return typeof value === 'object' && value !== null && ('code' in value || 'message' in value);
}

function defaultCode(status: number): string {
    if (status === 401) return 'not_authenticated';
    if (status === 403) return 'not_allowed';
    if (status === 404) return 'not_found';
    if (status === 429) return 'throttled';
    return 'error';
}

function defaultMessage(status: number): string {
    if (status === 401) return 'Your session has ended. Please sign in again.';
    if (status === 403) return 'You do not have permission to do this.';
    if (status === 404) return 'We could not find what you asked for.';
    if (status === 413) return 'The file is too large.';
    if (status === 429) return 'Too many requests. Please wait a moment and try again.';
    if (status >= 500) return 'The server had a problem. Please try again.';
    return 'The request could not be completed.';
}

export function toApiError(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    if (axios.isCancel(error)) return new ApiError(0, 'canceled', 'The request was cancelled.');
    if (axios.isAxiosError(error)) {
        const response = error.response;
        if (!response) {
            const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
            return new ApiError(
                0,
                timedOut ? 'timeout' : 'network_error',
                timedOut
                    ? 'The server took too long to respond.'
                    : 'Cannot reach the server. Check your connection.',
            );
        }
        const data: unknown = response.data;
        const envelope: Envelope = isEnvelope(data) ? data : {};
        const rawRetry = (response.headers as Record<string, unknown> | undefined)?.['retry-after'];
        const retryAfter = rawRetry === undefined ? undefined : Number(rawRetry);
        const details =
            typeof envelope.details === 'object' && envelope.details !== null
                ? (envelope.details as Record<string, unknown>)
                : {};
        return new ApiError(
            response.status,
            envelope.code ?? defaultCode(response.status),
            envelope.message ?? defaultMessage(response.status),
            details,
            retryAfter !== undefined && Number.isFinite(retryAfter) ? retryAfter : undefined,
        );
    }
    return new ApiError(
        0,
        'unknown',
        error instanceof Error ? error.message : 'Something went wrong.',
    );
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

export const hasStatus = (error: unknown, status: number): boolean =>
    isApiError(error) && error.status === status;

/** Flatten DRF validation details ({field: ["msg"], nested: {x: ["msg"]}}) into dotted paths. */
export function flattenFieldErrors(details: unknown): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    const push = (path: string, message: string) => {
        (out[path] ??= []).push(message);
    };
    const visit = (value: unknown, path: string) => {
        if (typeof value === 'string') {
            push(path, value);
        } else if (Array.isArray(value)) {
            value.forEach((item, index) => {
                if (typeof item === 'string') push(path, item);
                else visit(item, path ? `${path}.${index}` : String(index));
            });
        } else if (value && typeof value === 'object') {
            for (const [key, inner] of Object.entries(value))
                visit(inner, path ? `${path}.${key}` : key);
        }
    };
    visit(details, '');
    return out;
}

/** First readable message from an unknown error, for toasts. */
export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
    if (isApiError(error)) return error.message;
    if (error instanceof Error) return error.message;
    return fallback;
}
