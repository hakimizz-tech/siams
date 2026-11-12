import { z } from 'zod';
import { MAX_REPORT_MB, REPORT_ACCEPT, mbToBytes } from '@/config/limits';

export const returnReportSchema = z.object({
    feedback: z.string().trim().min(1, 'Feedback is required'),
});

const REPORT_EXTENSIONS: string[] = Object.values(REPORT_ACCEPT).flat();

/** Client-side check before uploading the final report (the server validates the real content). */
export function validateReportFile(file: { name: string; size: number }): string | null {
    const lower = file.name.toLowerCase();
    if (!REPORT_EXTENSIONS.some((extension) => lower.endsWith(extension))) {
        return 'Upload a PDF, DOC or DOCX file.';
    }
    if (file.size > mbToBytes(MAX_REPORT_MB)) return `The file is larger than ${MAX_REPORT_MB} MB.`;
    return null;
}
