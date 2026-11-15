/* eslint-disable @typescript-eslint/no-explicit-any */
import { Skeleton } from '@/components/ui/skeleton';
import { useProtectedObjectUrl } from '@/lib/api/download';

/** Images behind authentication: fetched as a blob with the Bearer header. */
export function ProtectedImage({ imageUrl, alt, className }: { imageUrl: string; alt: string; className?: string }) {
  const r: any = useProtectedObjectUrl(imageUrl);
  const src: string | undefined = typeof r === 'string' ? r : (r?.data ?? r?.url);
  if (!src) return <Skeleton className={className ?? 'h-32 w-full'} />;
  return <img src={src} alt={alt} className={className ?? 'h-32 w-full rounded-md object-cover'} />;
}
