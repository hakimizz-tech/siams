import { describe, expect, it } from 'vitest';
import { nextPollInterval, JOB_TIMEOUT_MS } from './jobs';
import { DEFAULT_PAGE_SIZE, emptyPage, pageCount } from './pagination';
import { qk } from './query-keys';
import { shouldRetry } from './query-client';
import { ApiError } from './errors';

const startsWith = (key: readonly unknown[], prefix: readonly unknown[]) =>
    prefix.every((part, index) => JSON.stringify(key[index]) === JSON.stringify(part));

describe('query keys', () => {
    it('nest so that invalidating a parent refreshes its children', () => {
        expect(startsWith(qk.placements.detail('1'), qk.placements.all())).toBe(true);
        expect(startsWith(qk.placements.list({ a: 1 }), qk.placements.all())).toBe(true);
        expect(startsWith(qk.placements.timeline('1'), qk.placements.detail('1'))).toBe(true);
        expect(startsWith(qk.logbook.list('p', {}), qk.logbook.all('p'))).toBe(true);
        expect(startsWith(qk.logbook.entry('e'), qk.logbook.everything())).toBe(true);
        expect(startsWith(qk.dashboard('STUDENT'), qk.dashboards())).toBe(true);
        expect(startsWith(qk.reports.exportJob('j'), qk.reports.all())).toBe(true);
    });

    it('keep unrelated areas apart', () => {
        expect(startsWith(qk.users.all(), qk.placements.all())).toBe(false);
        expect(startsWith(qk.logbook.all('a'), qk.logbook.all('b'))).toBe(false);
    });
});

describe('job polling cadence', () => {
    it('polls fast, then slower, then stops', () => {
        expect(nextPollInterval('PENDING', 0)).toBe(2000);
        expect(nextPollInterval('RUNNING', 10_000)).toBe(2000);
        expect(nextPollInterval('RUNNING', 31_000)).toBe(5000);
        expect(nextPollInterval('RUNNING', JOB_TIMEOUT_MS + 1)).toBe(false);
    });

    it('stops on a final state', () => {
        expect(nextPollInterval('SUCCESS', 0)).toBe(false);
        expect(nextPollInterval('FAILURE', 0)).toBe(false);
    });

    it('keeps polling while the first answer has not arrived', () => {
        expect(nextPollInterval(undefined, 100)).toBe(2000);
    });
});

describe('pagination helpers', () => {
    it('computes page counts and empty pages', () => {
        expect(pageCount(0)).toBe(1);
        expect(pageCount(41, 20)).toBe(3);
        expect(pageCount(40)).toBe(Math.ceil(40 / DEFAULT_PAGE_SIZE));
        expect(emptyPage()).toEqual({ count: 0, next: null, previous: null, results: [] });
    });
});

describe('shouldRetry', () => {
    it('never retries client errors', () => {
        expect(shouldRetry(0, new ApiError(404, 'not_found', 'x'))).toBe(false);
        expect(shouldRetry(0, new ApiError(422, 'rule', 'x'))).toBe(false);
    });

    it('retries server and network failures at most twice', () => {
        expect(shouldRetry(0, new ApiError(503, 'error', 'x'))).toBe(true);
        expect(shouldRetry(1, new ApiError(0, 'network_error', 'x'))).toBe(true);
        expect(shouldRetry(2, new ApiError(503, 'error', 'x'))).toBe(false);
    });
});
