import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { ApiError } from './errors';

interface MutationConfig<TData, TVars> {
    mutationFn: (variables: TVars) => Promise<TData>;
    /** Query keys to refresh after success. Declared here so no mutation forgets its cache rules. */
    invalidate?: (variables: TVars, data: TData) => readonly QueryKey[];
    onSuccess?: (data: TData, variables: TVars) => void;
}

export function useApiMutation<TData, TVars = void>(config: MutationConfig<TData, TVars>) {
    const queryClient = useQueryClient();
    return useMutation<TData, ApiError, TVars>({
        mutationFn: config.mutationFn,
        onSuccess: async (data, variables) => {
            const keys = config.invalidate?.(variables, data) ?? [];
            await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
            config.onSuccess?.(data, variables);
        },
    });
}
