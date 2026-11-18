import { describe, expect, it } from 'vitest';
import {
  CARRY_POWER_MAX,
  CARRY_POWER_MIN,
  estimateLaunch,
} from './hoopPhysics';

describe('estimateLaunch (hoop aim mechanic, round 10)', () => {
  it('throws with the flick velocity when the release is fast', () => {
    const samples = [
      { t: 900, x: 100, y: 400 },
      { t: 950, x: 400, y: 300 },
      { t: 1000, x: 700, y: 200 },
    ];
    const est = estimateLaunch(samples, { x: 100, y: 400 }, { x: 700, y: 200 }, 1000);
    expect(est.launch).toBe(true);
    // Capped at LAUNCH_CAP, clearly a real throw.
    const speed = Math.hypot(est.vx, est.vy);
    expect(speed).toBeGreaterThan(1000);
    expect(est.vx).toBeGreaterThan(0); // recent motion was to the right
    expect(est.vy).toBeLessThan(0); // and upward
  });

  it('falls back to a gentle toss along the drag when the flick is slow', () => {
    // All samples are far older than the velocity window → no flick velocity;
    // the overall drag (up-right, 150 px) still counts as a toss.
    const samples = [
      { t: 500, x: 100, y: 400 },
      { t: 520, x: 102, y: 396 },
      { t: 540, x: 104, y: 392 },
    ];
    const est = estimateLaunch(samples, { x: 100, y: 400 }, { x: 220, y: 310 }, 1000);
    expect(est.launch).toBe(true);
    const speed = Math.hypot(est.vx, est.vy);
    expect(speed).toBeGreaterThanOrEqual(CARRY_POWER_MIN);
    expect(speed).toBeLessThanOrEqual(CARRY_POWER_MAX);
    expect(est.vx).toBeGreaterThan(0);
    expect(est.vy).toBeLessThan(0);
  });

  it('scales the toss power with the carried distance', () => {
    const short = estimateLaunch([], { x: 0, y: 0 }, { x: 60, y: 0 }, 1000);
    const long = estimateLaunch([], { x: 0, y: 0 }, { x: 400, y: 0 }, 1000);
    expect(Math.hypot(short.vx, short.vy)).toBeLessThan(Math.hypot(long.vx, long.vy));
    expect(Math.hypot(long.vx, long.vy)).toBeLessThanOrEqual(CARRY_POWER_MAX + 1e-6);
  });

  it('does not launch for a plain click without a drag', () => {
    const est = estimateLaunch(
      [{ t: 1000, x: 100, y: 400 }],
      { x: 100, y: 400 },
      { x: 102, y: 401 },
      1000,
    );
    expect(est.launch).toBe(false);
    expect(est.vx).toBe(0);
    expect(est.vy).toBe(0);
  });

  it('ignores stale samples when the pointer rests before release', () => {
    // Fast motion, then a long pause, then release → placement, not a throw.
    const samples = [
      { t: 100, x: 100, y: 400 },
      { t: 150, x: 500, y: 100 }, // was a fast flick…
      { t: 900, x: 501, y: 101 }, // …but the pointer sat still for 750 ms
    ];
    const est = estimateLaunch(samples, { x: 100, y: 400 }, { x: 501, y: 101 }, 900);
    // The drag carried the file ~400 px, so it still tosses along that path.
    expect(est.launch).toBe(true);
    expect(Math.hypot(est.vx, est.vy)).toBeLessThanOrEqual(CARRY_POWER_MAX + 1e-6);
    expect(est.vx).toBeGreaterThan(0);
  });
});
