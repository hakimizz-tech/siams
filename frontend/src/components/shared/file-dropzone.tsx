import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export function FileDropzone({
  accept,
  maxMb,
  validate,
  onFile,
  progress,
  error,
  disabled,
  label = 'Drag a file here, or click to choose',
}: {
  /** e.g. ".pdf,.doc,.docx" or "image/jpeg,image/png" (used for the file picker filter) */
  accept?: string;
  maxMb: number;
  validate?: (file: File) => string | null;
  onFile: (file: File) => void;
  progress?: number;
  error?: string;
  disabled?: boolean;
  label?: string;
}) {
  const [localError, setLocalError] = useState<string | null>(null);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    maxFiles: 1,
    disabled,
    onDrop: (files) => {
      const file = files[0];
      if (!file) return;
      const problem = file.size > maxMb * 1024 * 1024 ? `File is larger than ${maxMb} MB.` : (validate?.(file) ?? null);
      setLocalError(problem);
      if (!problem) onFile(file);
    },
  });
  const shown = localError ?? error;
  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed p-6 text-center text-sm focus-within:ring-2',
          isDragActive && 'bg-accent',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <input {...getInputProps({ accept })} aria-label={label} />
        <Upload className="size-5" aria-hidden />
        <span>{label}</span>
        <span className="text-xs text-muted-foreground">Maximum {maxMb} MB</span>
      </div>
      {typeof progress === 'number' && progress > 0 && progress < 100 && <Progress value={progress} aria-label="Upload progress" />}
      {shown && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{shown}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
