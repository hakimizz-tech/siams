import { describe, expect, it, vi } from 'vitest';
import { ApiError } from './api/errors';
import { applyApiErrors } from './form';

const validation = (details: Record<string, unknown>) =>
    new ApiError(400, 'validation_error', 'Invalid input.', details);

describe('applyApiErrors', () => {
    it('puts each backend message on its form field', () => {
        const setError = vi.fn();
        const { formErrors } = applyApiErrors(
            setError,
            validation({ email: ['Taken.'], full_name: ['Required.', 'Too short.'] }),
        );
        expect(formErrors).toEqual([]);
        expect(setError).toHaveBeenCalledWith('email', { type: 'server', message: 'Taken.' });
        expect(setError).toHaveBeenCalledWith('full_name', {
            type: 'server',
            message: 'Required. Too short.',
        });
    });

    it('returns form-level messages instead of attaching them to a field', () => {
        const setError = vi.fn();
        const { formErrors } = applyApiErrors(
            setError,
            validation({ non_field_errors: ['Bad combination.'] }),
        );
        expect(formErrors).toEqual(['Bad combination.']);
        expect(setError).not.toHaveBeenCalled();
    });

    it('treats fields the form does not have as form-level errors', () => {
        const setError = vi.fn();
        const { formErrors } = applyApiErrors(setError, validation({ unknown_field: ['Nope.'] }), [
            'email',
        ]);
        expect(formErrors).toEqual(['Nope.']);
        expect(setError).not.toHaveBeenCalled();
    });

    it('shows the message of business-rule and unknown errors', () => {
        const setError = vi.fn();
        expect(
            applyApiErrors(setError, new ApiError(409, 'invalid_transition', 'Already done.'))
                .formErrors,
        ).toEqual(['Already done.']);
        expect(applyApiErrors(setError, new Error('x')).formErrors).toEqual([
            'Something went wrong.',
        ]);
        expect(setError).not.toHaveBeenCalled();
    });
});
