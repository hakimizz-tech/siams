/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const ALL = '__all__';

export interface FilterSelect {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}

export function FilterBar({
  state,
  set,
  search,
  selects,
  children,
}: {
  state: Record<string, any>;
  set: (patch: Record<string, any>) => void;
  search?: boolean;
  selects?: FilterSelect[];
  children?: ReactNode;
}) {
  const [term, setTerm] = useState<string>(state.search ?? '');
  useEffect(() => setTerm(state.search ?? ''), [state.search]);
  useEffect(() => {
    if (!search || term === (state.search ?? '')) return;
    const t = setTimeout(() => set({ search: term }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      {search && (
        <div className="space-y-1">
          <Label htmlFor="filter-search">Search</Label>
          <Input id="filter-search" value={term} onChange={(e) => setTerm(e.target.value)} className="w-56" />
        </div>
      )}
      {selects?.map((s) => (
        <div key={s.name} className="space-y-1">
          <Label htmlFor={`filter-${s.name}`}>{s.label}</Label>
          <Select value={state[s.name] || ALL} onValueChange={(v) => set({ [s.name]: v === ALL ? '' : v })}>
            <SelectTrigger id={`filter-${s.name}`} className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              {s.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
      {children}
      {(search || selects) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setTerm('');
            set({ ...Object.fromEntries((selects ?? []).map((s) => [s.name, ''])), search: '' });
          }}
        >
          Clear
        </Button>
      )}
    </div>
  );
}
