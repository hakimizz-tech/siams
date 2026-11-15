import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

type V = string | number | undefined;

/**
 * Reads and writes page, search, filters ... in the query string.
 * Keys equal to their default are omitted. `page` resets to 1 when any other key changes.
 */
export function useUrlState<T extends Record<string, V>>(defaults: T) {
  const [params, setParams] = useSearchParams();

  const state = { ...defaults } as Record<string, V>;
  for (const key of Object.keys(defaults)) {
    const raw = params.get(key);
    if (raw === null) continue;
    const d = defaults[key];
    if (typeof d === 'number') {
      const n = Number(raw);
      state[key] = Number.isFinite(n) && n > 0 ? n : d;
    } else {
      state[key] = raw;
    }
  }

  const set = useCallback(
    (patch: Partial<T>) => {
      const next = new URLSearchParams(params);
      const keys = Object.keys(patch);
      for (const key of keys) {
        const v = patch[key] as V;
        if (v === undefined || v === '' || v === defaults[key]) next.delete(key);
        else next.set(key, String(v));
      }
      const onlyPage = keys.length === 1 && keys[0] === 'page';
      if (!keys.includes('page') && 'page' in defaults) next.delete('page');
      setParams(next, { replace: !onlyPage });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params, setParams, JSON.stringify(defaults)],
  );

  const reset = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams]);

  return { state: state as T, set, reset };
}
