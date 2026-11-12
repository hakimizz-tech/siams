import { http as mswHttp, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { url } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { filenameFromDisposition, getBlobByUrl, saveBlob } from './download';

afterEach(() => vi.useRealTimers());

describe('filenameFromDisposition', () => {
    it('reads quoted, bare and RFC 5987 names', () => {
        expect(filenameFromDisposition('attachment; filename="report.pdf"')).toBe('report.pdf');
        expect(filenameFromDisposition('attachment; filename=data.csv')).toBe('data.csv');
        expect(filenameFromDisposition("attachment; filename*=UTF-8''na%C3%AFve%20file.pdf")).toBe(
            'naïve file.pdf',
        );
    });

    it('returns null when there is nothing to read', () => {
        expect(filenameFromDisposition(undefined)).toBeNull();
        expect(filenameFromDisposition('inline')).toBeNull();
    });
});

describe('getBlobByUrl', () => {
    it('downloads a private file with its name', async () => {
        server.use(
            mswHttp.get(
                url('/api/v1/final-reports/abc/file/'),
                () =>
                    new HttpResponse('%PDF-1.4 data', {
                        headers: {
                            'Content-Type': 'application/pdf',
                            'Content-Disposition': 'attachment; filename="my-report.pdf"',
                        },
                    }),
            ),
        );
        const { blob, filename } = await getBlobByUrl('/api/v1/final-reports/abc/file/');
        expect(filename).toBe('my-report.pdf');
        expect(blob.size).toBeGreaterThan(0);
    });
});

describe('saveBlob', () => {
    it('clicks a temporary link and revokes the object URL afterwards', () => {
        vi.useFakeTimers();
        const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
        const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
        const click = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => undefined);

        saveBlob(new Blob(['x']), 'file.txt');

        expect(create).toHaveBeenCalledOnce();
        expect(click).toHaveBeenCalledOnce();
        expect(document.querySelector('a[download]')).toBeNull(); // the anchor is removed again
        vi.advanceTimersByTime(1000);
        expect(revoke).toHaveBeenCalledWith('blob:test');
    });
});
