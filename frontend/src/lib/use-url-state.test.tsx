import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useUrlState } from './use-url-state';

const wrap = (url: string) => ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>;
const useBoth = () => ({ s: useUrlState({ page: 1, search: '', status: '' }), loc: useLocation() });

describe('useUrlState', () => {
  it('falls back to the default for an invalid number', () => {
    const { result } = renderHook(useBoth, { wrapper: wrap('/x?page=abc') });
    expect(result.current.s.state.page).toBe(1);
  });

  it('omits defaults and resets page when a filter changes', () => {
    const { result } = renderHook(useBoth, { wrapper: wrap('/x?page=3') });
    act(() => result.current.s.set({ status: 'APPROVED' }));
    expect(result.current.loc.search).toBe('?status=APPROVED');
    act(() => result.current.s.set({ status: '' }));
    expect(result.current.loc.search).toBe('');
  });

  it('keeps page when only page changes', () => {
    const { result } = renderHook(useBoth, { wrapper: wrap('/x') });
    act(() => result.current.s.set({ page: 2 }));
    expect(result.current.loc.search).toBe('?page=2');
  });
});
