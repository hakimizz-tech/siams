/**
 * Hook tests: every mutation declares which cached data it refreshes (so no screen goes stale
 * after a write), and queries behave: no request without an id, no retries on 4xx.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { http as mswHttp } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { useCoordinatorDashboard } from '@/features/dashboards';
import { useFinalizeResult } from '@/features/assessments';
import { useUploadFinalReport } from '@/features/final-report';
import { useApproveWeek, useCreateWeek, useUploadImage } from '@/features/logbook';
import { useCreateNotice } from '@/features/notices';
import { useOrganizations } from '@/features/organizations';
import { useSetGradeBands } from '@/features/periods';
import {
    useApprovePlacement,
    useMyPlacement,
    usePlacement,
    usePlacements,
    useSubmitPlacement,
} from '@/features/placements';
import { useImportJob } from '@/features/users';
import { createQueryClient } from '@/lib/api/query-client';
import { qk } from '@/lib/api/query-keys';
import { captureApi } from './capture';
import { envelope, url } from './msw/handlers';
import { server } from './msw/server';
import { createHookWrapper } from './render';

function setup() {
    const queryClient = createQueryClient({ retry: false });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    return { queryClient, spy, wrapper: createHookWrapper(queryClient) };
}

const invalidated = (spy: { mock: { calls: unknown[][] } }) =>
    spy.mock.calls.map((call) => (call[0] as { queryKey: unknown }).queryKey);

describe('mutations refresh the right data', () => {
    it('submit placement: placements and dashboards', async () => {
        captureApi({});
        const { spy, wrapper } = setup();
        const { result } = renderHook(() => useSubmitPlacement(), { wrapper });
        await act(async () => {
            await result.current.mutateAsync('p1');
        });
        expect(invalidated(spy)).toContainEqual(qk.placements.all());
        expect(invalidated(spy)).toContainEqual(qk.dashboards());
    });

    it('approve placement: also users (an invited supervisor may have been created)', async () => {
        captureApi({});
        const { spy, wrapper } = setup();
        const { result } = renderHook(() => useApprovePlacement(), { wrapper });
        await act(async () => {
            await result.current.mutateAsync({
                id: 'p1',
                body: { academic_supervisor: 'a1', invite_workplace_supervisor: true },
            });
        });
        expect(invalidated(spy)).toContainEqual(qk.placements.all());
        expect(invalidated(spy)).toContainEqual(qk.users.all());
    });

    it('create week: that placement’s logbook and dashboards', async () => {
        captureApi({});
        const { spy, wrapper } = setup();
        const { result } = renderHook(() => useCreateWeek(), { wrapper });
        await act(async () => {
            await result.current.mutateAsync({
                placementId: 'p1',
                body: { week_start: '2026-11-09', activities: [] },
            });
        });
        expect(invalidated(spy)).toContainEqual(qk.logbook.all('p1'));
        expect(invalidated(spy)).toContainEqual(qk.dashboards());
    });

    it('approve week: logbook, flags, dashboards and report summaries', async () => {
        captureApi({});
        const { spy, wrapper } = setup();
        const { result } = renderHook(() => useApproveWeek(), { wrapper });
        await act(async () => {
            await result.current.mutateAsync({ id: 'e1', body: { comment: 'ok' } });
        });
        for (const key of [
            qk.logbook.everything(),
            qk.flags.all(),
            qk.dashboards(),
            qk.reports.all(),
        ]) {
            expect(invalidated(spy)).toContainEqual(key);
        }
    });

    it('upload image: that entry', async () => {
        captureApi({});
        const { spy, wrapper } = setup();
        const { result } = renderHook(() => useUploadImage(), { wrapper });
        await act(async () => {
            await result.current.mutateAsync({
                entryId: 'e1',
                file: new File(['x'], 'a.png', { type: 'image/png' }),
            });
        });
        expect(invalidated(spy)).toContainEqual(qk.logbook.entry('e1'));
    });

    it('upload final report: the report and the result preview', async () => {
        captureApi({});
        const { spy, wrapper } = setup();
        const { result } = renderHook(() => useUploadFinalReport(), { wrapper });
        await act(async () => {
            await result.current.mutateAsync({
                placementId: 'p1',
                file: new File(['%PDF'], 'r.pdf', { type: 'application/pdf' }),
            });
        });
        expect(invalidated(spy)).toContainEqual(qk.finalReport('p1'));
        expect(invalidated(spy)).toContainEqual(qk.result('p1'));
    });

    it('finalize result: result, assessments, dashboards, reports', async () => {
        captureApi({});
        const { spy, wrapper } = setup();
        const { result } = renderHook(() => useFinalizeResult(), { wrapper });
        await act(async () => {
            await result.current.mutateAsync('p1');
        });
        for (const key of [
            qk.result('p1'),
            qk.assessments.all(),
            qk.dashboards(),
            qk.reports.all(),
        ]) {
            expect(invalidated(spy)).toContainEqual(key);
        }
    });

    it('notices: every dashboard shows notices, so they refresh too', async () => {
        captureApi({});
        const { spy, wrapper } = setup();
        const { result } = renderHook(() => useCreateNotice(), { wrapper });
        await act(async () => {
            await result.current.mutateAsync({ title: 'T', body: 'B', audience: 'ALL' });
        });
        expect(invalidated(spy)).toContainEqual(qk.notices.all());
        expect(invalidated(spy)).toContainEqual(qk.dashboards());
    });

    it('grade bands: that period’s bands', async () => {
        captureApi({});
        const { spy, wrapper } = setup();
        const { result } = renderHook(() => useSetGradeBands(), { wrapper });
        await act(async () => {
            await result.current.mutateAsync({
                periodId: 'per1',
                bands: [{ min_percent: 0, label: 'F' }],
            });
        });
        expect(invalidated(spy)).toContainEqual(qk.periods.gradeBands('per1'));
    });

    it('does not invalidate anything when the request fails', async () => {
        server.use(
            mswHttp.post(url('/api/v1/placements/p1/submit/'), () =>
                envelope(409, 'invalid_transition', 'Already submitted.'),
            ),
        );
        const { spy, wrapper } = setup();
        const { result } = renderHook(() => useSubmitPlacement(), { wrapper });
        await act(async () => {
            await result.current.mutateAsync('p1').catch(() => undefined);
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toMatchObject({ status: 409, code: 'invalid_transition' });
        expect(spy).not.toHaveBeenCalled();
    });
});

describe('queries', () => {
    it('make no request without an id', () => {
        const calls = captureApi();
        const { wrapper } = setup();
        const { result } = renderHook(() => usePlacement(undefined), { wrapper });
        expect(result.current.fetchStatus).toBe('idle');
        expect(calls).toHaveLength(0);
    });

    it('send the filters', async () => {
        const calls = captureApi();
        const { wrapper } = setup();
        const { result } = renderHook(() => usePlacements({ status: 'SUBMITTED', page: 2 }), {
            wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const query = new URLSearchParams(calls[0]?.search);
        expect(query.get('status')).toBe('SUBMITTED');
        expect(query.get('page')).toBe('2');
    });

    it('treat 404 for "my placement" as a normal state and never retry it', async () => {
        let requests = 0;
        server.use(
            mswHttp.get(url('/api/v1/placements/me/'), () => {
                requests += 1;
                return envelope(404, 'not_found', 'You have no placement yet.');
            }),
        );
        const { wrapper } = setup();
        const { result } = renderHook(() => useMyPlacement(), { wrapper });
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toMatchObject({ status: 404 });
        expect(requests).toBe(1);
    });

    it('wait for two characters before searching organisations', async () => {
        const calls = captureApi();
        const { wrapper } = setup();
        const short = renderHook(() => useOrganizations({ search: 'a' }), { wrapper });
        expect(short.result.current.fetchStatus).toBe('idle');
        const long = renderHook(() => useOrganizations({ search: 'ac' }), { wrapper });
        await waitFor(() => expect(long.result.current.isSuccess).toBe(true));
        expect(calls).toHaveLength(1);
        expect(new URLSearchParams(calls[0]?.search).get('search')).toBe('ac');
    });

    it('pass the period to the coordinator dashboard', async () => {
        const calls = captureApi({
            role: 'COORDINATOR',
            widgets: {},
            action_items: [],
            notices: [],
            unavailable: [],
        });
        const { wrapper } = setup();
        const { result } = renderHook(() => useCoordinatorDashboard('per1'), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(new URLSearchParams(calls[0]?.search).get('period')).toBe('per1');
    });

    it('do not poll a job that has not started', () => {
        const calls = captureApi();
        const { wrapper } = setup();
        const { result } = renderHook(() => useImportJob(null), { wrapper });
        expect(result.current.fetchStatus).toBe('idle');
        expect(calls).toHaveLength(0);
    });
});
