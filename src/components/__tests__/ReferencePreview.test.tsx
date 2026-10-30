// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReferencePreview } from '../ReferencePreview';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('ReferencePreview (finished-picture card)', () => {
  it('shows the finished picture thumbnail with a hide control', () => {
    render(<ReferencePreview src="artwork/x/preview.svg" title="Floating Tree" />);
    const img = screen.getByAltText('Finished version of Floating Tree');
    expect(img).toHaveAttribute('src', 'artwork/x/preview.svg');
    expect(screen.getByRole('button', { name: 'Hide the finished picture' })).toBeInTheDocument();
  });

  it('collapses to a reopen button and remembers the choice', async () => {
    const user = userEvent.setup();
    render(<ReferencePreview src="artwork/x/preview.svg" title="Floating Tree" />);
    await user.click(screen.getByRole('button', { name: 'Hide the finished picture' }));

    expect(
      screen.getByRole('button', { name: 'Show the finished picture' }),
    ).toBeInTheDocument();
    expect(screen.queryByAltText('Finished version of Floating Tree')).not.toBeInTheDocument();
    // Preference persisted for the next visit.
    expect(window.localStorage.getItem('pixelhaven:reference-preview')).toBe('closed');

    await user.click(screen.getByRole('button', { name: 'Show the finished picture' }));
    expect(screen.getByAltText('Finished version of Floating Tree')).toBeInTheDocument();
  });

  it('stays hidden when the stored preference says so', () => {
    localStorage.setItem('pixelhaven:reference-preview', 'closed');
    render(<ReferencePreview src="artwork/x/preview.svg" title="Floating Tree" />);
    expect(
      screen.getByRole('button', { name: 'Show the finished picture' }),
    ).toBeInTheDocument();
  });

  it('degrades silently when localStorage is unavailable', async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    render(<ReferencePreview src="artwork/x/preview.svg" title="Floating Tree" />);
    await user.click(screen.getByRole('button', { name: 'Hide the finished picture' }));
    expect(
      screen.getByRole('button', { name: 'Show the finished picture' }),
    ).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
