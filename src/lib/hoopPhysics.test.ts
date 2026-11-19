import { describe, expect, it } from 'vitest';
import { AIM_MAX_DRAG, AIM_MIN_DRAG, AIM_POWER_MAX, AIM_POWER_MIN, aimFromDrag } from './hoopPhysics';

describe('aimFromDrag (hoop aim mechanic)', () => {
  it('throws along the drag with power in the configured range', () => {
    const aim = aimFromDrag({ x: 100, y: 400 }, { x: 250, y: 250 });
    expect(aim.launch).toBe(true);
    expect(aim.vx).toBeGreaterThan(0); // dragged up-right
    expect(aim.vy).toBeLessThan(0);
    expect(aim.power).toBeGreaterThanOrEqual(AIM_POWER_MIN);
    expect(aim.power).toBeLessThanOrEqual(AIM_POWER_MAX);
    expect(Math.hypot(aim.vx, aim.vy)).toBeCloseTo(aim.power, 6);
  });

  it('does not launch for a short drag (a plain tap)', () => {
    const aim = aimFromDrag({ x: 100, y: 400 }, { x: 100 + AIM_MIN_DRAG - 1, y: 400 });
    expect(aim.launch).toBe(false);
    expect(aim.vx).toBe(0);
    expect(aim.vy).toBe(0);
    expect(aim.power).toBe(0);
  });

  it('scales power with drag distance and caps it at the maximum', () => {
    const short = aimFromDrag({ x: 0, y: 0 }, { x: 0, y: -60 });
    const long = aimFromDrag({ x: 0, y: 0 }, { x: 0, y: -200 });
    const over = aimFromDrag({ x: 0, y: 0 }, { x: 0, y: -900 });
    expect(short.power).toBeLessThan(long.power);
    expect(over.power).toBeCloseTo(AIM_POWER_MAX, 6);
    // The guide endpoint never runs past the maximum aim length.
    expect(over.aimY).toBeCloseTo(-AIM_MAX_DRAG, 6);
  });

  it('is deterministic: holding still does not change the shot', () => {
    // No timestamps involved — the same drag always produces the same throw,
    // which is what makes careful aiming possible.
    const a = aimFromDrag({ x: 120, y: 420 }, { x: 320, y: 220 });
    const b = aimFromDrag({ x: 120, y: 420 }, { x: 320, y: 220 });
    expect(a).toEqual(b);
  });

  it('keeps the aim endpoint on the drag direction', () => {
    const aim = aimFromDrag({ x: 100, y: 400 }, { x: 300, y: 400 });
    expect(aim.aimY).toBeCloseTo(400, 6);
    expect(aim.aimX).toBeCloseTo(300, 6);
    expect(aim.vy).toBeCloseTo(0, 6);
  });
});
