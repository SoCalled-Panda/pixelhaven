# UI/UX Design Specification

## 1. Experience concept
A quiet rainy-night room that acts as the player's personal home base. The main activity is coloring original pixel-art scenes. The interface should feel warm, calm, personal, and unobtrusive.

## 2. Visual foundation
Suggested initial palette:
- Warm paper: `#F7F0E5`
- Deep plum: `#30263A`
- Muted violet: `#59465E`
- Amber: `#D69A62`
- Soft cream: `#F3D9A4`
- Sage: `#B6C8AE`
- Terracotta: `#C98168`
- Primary text: `#3F3542`

Use these as starting tokens, not immutable requirements. Test contrast for text and controls. Use pixel fonts sparingly for labels or headings; body text should remain legible.

## 3. Screen hierarchy
### Home
- Small welcome line.
- Main “Continue coloring” action if an in-progress session exists.
- Featured artwork cards.
- Compact music/ambience access.
- Decorative room details that do not obscure controls.

### Gallery
- Artwork thumbnail, title, and progress.
- Clear in-progress/completed states.
- Avoid cluttered filters in the initial version.

### Coloring studio
- Canvas dominates the screen.
- On narrow screens, dense artwork must offer a clear pan/zoom viewport before cell painting.
- Palette close to the canvas.
- Undo/redo, erase, reset, and exit controls.
- Save status is reassuring but subtle.
- On mobile, place palette and controls where they can be reached without covering the artwork.

### Completion
- Gentle animation and a short warm message.
- Offer “Save to gallery”/“Color another” if needed.
- Avoid timers, scores, or pressure.

## 4. Interaction principles
- Immediate visual feedback.
- No surprise audio.
- Confirm destructive reset.
- Keep selected color visually obvious.
- Provide accessible labels for icon buttons.
- Preserve progress when navigating.
- Respect reduced-motion preferences.
- Avoid excessive popups or notifications.

## 5. Atmosphere
Use rain on the window, warm lamp glow, a sleepy cat, soft steam, tiny stars, and restrained ambient animation. These should be low contrast and never compete with cell selection. Avoid making every UI element glow or move.

## 6. Reference policy
Use other games as mood references only. Do not copy their exact layout, art, logo, UI assets, music, or marketing text. Build a distinct identity.
