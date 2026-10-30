// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PalettePicker } from '../PalettePicker';

const PALETTE = ['#ece2cf', '#e5533d', '#f2a03d', '#f6c945'];

afterEach(() => {
  cleanup();
});

describe('PalettePicker (checklist §E)', () => {
  it('renders one labelled swatch per colorable color', () => {
    render(<PalettePicker palette={PALETTE} selected={1} onSelect={() => {}} />);
    const swatches = screen.getAllByRole('button');
    expect(swatches).toHaveLength(3); // index 0 (uncolored) is never offered
    expect(screen.getByRole('button', { name: 'Use color 1' })).toBeInTheDocument();
  });

  it('marks the selected swatch with aria-pressed', () => {
    render(<PalettePicker palette={PALETTE} selected={2} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: 'Use color 2' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Use color 1' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('reports the chosen palette index (never the reserved 0)', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<PalettePicker palette={PALETTE} selected={1} onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: 'Use color 3' }));
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it('shows a per-color progress caption when provided', () => {
    render(
      <PalettePicker
        palette={PALETTE}
        selected={1}
        onSelect={() => {}}
        perColor={[0, 22, 100, 0]}
      />,
    );
    expect(screen.getByText('22%')).toBeInTheDocument();
    // Completed colors collapse to a check mark.
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    // The caption is decorative; the accessible name carries the number.
    expect(screen.getByRole('button', { name: 'Use color 1, 22% placed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use color 2, 100% placed' })).toBeInTheDocument();
  });

  it('omits captions when no progress is passed', () => {
    render(<PalettePicker palette={PALETTE} selected={1} onSelect={() => {}} />);
    expect(screen.queryByText('%')).not.toBeInTheDocument();
  });
});
