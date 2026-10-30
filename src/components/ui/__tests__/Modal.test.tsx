// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../Modal';

afterEach(() => {
  cleanup();
});

describe('Modal (checklist §B accessibility pattern)', () => {
  it('renders a labelled dialog when open and nothing when closed', () => {
    const { rerender } = render(
      <Modal open={false} title="Hidden" onClose={() => {}}>
        <p>body</p>
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(
      <Modal open title="Confirm reset" onClose={() => {}}>
        <p>body</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Confirm reset')).toBeInTheDocument();
  });

  it('closes on Escape and moves focus into the panel on open', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal
        open
        title="Confirm"
        onClose={onClose}
        footer={<button type="button">Cancel</button>}
      >
        <p>body</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    // Focus moves to the first focusable element inside the panel.
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(dialog).toContainElement(screen.getByRole('button', { name: 'Cancel' }));

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('traps Tab focus inside the dialog', async () => {
    const user = userEvent.setup();
    render(
      <Modal open title="Confirm" onClose={() => {}}>
        <button type="button">First</button>
        <button type="button">Second</button>
      </Modal>,
    );
    const first = screen.getByRole('button', { name: 'First' });
    const second = screen.getByRole('button', { name: 'Second' });

    // Opening focuses the first focusable element; Tab wraps back to it.
    await user.tab();
    expect(second).toHaveFocus();
    await user.tab();
    expect(first).toHaveFocus(); // wrapped around
  });
});
