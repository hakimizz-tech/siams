import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';
import {
    ApiError,
    errorMessage,
    flattenFieldErrors,
    hasStatus,
    isApiError,
    toApiError,
} from './errors';

function responseError(status: number, data: unknown, headers: Record<string, string> = {}) {
    const config = { headers: {} } as InternalAxiosRequestConfig;
    return new AxiosError(
        'failed',
        'ERR_BAD_REQUEST',
        config,
        {},
        {
            status,
            statusText: '',
            data,
            headers,
            config,
        },
    );
}

describe('toApiError', () => {
    it('reads the backend envelope', () => {
        const error = toApiError(
            responseError(422, {
                code: 'dates_outside_period',
                message: 'Outside the period.',
                details: { a: 1 },
            }),
        );
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(422);
        expect(error.code).toBe('dates_outside_period');
        expect(error.message).toBe('Outside the period.');
        expect(error.details).toEqual({ a: 1 });
    });

    it('keeps field errors of a validation failure', () => {
        const error = toApiError(
            responseError(400, {
                code: 'validation_error',
                message: 'Invalid input.',
                details: { email: ['Enter a valid email.'] },
            }),
        );
        expect(error.code).toBe('validation_error');
        expect(flattenFieldErrors(error.details)).toEqual({ email: ['Enter a valid email.'] });
    });

    it('falls back to readable defaults when the body is not an envelope', () => {
        expect(toApiError(responseError(404, '<html>')).code).toBe('not_found');
        expect(toApiError(responseError(404, '<html>')).message).toMatch(/could not find/i);
        expect(toApiError(responseError(500, null)).message).toMatch(/server/i);
        expect(toApiError(responseError(413, {})).message).toMatch(/too large/i);
    });

    it('reads Retry-After on 429', () => {
        const error = toApiError(responseError(429, {}, { 'retry-after': '30' }));
        expect(error.code).toBe('throttled');
        expect(error.retryAfter).toBe(30);
    });

    it('maps network failures and timeouts to status 0', () => {
        const offline = new AxiosError('Network Error', 'ERR_NETWORK');
        const slow = new AxiosError('timeout', 'ECONNABORTED');
        expect(toApiError(offline)).toMatchObject({ status: 0, code: 'network_error' });
        expect(toApiError(slow)).toMatchObject({ status: 0, code: 'timeout' });
    });

    it('maps cancellation, passes ApiError through and wraps unknown errors', () => {
        expect(toApiError(new axios.CanceledError()).code).toBe('canceled');
        const existing = new ApiError(409, 'invalid_transition', 'Nope');
        expect(toApiError(existing)).toBe(existing);
        expect(toApiError(new Error('boom')).message).toBe('boom');
        expect(toApiError('weird').code).toBe('unknown');
    });
});

describe('helpers', () => {
    it('flattens nested and list errors into dotted paths', () => {
        expect(
            flattenFieldErrors({
                email: ['Taken.'],
                activities: [{ hours: ['Too many.'] }, { description: ['Too short.'] }],
                profile: { phone: ['Invalid.'] },
                non_field_errors: ['Bad combination.'],
            }),
        ).toEqual({
            email: ['Taken.'],
            'activities.0.hours': ['Too many.'],
            'activities.1.description': ['Too short.'],
            'profile.phone': ['Invalid.'],
            non_field_errors: ['Bad combination.'],
        });
    });

    it('answers type questions about errors', () => {
        const error = new ApiError(404, 'not_found', 'x');
        expect(isApiError(error)).toBe(true);
        expect(isApiError(new Error('x'))).toBe(false);
        expect(hasStatus(error, 404)).toBe(true);
        expect(hasStatus(error, 500)).toBe(false);
        expect(errorMessage(error)).toBe('x');
        expect(errorMessage(undefined, 'fallback')).toBe('fallback');
    });
});
