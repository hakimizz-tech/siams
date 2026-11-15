import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { envelope, signedInHandlers, url } from '@/test/msw/handlers';
import { placement, user } from '@/test/msw/data';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import LogbookPage from './logbook-page';

function arrange(opts: { summary: 'ok' | 'fail'; timeline: unknown[] }) {
  server.use(
    ...signedInHandlers(user('STUDENT')),
    http.get(url('/api/v1/placements/me/'), () => HttpResponse.json(placement({ status: 'APPROVED' }))),
    http.get(url('/api/v1/placements/:id/logbook/timeline/'), () => HttpResponse.json(opts.timeline)),
    http.get(url('/api/v1/placements/:id/summary/'), () =>
      opts.summary === 'fail'
        ? envelope(500, 'server_error', 'The summary failed.')
        : HttpResponse.json({ approved_hours: 8, required_hours: 400 }),
    ),
  );
}

const missingWeek = [{ week_start: '2025-01-06', status: 'MISSING', entry: null }];
// the real backend shape: the entry is nested under `entry`
const draftWeek = [{ week_start: '2025-01-06', status: 'DRAFT', entry: { id: 'e1', claimed_hours: '8.00', approved_hours: '0.00' } }];

describe('LogbookPage', () => {
  it('hides the hours meter when the summary fails, and still lists the weeks', async () => {
    arrange({ summary: 'fail', timeline: missingWeek });
    renderWithProviders(<LogbookPage />, { role: 'STUDENT', route: '/app/logbook' });
    expect(await screen.findByText(/hours progress is unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText('Approved hours')).not.toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /start this week/i })).toBeInTheDocument();
  });

  it('opens an unsaved editor for a missing week instead of creating an empty draft', async () => {
    arrange({ summary: 'ok', timeline: missingWeek });
    renderWithProviders(<LogbookPage />, { role: 'STUDENT', route: '/app/logbook' });
    const link = await screen.findByRole('link', { name: /start this week/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('/new?week=2025-01-06'));
  });

  it('opens the existing entry for a week that already has one (never offers Start)', async () => {
    arrange({ summary: 'ok', timeline: draftWeek });
    renderWithProviders(<LogbookPage />, { role: 'STUDENT', route: '/app/logbook' });
    const open = await screen.findByRole('link', { name: /^open$/i });
    expect(open).toHaveAttribute('href', expect.stringContaining('/app/logbook/e1'));
    expect(screen.queryByRole('link', { name: /start this week/i })).not.toBeInTheDocument();
    expect(await screen.findByText('8 h')).toBeInTheDocument();
  });
});
