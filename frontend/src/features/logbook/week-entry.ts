/* eslint-disable @typescript-eslint/no-explicit-any */
import { rows } from '@/lib/rows';

/** The timeline endpoint answers an array, or `{ weeks }`, or a page. */
export function timelineRows(data: any): any[] {
  return Array.isArray(data) ? data : (data?.weeks ?? rows(data));
}

/**
 * One timeline row looks like `{ week_start, status, entry }` where `entry` is the weekly entry
 * (an object or just an id) or null for a missing week. Older shapes (`entry_id`, `id`) are accepted too.
 */
export function weekEntry(w: any): { id?: string; claimed?: unknown; approved?: unknown } {
  const e = w?.entry;
  const id: string | undefined = typeof e === 'string' ? e : (e?.id ?? w?.entry_id ?? w?.id);
  return {
    id,
    claimed: e?.claimed_hours ?? w?.claimed_hours,
    approved: e?.approved_hours ?? w?.approved_hours,
  };
}
