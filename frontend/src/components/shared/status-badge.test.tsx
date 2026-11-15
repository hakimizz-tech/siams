import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge, STATUS_MAP } from './status-badge';

describe('StatusBadge', () => {
  it('has a mapping and renders text for every known status', () => {
    for (const [kind, statuses] of Object.entries(STATUS_MAP)) {
      for (const status of Object.keys(statuses)) {
        const { unmount } = render(<StatusBadge kind={kind as never} status={status} />);
        expect(screen.getByText(new RegExp(status.replace(/_/g, ' '), 'i'))).toBeInTheDocument();
        unmount();
      }
    }
  });
});
