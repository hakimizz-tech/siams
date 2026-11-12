import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { flattenFieldErrors, isApiError } from '@/lib/api/errors';

export interface AppliedErrors {
    /** Messages that do not belong to a field: show them in a form-level alert. */
    formErrors: string[];
}

const FORM_LEVEL_KEYS = new Set(['', 'non_field_errors', 'detail', 'message']);

/**
 * Put the backend's validation errors on the matching form fields.
 * Returns the messages that have no field so the caller can render them in an Alert.
 */
export function applyApiErrors<T extends FieldValues>(
    setError: UseFormSetError<T>,
    error: unknown,
    knownFields?: readonly string[],
): AppliedErrors {
    const formErrors: string[] = [];
    if (!isApiError(error)) return { formErrors: ['Something went wrong.'] };

    if (error.code !== 'validation_error') {
        return { formErrors: [error.message] };
    }

    const fields = flattenFieldErrors(error.details);
    for (const [path, messages] of Object.entries(fields)) {
        const isFormLevel =
            FORM_LEVEL_KEYS.has(path) || (knownFields !== undefined && !knownFields.includes(path));
        if (isFormLevel) {
            formErrors.push(...messages);
        } else {
            setError(path as Path<T>, { type: 'server', message: messages.join(' ') });
        }
    }
    if (formErrors.length === 0 && Object.keys(fields).length === 0) formErrors.push(error.message);
    return { formErrors };
}
