import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface Option {
  id: string;
  label: string;
}

export function EntityCombobox({
  value,
  onChange,
  useSearch,
  placeholder = 'Select…',
  minChars = 2,
  initialLabel,
  disabled,
  ariaLabel,
}: {
  value?: string;
  onChange: (id: string, label: string) => void;
  /** A hook: called on every render with the debounced term ('' until minChars typed). */
  useSearch: (term: string) => { data?: Option[]; isFetching: boolean };
  placeholder?: string;
  minChars?: number;
  initialLabel?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [label, setLabel] = useState(initialLabel);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(t);
  }, [term]);

  const { data, isFetching } = useSearch(debounced.length >= minChars ? debounced : '');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} aria-label={ariaLabel ?? placeholder} disabled={disabled} className="w-full justify-between font-normal">
          <span className="truncate">{value ? (label ?? value) : placeholder}</span>
          <ChevronsUpDown className="size-4 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={term} onValueChange={setTerm} placeholder={`Type ${minChars}+ characters to search…`} />
          <CommandList>
            <CommandEmpty>{isFetching ? 'Searching…' : 'No results'}</CommandEmpty>
            {data?.map((o) => (
              <CommandItem
                key={o.id}
                value={o.id}
                onSelect={() => {
                  setLabel(o.label);
                  onChange(o.id, o.label);
                  setOpen(false);
                }}
              >
                <Check className={value === o.id ? 'size-4' : 'size-4 opacity-0'} aria-hidden />
                {o.label}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
