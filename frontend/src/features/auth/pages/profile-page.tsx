/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ApiErrorAlert } from '@/components/shared/api-error-alert';
import { DefList } from '@/components/shared/def-list';
import { TextField } from '@/components/shared/form-fields';
import { PageHeader } from '@/components/shared/page-header';
import { Panel } from '@/components/shared/panel';
import { RoleBadge } from '@/components/shared/role-badge';
import { APP_VERSION } from '@/config/env';
import { changePasswordSchema, profileSchema, useChangePassword, useUpdateMe } from '@/features/auth';
import { useAuth } from '@/lib/auth/use-auth';
import { applyApiErrors } from '@/lib/form';
import { useZodForm } from '@/lib/use-zod-form';

export default function ProfilePage() {
  const { user } = useAuth();
  const u: any = user ?? {};
  const update = useUpdateMe();
  const change = useChangePassword();
  const profile = useZodForm(profileSchema, { full_name: u.full_name ?? '', phone: u.phone ?? '' });
  const pw = useZodForm(changePasswordSchema, { old_password: '', new_password1: '', new_password2: '' });
  const [pErr, setPErr] = useState<string[]>([]);
  const [wErr, setWErr] = useState<string[]>([]);

  return (
    <>
      <PageHeader title="Profile" description="Your account details and password." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Account">
          <DefList
            items={[
              ['Email', u.email],
              ['Role', u.role ? <RoleBadge key="r" role={u.role} /> : '—'],
              ...(u.student_profile?.registration_number ? ([['Registration number', u.student_profile.registration_number]] as [string, string][]) : []),
              ...(u.organization?.name ? ([['Organisation', u.organization.name]] as [string, string][]) : []),
            ]}
          />
          <form
            className="mt-4 space-y-4"
            noValidate
            onSubmit={profile.handleSubmit(async (v: any) => {
              setPErr([]);
              try {
                await update.mutateAsync(v);
                toast.success('Profile updated');
              } catch (e) {
                setPErr(applyApiErrors(profile.setError, e, Object.keys(v)).formErrors);
              }
            })}
          >
            <TextField control={profile.control} name="full_name" label="Full name" />
            <TextField control={profile.control} name="phone" label="Phone" type="tel" />
            <ApiErrorAlert messages={pErr} />
            <Button type="submit" disabled={update.isPending}>
              Save changes
            </Button>
          </form>
        </Panel>
        <Panel title="Change password">
          <form
            className="space-y-4"
            noValidate
            onSubmit={pw.handleSubmit(async (v: any) => {
              setWErr([]);
              try {
                await change.mutateAsync(v);
                toast.success('Password changed');
                pw.reset();
              } catch (e) {
                setWErr(applyApiErrors(pw.setError, e, Object.keys(v)).formErrors);
              }
            })}
          >
            <TextField control={pw.control} name="old_password" label="Current password" type="password" autoComplete="current-password" />
            <TextField control={pw.control} name="new_password1" label="New password" type="password" autoComplete="new-password" />
            <TextField control={pw.control} name="new_password2" label="Confirm new password" type="password" autoComplete="new-password" />
            <ApiErrorAlert messages={wErr} />
            <Button type="submit" disabled={change.isPending}>
              Change password
            </Button>
          </form>
        </Panel>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">Version {String(APP_VERSION)}</p>
    </>
  );
}
