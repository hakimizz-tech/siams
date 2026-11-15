import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { expectNoA11yViolations } from '@/test/axe';
import LandingPage from './landing-page';

describe('LandingPage', () => {
  it('renders without any network request (unmocked requests fail the test)', async () => {
    const { container } = render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('links Sign in to the login page', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getAllByRole('link', { name: /sign in/i })[0]).toHaveAttribute('href', '/login');
  });
});
