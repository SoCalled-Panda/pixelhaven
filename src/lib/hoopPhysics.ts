/**
 * Aiming physics for the hoop upload mini-game (round 10).
 *
 * One estimator powers both the dotted aim guide (drawn every frame while
 * dragging) and the actual launch (pointer up), so the guide always shows
 * exactly what the release will do:
 *
 * 1. Flick: pointer velocity over the last ~120 ms — strong flicks throw hard.
 * 2. Carried toss: slower drags still throw, along the overall drag direction
 *    with a mapped power floor, so a careful aimed drag never dead-ends.
 * 3. Plain click: below both thresholds → set the file down without throwing.
 */

export const VELOCITY_WINDOW_MS = 120; // drag samples used for flick velocity
export const LAUNCH_CAP = 2000; // max launch speed px/s
export const LAUNCH_MIN = 140; // px/s a flick must reach to count as a throw
export const CARRY_MIN_DRAG = 40; // px of carried drag that still counts as a toss
export const CARRY_POWER_MIN = 430; // gentle-toss floor, px/s
export const CARRY_POWER_MAX = 1500; // gentle-toss ceiling, px/s
export const CARRY_POWER_SCALE = 3.2; // carried px → toss speed

export interface LaunchEstimate {
  vx: number;
  vy: number;
  /** False when the gesture is a plain placement, not a throw. */
  launch: boolean;
}

export interface DragSample {
  t: number;
  x: number;
  y: number;
}

export function estimateLaunch(
  samples: readonly DragSample[],
  grab: { x: number; y: number },
  release: { x: number; y: number },
  now: number,
): LaunchEstimate {
  let first: DragSample | null = null;
  for (const sample of samples) {
    if (now - sample.t <= VELOCITY_WINDOW_MS) {
      first = sample;
      break;
    }
  }
  const last = samples.length > 0 ? samples[samples.length - 1] : null;
  if (first && last && last.t > first.t) {
    const dt = Math.max(16, last.t - first.t) / 1000;
    const vx = ((last.x - first.x) / dt) * 0.9;
    const vy = ((last.y - first.y) / dt) * 0.9;
    const speed = Math.hypot(vx, vy);
    if (speed >= LAUNCH_MIN) {
      const cap = Math.min(speed, LAUNCH_CAP) / speed;
      return { vx: vx * cap, vy: vy * cap, launch: true };
    }
  }
  const dx = release.x - grab.x;
  const dy = release.y - grab.y;
  const dist = Math.hypot(dx, dy);
  if (dist >= CARRY_MIN_DRAG) {
    const power = Math.min(CARRY_POWER_MAX, Math.max(CARRY_POWER_MIN, dist * CARRY_POWER_SCALE)) * 0.9;
    return { vx: (dx / dist) * power, vy: (dy / dist) * power, launch: true };
  }
  return { vx: 0, vy: 0, launch: false };
}
