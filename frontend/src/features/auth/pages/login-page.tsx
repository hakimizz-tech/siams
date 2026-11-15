/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ApiErrorAlert } from '@/components/shared/api-error-alert';
import { TextField } from '@/components/shared/form-fields';
import { ROUTES } from '@/config/routes';
import { loginSchema, useLogin } from '@/features/auth';
import { useAuth } from '@/lib/auth/use-auth';
import { safeNext } from '@/lib/auth/redirect';
import { hasStatus } from '@/lib/api/errors';
import { applyApiErrors } from '@/lib/form';
import { useZodForm } from '@/lib/use-zod-form';

export default function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { status } = useAuth();
  const login = useLogin();
  const form = useZodForm(loginSchema, { email: '', password: '' });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (status === 'authenticated') return <Navigate to={safeNext(params.get('next'))} replace />;

  const onSubmit = form.handleSubmit(async (values: any) => {
    setFormErrors([]);
    try {
      await login.mutateAsync(values);
      navigate(safeNext(params.get('next')), { replace: true });
    } catch (error) {
      if (hasStatus(error, 429)) setCooldown(Number((error as any).retryAfter ?? 30));
      // Do not reveal whether the email exists: non_field_errors go to the alert.
      setFormErrors(applyApiErrors(form.setError, error, Object.keys(values)).formErrors);
    }
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground">Use the account created for you by the coordinator.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <TextField control={form.control} name="email" label="Email" type="email" autoComplete="username" />
        <TextField control={form.control} name="password" label="Password" type="password" autoComplete="current-password" />
        <ApiErrorAlert messages={formErrors} />
        <Button type="submit" className="w-full" disabled={login.isPending || cooldown > 0}>
          {cooldown > 0 ? `Try again in ${cooldown}s` : 'Sign in'}
        </Button>
      </form>
      <Link to={ROUTES.forgotPassword as string} className="text-sm underline-offset-4 hover:underline">
        Forgot your password?
      </Link>
    </main>
  );
}
