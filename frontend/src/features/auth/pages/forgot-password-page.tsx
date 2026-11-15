/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiErrorAlert } from '@/components/shared/api-error-alert';
import { TextField } from '@/components/shared/form-fields';
import { ROUTES } from '@/config/routes';
import { forgotPasswordSchema, useRequestPasswordReset } from '@/features/auth';
import { isApiError } from '@/lib/api/errors';
import { useZodForm } from '@/lib/use-zod-form';

export default function ForgotPasswordPage() {
  const request = useRequestPasswordReset();
  const form = useZodForm(forgotPasswordSchema, { email: '' });
  const [sent, setSent] = useState(false);
  const [fatal, setFatal] = useState<unknown>();

  const onSubmit = form.handleSubmit(async (values: any) => {
    setFatal(undefined);
    try {
      await request.mutateAsync(values.email);
      setSent(true);
    } catch (error) {
      // Same neutral message for every outcome so accounts cannot be probed.
      // Only network and server failures are surfaced.
      if (isApiError(error) && (error.status === 0 || error.status >= 500)) setFatal(error);
      else setSent(true);
    }
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-xl font-semibold">Reset your password</h1>
      {sent ? (
        <Alert>
          <AlertDescription>If this email has an account, a reset link was sent. Check your inbox.</AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" />
          <ApiErrorAlert error={fatal} />
          <Button type="submit" className="w-full" disabled={request.isPending}>
            Send reset link
          </Button>
        </form>
      )}
      <Link to={ROUTES.login as string} className="text-sm underline-offset-4 hover:underline">
        Back to sign in
      </Link>
    </main>
  );
}
