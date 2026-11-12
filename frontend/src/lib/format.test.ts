import { describe, expect, it } from 'vitest';
import {
    fileSizeLabel,
    formatDate,
    formatDateTime,
    formatHours,
    formatNumber,
    formatPercent,
    isMonday,
    mondayOf,
    parseDateOnly,
    toDateOnly,
    toNumber,
} from './format';

describe('numbers', () => {
    it('normalises decimal strings and numbers', () => {
        expect(toNumber('60.00')).toBe(60);
        expect(toNumber(12.5)).toBe(12.5);
        expect(toNumber(null)).toBe(0);
        expect(toNumber('')).toBe(0);
        expect(toNumber('abc', 7)).toBe(7);
    });

    it('formats hours and percentages', () => {
        expect(formatNumber('7.50')).toBe('7.5');
        expect(formatHours('120.00')).toBe('120 h');
        expect(formatPercent('80.00')).toBe('80%');
        expect(formatPercent(null)).toBe('—');
    });
});

describe('dates', () => {
    it('parses date-only values as local dates (no day shift)', () => {
        const date = parseDateOnly('2026-11-09');
        expect(date.getFullYear()).toBe(2026);
        expect(date.getMonth()).toBe(10);
        expect(date.getDate()).toBe(9);
    });

    it('formats dates and handles missing values', () => {
        expect(formatDate('2026-11-09')).toBe('9 Nov 2026');
        expect(formatDate(null)).toBe('—');
        expect(formatDate('not-a-date')).toBe('—');
    });

    it('shows datetimes in Nairobi time (UTC+3) on a 24-hour clock', () => {
        const text = formatDateTime('2026-11-09T12:30:00Z');
        expect(text).toContain('2026');
        expect(text).toContain('15:30');
        expect(formatDateTime(undefined)).toBe('—');
        expect(formatDateTime('garbage')).toBe('—');
    });

    it('works with Monday-based weeks', () => {
        const wednesday = parseDateOnly('2026-11-11');
        expect(toDateOnly(mondayOf(wednesday))).toBe('2026-11-09');
        expect(isMonday(parseDateOnly('2026-11-09'))).toBe(true);
        expect(isMonday(wednesday)).toBe(false);
        expect(toDateOnly(mondayOf(parseDateOnly('2026-11-15')))).toBe('2026-11-09'); // Sunday
    });
});

describe('fileSizeLabel', () => {
    it('uses readable units', () => {
        expect(fileSizeLabel(512)).toBe('512 B');
        expect(fileSizeLabel(2048)).toBe('2 kB');
        expect(fileSizeLabel(5 * 1024 * 1024)).toBe('5.0 MB');
    });
});
