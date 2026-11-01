import { describe, expect, it } from 'vitest';
import { clampPoint, clearSpot, fitShift, NUDGES, overlap, parseRestAt, pickSection, probeLine, settled, shouldFlip, SPRING, step, STEP_MS, stepsFor, type Body, type Box } from '../src/client/lib/crew-math';

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

describe('settling', () => {
  it('a cursor that has arrived settles soon after · then the loop can stop', () => {
    const b: Body = { x: 0, y: 0, vx: 0, vy: 0 };
    let frames = 0;
    while (!settled(b, 400, 120) && frames < 600) {
      step(b, 400, 120);
      frames++;
    }
    // About two seconds of flight at 60 fps · never an endless tail.
    expect(frames).toBeGreaterThan(20);
    expect(frames).toBeLessThan(200);
  });
  it('a moving cursor is never settled even when it passes through the spot', () => {
    expect(settled({ x: 400, y: 120, vx: 3, vy: 0 }, 400, 120)).toBe(false);
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
  it('with a width the side that fits wins', () => {
    // A long bubble on a phone: no room on the right · more on the left.
    expect(shouldFlip(190, 390, 220)).toBe(true);
    // Near the left edge a long bubble keeps to the right where it fits.
    expect(shouldFlip(40, 390, 300)).toBe(false);
    // A short tag in the middle of a desktop stays to the right.
    expect(shouldFlip(800, 1440, 60)).toBe(false);
  });
  it('slides a bubble back onto the page', () => {
    expect(fitShift(100, 200, 390)).toBe(0);
    expect(fitShift(300, 200, 390)).toBe(390 - 8 - 500);
    expect(fitShift(-20, 120, 390)).toBe(28);
    // Wider than the page: pinned to the left edge.
    expect(fitShift(40, 400, 390)).toBe(-32);
  });
});

describe('keeping text readable', () => {
  const at = (x: number, y: number) => (dx: number, dy: number): Box[] => [{ left: x + dx, top: y + dy, right: x + dx + 60, bottom: y + dy + 20 }];
  it('measures overlap', () => {
    expect(overlap({ left: 0, top: 0, right: 10, bottom: 10 }, { left: 5, top: 5, right: 20, bottom: 20 })).toBe(25);
    expect(overlap({ left: 0, top: 0, right: 10, bottom: 10 }, { left: 10, top: 0, right: 20, bottom: 10 })).toBe(0);
  });
  it('tries the nearest spots first', () => {
    expect(NUDGES[0]).toEqual([0, 0]);
    const d = NUDGES.map(([x, y]) => Math.hypot(x, y));
    for (let i = 1; i < d.length; i++) expect(d[i]! + 0.001).toBeGreaterThanOrEqual(Math.floor(d[i - 1]! / 1.5));
  });
  it('stays put when nothing is covered', () => {
    expect(clearSpot(at(100, 100), [{ left: 0, top: 0, right: 400, bottom: 40 }], 1440)).toEqual([0, 0]);
  });
  it('steps off a line of text by the smallest move', () => {
    const line = { left: 0, top: 100, right: 400, bottom: 118 };
    const [dx, dy] = clearSpot(at(100, 95), [line], 1440);
    expect(overlap({ left: 100 + dx, top: 95 + dy, right: 160 + dx, bottom: 115 + dy }, line)).toBe(0);
    expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(32);
  });
  it('the arrow may point into a headline · the tag keeps off it', () => {
    const head: Box = { left: 0, top: 100, right: 400, bottom: 160, big: true };
    const arrow = (dx: number, dy: number): Box[] => [{ left: 380 + dx, top: 120 + dy, right: 400 + dx, bottom: 140 + dy }];
    expect(clearSpot(arrow, [head], 1440)).toEqual([0, 0]);
    const tag = (dx: number, dy: number): Box[] => [{ left: 380 + dx, top: 120 + dy, right: 440 + dx, bottom: 140 + dy, strict: true }];
    expect(clearSpot(tag, [head], 1440)).not.toEqual([0, 0]);
  });
  it('never leaves the page to do it', () => {
    const wall = { left: 0, top: 0, right: 1440, bottom: 2000 };
    const [dx] = clearSpot(at(1370, 100), [wall], 1440);
    expect(1370 + dx + 60).toBeLessThanOrEqual(1440);
  });
});
