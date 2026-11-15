/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface Base {
  control: Control<any>;
  name: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

function Shell({
  id,
  label,
  description,
  error,
  children,
  inline,
}: {
  id: string;
  label: string;
  description?: string;
  error?: string;
  children: ReactNode;
  inline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className={inline ? 'flex items-center gap-2' : 'space-y-1'}>
        {inline && children}
        <Label htmlFor={id}>{label}</Label>
        {!inline && children}
      </div>
      {description && (
        <p id={`${id}-desc`} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = Base & { type?: string; placeholder?: string; autoComplete?: string; min?: string | number; max?: string | number; step?: string | number };

export function TextField({ control, name, label, description, disabled, type = 'text', placeholder, autoComplete, min, max, step }: InputProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Shell id={`f-${name}`} label={label} description={description} error={fieldState.error?.message}>
          <Input
            {...field}
            id={`f-${name}`}
            type={type}
            value={field.value ?? ''}
            placeholder={placeholder}
            autoComplete={autoComplete}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            aria-invalid={!!fieldState.error}
            aria-describedby={fieldState.error ? `f-${name}-err` : undefined}
          />
        </Shell>
      )}
    />
  );
}

export const NumberField = (p: InputProps) => <TextField {...p} type="number" step={p.step ?? 'any'} />;
/** Native date input: value is YYYY-MM-DD, exactly what the API wants for date-only fields. */
export const DateField = (p: InputProps) => <TextField {...p} type="date" />;

export function TextareaField({ control, name, label, description, disabled, placeholder, rows = 4 }: Base & { placeholder?: string; rows?: number }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Shell id={`f-${name}`} label={label} description={description} error={fieldState.error?.message}>
          <Textarea {...field} id={`f-${name}`} rows={rows} value={field.value ?? ''} placeholder={placeholder} disabled={disabled} aria-invalid={!!fieldState.error} />
        </Shell>
      )}
    />
  );
}

export function SelectField({ control, name, label, description, disabled, options, placeholder = 'Select…' }: Base & { options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Shell id={`f-${name}`} label={label} description={description} error={fieldState.error?.message}>
          <Select value={field.value ? String(field.value) : undefined} onValueChange={field.onChange} disabled={disabled}>
            <SelectTrigger id={`f-${name}`} aria-invalid={!!fieldState.error}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Shell>
      )}
    />
  );
}

export function SwitchField({ control, name, label, description, disabled }: Base) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Shell id={`f-${name}`} label={label} description={description} error={fieldState.error?.message} inline>
          <Switch id={`f-${name}`} checked={!!field.value} onCheckedChange={field.onChange} disabled={disabled} />
        </Shell>
      )}
    />
  );
}

export function CheckboxField({ control, name, label, description, disabled }: Base) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Shell id={`f-${name}`} label={label} description={description} error={fieldState.error?.message} inline>
          <Checkbox id={`f-${name}`} checked={!!field.value} onCheckedChange={(v) => field.onChange(v === true)} disabled={disabled} />
        </Shell>
      )}
    />
  );
}

/** Wrap any custom control (combobox...) in the same label + error layout. */
export function FieldShell({ control, name, label, description, children }: Base & { children: (field: { value: any; onChange: (v: any) => void }) => ReactNode }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Shell id={`f-${name}`} label={label} description={description} error={fieldState.error?.message}>
          {children({ value: field.value, onChange: field.onChange })}
        </Shell>
      )}
    />
  );
}
