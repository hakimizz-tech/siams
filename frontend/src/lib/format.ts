import { format, isValid, parseISO, startOfWeek } from 'date-fns';
import { APP_TIMEZONE } from '@/config/env';

/** API decimals are strings ("60.00") in serializers and numbers in dashboards. */
export function toNumber(value: number | string | null | undefined, fallback = 0): number {
    if (value === null || value === undefined || value === '') return fallback;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

const numberFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 });

export const formatNumber = (value: number | string | null | undefined): string =>
    numberFormat.format(toNumber(value));

export const formatHours = (value: number | string | null | undefined): string =>
    `${formatNumber(value)} h`;

export const formatPercent = (value: number | string | null | undefined): string =>
    value === null || value === undefined || value === '' ? '—' : `${formatNumber(value)}%`;

/** Date-only API values ("2026-11-09") are parsed as LOCAL dates: never `new Date("2026-11-09")`. */
export function parseDateOnly(value: string): Date {
    return parseISO(value);
}

export function formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const date = parseISO(value);
    return isValid(date) ? format(date, 'd MMM yyyy') : '—';
}

/** Datetimes are UTC ISO strings, shown in the application timezone, 24-hour clock. */
export function formatDateTime(value: string | null | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
        hourCycle: 'h23',
        timeZone: APP_TIMEZONE,
    }).format(date);
}

export const toDateOnly = (date: Date): string => format(date, 'yyyy-MM-dd');

/** Weeks start on Monday (same as the backend). */
export const mondayOf = (date: Date): Date => startOfWeek(date, { weekStartsOn: 1 });
export const isMonday = (date: Date): boolean => date.getDay() === 1;

export function fileSizeLabel(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} kB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
