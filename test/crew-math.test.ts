import { describe, expect, it } from 'vitest';
import { clampPoint, drift, parseRestAt, pickSection, probeLine, shouldFlip, SPRING, step, STEP_MS, stepsFor, type Body } from '../src/client/lib/crew-math';

describe('spring step', () => {
  it('settles on the target without running away', () => {
    const b: Body = { x: 0, y: 0, vx: 0, vy: 0 };
    let frames = 0;
    while (!step(b, 400, 200) && frames < 600) frames++;
    expect(frames).toBeLessThan(600);
    expect(Math.hypot(b.x - 400, b.y - 200)).toBeLessThan(SPRING.arriveDist);
  });

  it('never moves faster than the cap', () => {
    const b: Body = { x: 0, y: 0, vx: 0, vy: 0 };
    let max = 0;
    for (let i = 0; i < 200; i++) {
      const x0 = b.x;
      const y0 = b.y;
      step(b, 5000, 3000);
      max = Math.max(max, Math.hypot(b.x - x0, b.y - y0));
    }
    expect(max).toBeLessThanOrEqual(SPRING.maxSpeed + 1e-9);
  });

  it('overshoots only a little (calm)', () => {
    const b: Body = { x: 0, y: 0, vx: 0, vy: 0 };
    let maxX = 0;
    for (let i = 0; i < 400; i++) {
      step(b, 300, 0);
      maxX = Math.max(maxX, b.x);
    }
    expect(maxX).toBeLessThan(300 * 1.15);
  });
});

describe('fixed timestep', () => {
  it('turns frame time into whole 60 Hz steps and carries the rest', () => {
    const r = stepsFor(0, 40);
    expect(r.steps).toBe(2);
    expect(r.rest).toBeCloseTo(40 - 2 * STEP_MS, 6);
  });
  it('caps long pauses (tab in the background)', () => {
    expect(stepsFor(0, 5000).steps).toBe(6);
  });
});

describe('drift', () => {
  it('stays within ±6 px', () => {
    for (let t = 0; t < 60000; t += 977) {
      const d = drift(t, 1.3);
      expect(Math.abs(d.dx)).toBeLessThanOrEqual(6);
      expect(Math.abs(d.dy)).toBeLessThanOrEqual(6);
    }
  });
});

describe('sections', () => {
  const bands = [
    { name: 'hero', top: -200, bottom: 400 },
    { name: 'plan', top: 400, bottom: 1100 },
    { name: 'next', top: 1100, bottom: 1480 },
  ];
  it('picks the band under the probe', () => {
    expect(pickSection(bands, 300)).toBe('hero');
    expect(pickSection(bands, 400)).toBe('plan');
    expect(pickSection(bands, 1200)).toBe('next');
  });
  it('outside every band the closest edge wins (footer keeps the last section)', () => {
    expect(pickSection(bands, 1600)).toBe('next');
    expect(pickSection(bands, -500)).toBe('hero');
  });
  it('at the top of the page the hero wins even when it is short', () => {
    const short = [
      { name: 'hero', top: 0, bottom: 300 },
      { name: 'plan', top: 300, bottom: 900 },
    ];
    expect(pickSection(short, 380)).toBe('plan');
    expect(pickSection(short, 380, true)).toBe('hero');
  });
  it('returns null without sections', () => {
    expect(pickSection([], 100)).toBeNull();
  });
  it('probe sits a bit above the middle and is capped', () => {
    expect(probeLine(900)).toBe(405);
    expect(probeLine(2000)).toBe(450);
  });
});

describe('rest anchors', () => {
  it('reads "end" with an optional offset', () => {
    expect(parseRestAt('end')).toEqual({ end: true, dx: 10, dy: 0 });
    expect(parseRestAt('end 14 -2')).toEqual({ end: true, dx: 14, dy: -2 });
  });
  it('reads fractions with an optional offset', () => {
    expect(parseRestAt('0.3 0.55')).toEqual({ end: false, fx: 0.3, fy: 0.55, dx: 0, dy: 0 });
    expect(parseRestAt('1 0 -8 6')).toEqual({ end: false, fx: 1, fy: 0, dx: -8, dy: 6 });
  });
  it('falls back to the right middle on bad input', () => {
    expect(parseRestAt(null)).toEqual({ end: false, fx: 1, fy: 0.5, dx: 0, dy: 0 });
    expect(parseRestAt('nope x')).toEqual({ end: false, fx: 1, fy: 0.5, dx: 0, dy: 0 });
  });
  it('keeps the arrow on the page', () => {
    expect(clampPoint(2000, -10, 1440)).toEqual({ x: 1412, y: 4 });
    expect(clampPoint(100, 100, 1440)).toEqual({ x: 100, y: 100 });
  });
  it('flips tags near the right edge', () => {
    expect(shouldFlip(1200, 1440)).toBe(true);
    expect(shouldFlip(800, 1440)).toBe(false);
    expect(shouldFlip(170, 390)).toBe(false);
    expect(shouldFlip(290, 390)).toBe(true);
  });
});
