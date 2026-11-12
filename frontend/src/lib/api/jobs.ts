import { useRef } from 'react';
import { useQuery, type QueryKey } from '@tanstack/react-query';
import type { JobStatus } from '@/types/domain';

export const JOB_TIMEOUT_MS = 5 * 60_000;
const FAST_MS = 2_000;
const SLOW_MS = 5_000;
const SLOW_AFTER_MS = 30_000;

/** Polling cadence: every 2 s, every 5 s after 30 s, stop on a final state or after 5 minutes. */
export function nextPollInterval(status: JobStatus | undefined, elapsedMs: number): number | false {
    if (status === 'SUCCESS' || status === 'FAILURE') return false;
    if (elapsedMs > JOB_TIMEOUT_MS) return false;
    return elapsedMs > SLOW_AFTER_MS ? SLOW_MS : FAST_MS;
}

interface PollOptions<T extends { status: JobStatus }> {
    jobId: string | null | undefined;
    queryKey: QueryKey;
    fetcher: (jobId: string, signal?: AbortSignal) => Promise<T>;
}

/** 202 + polling: the browser never sees RabbitMQ, only a job whose state it asks for. */
export function usePollJob<T extends { status: JobStatus }>({
    jobId,
    queryKey,
    fetcher,
}: PollOptions<T>) {
    const startedAt = useRef({ jobId: jobId ?? null, at: Date.now() });
    if (startedAt.current.jobId !== (jobId ?? null)) {
        startedAt.current = { jobId: jobId ?? null, at: Date.now() };
    }
    return useQuery({
        queryKey,
        queryFn: ({ signal }) => fetcher(jobId as string, signal),
        enabled: Boolean(jobId),
        retry: false,
        staleTime: 0,
        refetchInterval: (query) =>
            query.state.error
                ? false
                : nextPollInterval(query.state.data?.status, Date.now() - startedAt.current.at),
    });
}
