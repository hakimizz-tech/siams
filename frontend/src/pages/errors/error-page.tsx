import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/lib/auth/use-auth';

export function ErrorPage({ title, text }: { title: string; text: string }) {
  const { status } = useAuth();
  const back = status === 'authenticated' ? ROUTES.dashboard : ROUTES.landing;
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button asChild>
        <Link to={back as string}>{status === 'authenticated' ? 'Back to dashboard' : 'Back to home'}</Link>
      </Button>
    </main>
  );
}
