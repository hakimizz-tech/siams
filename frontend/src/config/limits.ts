/**
 * MIRRORS the backend settings (UX only: the server stays the authority and always
 * re-validates). Keep in sync with backend/config/settings/base.py.
 */
export const MAX_HOURS_PER_DAY = 12;
export const HOURS_OUTLIER_DAY = 10;
export const MIN_ACTIVITY_CHARS = 30;
export const MAX_IMAGES_PER_WEEK = 5;
export const MAX_IMAGE_MB = 5;
export const MAX_REPORT_MB = 10;
export const MAX_CSV_MB = 2;

export const IMAGE_ACCEPT = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
} as const;

export const REPORT_ACCEPT = {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
} as const;

export const CSV_ACCEPT = { 'text/csv': ['.csv'] } as const;

export const mbToBytes = (mb: number): number => mb * 1024 * 1024;
