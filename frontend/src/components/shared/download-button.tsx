import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadFile } from '@/lib/api/download';
import { errorMessage } from '@/lib/api/errors';

export function DownloadButton({ url, filename, label }: { url: string; filename?: string; label: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <div className="inline-flex flex-col gap-1">
      <Button
        variant="outline"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(undefined);
          try {
            await downloadFile(url, filename);
          } catch (e) {
            setError(errorMessage(e));
          } finally {
            setPending(false);
          }
        }}
      >
        <Download className="mr-2 size-4" aria-hidden />
        {pending ? 'Downloading…' : label}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
