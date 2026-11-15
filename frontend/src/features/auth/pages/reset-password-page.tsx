/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ApiErrorAlert } from '@/components/shared/api-error-alert';
import { TextField } from '@/components/shared/form-fields';
import { ROUTES } from '@/config/routes';
import { resetPasswordSchema, useConfirmPasswordReset } from '@/features/auth';
import { isApiError } from '@/lib/api/errors';
import { applyApiErrors } from '@/lib/form';
import { useZodForm } from '@/lib/use-zod-form';

// Used for "forgot password" AND for the first password of invited users.
export default function ResetPasswordPage() {
  const { uid = '', token = '' } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirmPasswordReset();
  const form = useZodForm(resetPasswordSchema, { new_password1: '', new_password2: '' });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [expired, setExpired] = useState(false);

  const onSubmit = form.handleSubmit(async (values: any) => {
    setFormErrors([]);
    try {
      await confirm.mutateAsync({ uid, token, ...values });
      toast.success('Password saved. You can sign in now.');
      navigate(ROUTES.login as string, { replace: true });
    } catch (error) {
      const d = isApiError(error) ? ((error as any).details ?? {}) : {};
      if ('token' in d || 'uid' in d) setExpired(true);
      else setFormErrors(applyApiErrors(form.setError, error, Object.keys(values)).formErrors);
    }
  });

  if (expired) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
        <Alert variant="destructive">
          <AlertDescription>This link has expired or was already used.</AlertDescription>
        </Alert>
        <Button asChild>
          <Link to={ROUTES.forgotPassword as string}>Request a new link</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-xl font-semibold">Set your password</h1>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <TextField control={form.control} name="new_password1" label="New password" type="password" autoComplete="new-password" />
        <TextField control={form.control} name="new_password2" label="Confirm new password" type="password" autoComplete="new-password" />
        <ApiErrorAlert messages={formErrors} />
        <Button type="submit" className="w-full" disabled={confirm.isPending}>
          Save password
        </Button>
      </form>
    </main>
  );
}
