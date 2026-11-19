/**
 * Aiming physics for the hoop upload mini-game.
 *
 * The file card stays planted on the floor; the player drags an aim vector
 * away from it. The direction from the card to the pointer is the throw
 * direction and the drag distance sets the power. The result is
 * deterministic, so the dotted guide is stable while the player holds still —
 * the previous release-velocity model changed whenever the pointer paused,
 * which made fine aiming at the rim almost impossible.
 *
 * Power rises with a slight ease-in (t^1.35) so short drags give fine
 * control around the hoop and only long drags become a hard throw.
 */

export const AIM_MIN_DRAG = 26; // px a drag must travel before it throws
export const AIM_MAX_DRAG = 240; // px beyond which power stays at the cap
export const AIM_POWER_MIN = 520; // px/s at the minimum throw
export const AIM_POWER_MAX = 1700; // px/s at the maximum throw
export const AIM_POWER_EXP = 1.35; // distance → power easing

export interface AimEstimate {
  vx: number;
  vy: number;
  /** False when the drag is too short to count as a throw. */
  launch: boolean;
  /** Launch speed in px/s (0 when not launching). */
  power: number;
  /** Pointer position clamped to the maximum aim length (guide endpoint). */
  aimX: number;
  aimY: number;
}

export interface Point {
  x: number;
  y: number;
}

export function aimFromDrag(anchor: Point, pointer: Point): AimEstimate {
  const dx = pointer.x - anchor.x;
  const dy = pointer.y - anchor.y;
  const distance = Math.hypot(dx, dy);
  if (distance < AIM_MIN_DRAG) {
    return { vx: 0, vy: 0, launch: false, power: 0, aimX: anchor.x, aimY: anchor.y };
  }
  const aimLength = Math.min(distance, AIM_MAX_DRAG);
  const t = aimLength / AIM_MAX_DRAG;
  const power = AIM_POWER_MIN + (AIM_POWER_MAX - AIM_POWER_MIN) * Math.pow(t, AIM_POWER_EXP);
  const ux = dx / distance;
  const uy = dy / distance;
  return {
    vx: ux * power,
    vy: uy * power,
    launch: true,
    power,
    aimX: anchor.x + ux * aimLength,
    aimY: anchor.y + uy * aimLength,
  };
}
