/* eslint-disable @typescript-eslint/no-explicit-any */
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

/** One place for the zod + react-hook-form typing (handles z.coerce schemas). */
export function useZodForm<S extends z.ZodTypeAny>(schema: S, defaultValues?: Record<string, unknown>) {
  return useForm<any, unknown, z.output<S>>({
    resolver: zodResolver(schema as any) as any,
    defaultValues: defaultValues as any,
  });
}
