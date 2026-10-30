# Test Plan

## 1. Unit tests
### Grid
- Valid coordinates map to expected indices.
- Negative and out-of-range coordinates are rejected.
- Pointer coordinates exactly on the right or bottom canvas edge are rejected, not clamped.
- Mask and color arrays must have correct lengths.
- Fixed cells cannot be changed.

### History
- Paint creates one command.
- No-op paint creates no command.
- Undo restores prior color.
- Redo reapplies color.
- New edit after undo clears redo.
- Erase is reversible.

### Progress
- Fixed cells are excluded.
- Uncolored colorable cells are excluded from completed count.
- Empty/invalid artwork is handled safely.

### Asset validation
- Missing metadata rejected.
- Invalid palette index rejected.
- Incorrect binary length rejected.
- Unsupported dimensions rejected.
- Duplicate catalog ID and invalid content version rejected.

## 2. Integration tests
- Open artwork with no saved session.
- Color several cells and save.
- Reload session and verify exact colors.
- Undo and redo after multiple edits.
- Reset one artwork without clearing others.
- Import invalid save without altering existing session.
- Reject a saved/imported session whose content version differs from the loaded artwork.
- Reject a saved/imported session that changes a fixed cell.
- Open the same artwork in two browser contexts; a stale save must be rejected rather than overwrite the newer record.

## 3. Browser tests
- Tap/click paints the intended cell.
- Canvas remains accurate after resize.
- Mobile touch works without unintended page scroll.
- A dense artwork can be zoomed and panned, then paints the intended logical cell.
- Keyboard focus is visible.
- Music starts only after user interaction.
- Music controls persist across route changes.
- Gallery status reflects saved progress.
- Production routes work after refresh.

## 4. Manual test matrix
Test at minimum:
- Desktop Chromium browser.
- Firefox or Safari/WebKit where available.
- Narrow mobile viewport.
- Browser zoom at 125% and 200%.
- Device pixel ratio greater than 1.
- Storage unavailable or quota failure.
- Missing asset and audio load failure.

## 5. Release gate
- Type check passes.
- Unit tests pass.
- Production build succeeds.
- No serious console errors.
- P0 acceptance criteria in PRD pass.
- Assets have documented origin/license.
- Deployed app verified over HTTPS.
