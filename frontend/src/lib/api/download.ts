import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { STALE } from './cache';
import { http } from './client';
import { qk } from './query-keys';

/** Parse a Content-Disposition header (RFC 6266 / 5987). */
export function filenameFromDisposition(header: string | undefined | null): string | null {
    if (!header) return null;
    const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
    if (utf8?.[1]) {
        try {
            return decodeURIComponent(utf8[1]);
        } catch {
            return utf8[1];
        }
    }
    const plain = /filename="?([^";]+)"?/i.exec(header);
    return plain?.[1] ?? null;
}

/** Files are private: fetch them with the Bearer header and receive a Blob. */
export async function getBlobByUrl(
    url: string,
    signal?: AbortSignal,
): Promise<{ blob: Blob; filename: string | null }> {
    const response = await http.get<Blob>(url, { responseType: 'blob', signal });
    const disposition = (response.headers as Record<string, string | undefined>)[
        'content-disposition'
    ];
    return { blob: response.data, filename: filenameFromDisposition(disposition) };
}

export function saveBlob(blob: Blob, filename: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

/** Authenticated download to disk (final report, CSV export). */
export async function downloadFile(url: string, fallbackName = 'download'): Promise<void> {
    const { blob, filename } = await getBlobByUrl(url);
    saveBlob(blob, filename ?? fallbackName);
}

/** Authenticated image for <img src>. The object URL is revoked on unmount. */
export function useProtectedObjectUrl(url: string | null | undefined) {
    const query = useQuery({
        queryKey: qk.blob(url ?? ''),
        queryFn: async ({ signal }) => (await getBlobByUrl(url as string, signal)).blob,
        enabled: Boolean(url),
        staleTime: STALE.blob,
        gcTime: 60_000,
    });
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!query.data) {
            setObjectUrl(null);
            return;
        }
        const created = URL.createObjectURL(query.data);
        setObjectUrl(created);
        return () => URL.revokeObjectURL(created);
    }, [query.data]);

    return { objectUrl, isLoading: query.isLoading, error: query.error };
}
