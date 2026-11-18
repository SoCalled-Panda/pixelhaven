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

describe('PalettePicker color search (round 10)', () => {
  const SEARCH_BOX = 'Search colors by number, name or hex';

  /** Only swatch buttons — the search row also renders a clear button. */
  const swatches = () => screen.getAllByRole('button', { name: /Use color/ });

  const type = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
    await user.type(screen.getByRole('textbox', { name: SEARCH_BOX }), text);
  };

  it('filters swatches by paint-by-numbers number', async () => {
    const user = userEvent.setup();
    render(<PalettePicker palette={PALETTE} selected={1} onSelect={() => {}} />);
    await type(user, '2');
    expect(swatches()).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Use color 2' })).toBeInTheDocument();
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
  });

  it('filters by color name', async () => {
    const user = userEvent.setup();
    render(<PalettePicker palette={PALETTE} selected={1} onSelect={() => {}} />);
    await type(user, 'red');
    expect(swatches()).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Use color 1' })).toBeInTheDocument();
  });

  it('filters by hex prefix', async () => {
    const user = userEvent.setup();
    render(<PalettePicker palette={PALETTE} selected={1} onSelect={() => {}} />);
    await type(user, '#f2');
    expect(swatches()).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Use color 2' })).toBeInTheDocument();
  });

  it('still reports the true palette index from a filtered swatch', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<PalettePicker palette={PALETTE} selected={1} onSelect={onSelect} />);
    await type(user, '3');
    await user.click(screen.getByRole('button', { name: 'Use color 3' }));
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it('clearing the search restores the full palette', async () => {
    const user = userEvent.setup();
    render(<PalettePicker palette={PALETTE} selected={1} onSelect={() => {}} />);
    await type(user, '2');
    expect(swatches()).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Clear color search' }));
    expect(swatches()).toHaveLength(3);
  });

  it('shows an empty message when nothing matches', async () => {
    const user = userEvent.setup();
    render(<PalettePicker palette={PALETTE} selected={1} onSelect={() => {}} />);
    await type(user, 'zzz');
    expect(screen.getByText('No colors match “zzz”.')).toBeInTheDocument();
  });

  it('Escape clears the search', async () => {
    const user = userEvent.setup();
    render(<PalettePicker palette={PALETTE} selected={1} onSelect={() => {}} />);
    const box = screen.getByRole('textbox', { name: SEARCH_BOX });
    await user.type(box, '2');
    expect(swatches()).toHaveLength(1);
    await user.keyboard('{Escape}');
    expect(swatches()).toHaveLength(3);
    expect(box).toHaveValue('');
  });
});
