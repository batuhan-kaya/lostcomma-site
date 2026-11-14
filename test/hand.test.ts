import { describe, expect, it } from 'vitest';
import { advance, arrivedHand, at, ease, follow, hand, plan, reach, reachMs, settledHand, shift, steer, stepHand, TEMPERS, TEMPO, trace, type Pt } from '../src/shared/hand';

/** A small seeded generator: the same hand every run. */
function seeded(seed = 7): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const speed = (p: Pt[]) => p.slice(1).map((q, i) => Math.hypot(q.x - p[i]!.x, q.y - p[i]!.y));

describe('a reach', () => {
  it('sets off gently · peaks before half way · takes longer to slow down', () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    // No leap: after a twentieth of the time it has covered a thousandth of the way.
    expect(ease(0.05)).toBeLessThan(0.01);
    const v = Array.from({ length: 200 }, (_, i) => ease((i + 1) / 200) - ease(i / 200));
    const peak = v.indexOf(Math.max(...v)) / 200;
    expect(peak).toBeGreaterThan(0.3);
    expect(peak).toBeLessThan(0.48);
    for (let i = 1; i < v.length; i++) expect(v[i]! >= 0).toBe(true);
  });

  it('takes longer for a far spot · but not in proportion · and never twice the same', () => {
    const fixed = () => 0.5;
    expect(reachMs(300, 1, fixed)).toBeCloseTo(TEMPO * Math.sqrt(300), 5);
    expect(reachMs(1200, 1, fixed) / reachMs(300, 1, fixed)).toBeCloseTo(2, 5);
    expect(reachMs(1, 1, fixed)).toBe(120);
    const rnd = seeded();
    expect(new Set(Array.from({ length: 20 }, () => Math.round(reachMs(300, 1, rnd)))).size).toBeGreaterThan(10);
  });

  it('bends: a long move strays to the side and comes back', () => {
    const rnd = seeded(3);
    for (const k of Object.values(TEMPERS)) {
      const tr = trace({ x: 0, y: 0 }, { x: 600, y: 0 }, k, rnd, { precise: true });
      const side = Math.max(...tr.map((p) => Math.abs(p.y)));
      expect(side).toBeGreaterThan(4);
      expect(side).toBeLessThanOrEqual(91);
      expect(Math.hypot(tr.at(-1)!.x - 600, tr.at(-1)!.y)).toBeLessThan(0.5);
    }
  });

  it('a short hop is straight and has no second thoughts', () => {
    const q = plan({ x: 0, y: 0 }, { x: 18, y: 6 }, TEMPERS.motion, seeded());
    expect(q).toHaveLength(1);
    expect(q[0]!.bend).toBe(0);
  });

  it('a long aimed reach often lands a few pixels off and fixes it after a beat', () => {
    const rnd = seeded(11);
    let fixes = 0;
    for (let i = 0; i < 200; i++) {
      const q = plan({ x: 0, y: 0 }, { x: 500, y: 120 }, TEMPERS.design, rnd, { precise: true });
      expect(q.at(-1)!.tx).toBe(500);
      expect(q.at(-1)!.ty).toBe(120);
      if (q.length === 2) {
        fixes++;
        const off = Math.hypot(q[0]!.tx - 500, q[0]!.ty - 120);
        expect(off).toBeGreaterThan(1.5);
        expect(off).toBeLessThan(26);
        expect(q[1]!.lead).toBeGreaterThanOrEqual(40);
      }
    }
    expect(fixes).toBeGreaterThan(110);
    expect(fixes).toBeLessThan(180);
  });

  it('everyone has their own temper: code is the quickest and the straightest', () => {
    const run = (k: (typeof TEMPERS)[keyof typeof TEMPERS]) => {
      const rnd = seeded(5);
      const all = Array.from({ length: 60 }, () => trace({ x: 0, y: 0 }, { x: 500, y: 0 }, k, rnd));
      return { frames: all.reduce((a, t) => a + t.length, 0) / 60, side: all.reduce((a, t) => a + Math.max(...t.map((p) => Math.abs(p.y))), 0) / 60 };
    };
    const [d, c, m] = [run(TEMPERS.design), run(TEMPERS.code), run(TEMPERS.motion)];
    expect(c.frames).toBeLessThan(d.frames);
    expect(c.side).toBeLessThan(d.side);
    expect(d.side).toBeLessThan(m.side);
  });
});

describe('a hand', () => {
  it('moves in one smooth line: no leap between two steps · calm top speed', () => {
    const rnd = seeded(21);
    for (const d of [40, 300, 700]) {
      for (let n = 0; n < 30; n++) {
        const v = speed(trace({ x: 0, y: 0 }, { x: d * 0.8, y: d * 0.6 }, TEMPERS.motion, rnd, { precise: true }));
        // About 1300 px a second at the very most.
        expect(Math.max(...v)).toBeLessThan(22);
        // Speed changes by a few pixels a frame at most (a hand has weight).
        for (let i = 1; i < v.length; i++) expect(Math.abs(v[i]! - v[i - 1]!)).toBeLessThan(2.4);
      }
    }
  });

  it('a 300 px move is there in about a second · a 700 px one well before two', () => {
    const rnd = seeded(2);
    const frames = (d: number) => Array.from({ length: 80 }, () => trace({ x: 0, y: 0 }, { x: d, y: 0 }, TEMPERS.design, rnd, { precise: true }).length);
    expect(Math.max(...frames(300))).toBeLessThan(85);
    expect(Math.max(...frames(700))).toBeLessThan(115);
  });

  it('turns in mid air without a jump (it keeps its speed into the turn)', () => {
    const rnd = seeded(9);
    const h = hand(0, 0);
    reach(h, { x: 600, y: 0 }, TEMPERS.code, rnd);
    const path: Pt[] = [];
    for (let i = 0; i < 400 && !(i > 30 && settledHand(h)); i++) {
      if (i === 30) expect(steer(h, { x: 200, y: 400 }, TEMPERS.code, rnd)).toBe(true);
      stepHand(h);
      path.push({ x: h.x, y: h.y });
    }
    const v = speed(path);
    for (let i = 1; i < v.length; i++) expect(Math.abs(v[i]! - v[i - 1]!)).toBeLessThan(3.2);
    expect(Math.hypot(h.x - 200, h.y - 400)).toBeLessThan(0.5);
    expect(arrivedHand(h)).toBe(true);
  });

  it('a spot that moves a little bends the way · no new reach', () => {
    const rnd = seeded(4);
    const h = hand(0, 0);
    reach(h, { x: 400, y: 0 }, TEMPERS.design, rnd);
    for (let i = 0; i < 20; i++) stepHand(h);
    expect(steer(h, { x: 420, y: 12 }, TEMPERS.design, rnd)).toBe(false);
    for (let i = 0; i < 400 && !settledHand(h); i++) stepHand(h);
    expect(Math.hypot(h.x - 420, h.y - 12)).toBeLessThan(0.5);
    // At rest: a move of a pixel or two is followed · a real one is a new reach.
    expect(steer(h, { x: 421.5, y: 12 }, TEMPERS.design, rnd)).toBe(false);
    expect(steer(h, { x: 480, y: 12 }, TEMPERS.design, rnd)).toBe(true);
  });

  it('the follower never runs past the plan and closes any gap', () => {
    const h = hand(0, 0);
    shift(h, 100, 0);
    let max = 0;
    for (let i = 0; i < 60; i++) {
      follow(h);
      max = Math.max(max, h.x);
    }
    expect(max).toBeLessThanOrEqual(100);
    expect(h.x).toBeGreaterThan(99.99);
  });

  it('waits a beat before it sets off', () => {
    const [r] = plan({ x: 0, y: 0 }, { x: 50, y: 0 }, TEMPERS.code, seeded(), { lead: 200 });
    expect(at(r!, 199)).toEqual({ x: 0, y: 0 });
    expect(at(r!, 320).x).toBeGreaterThan(0);
    const h = hand(0, 0);
    reach(h, { x: 50, y: 0 }, TEMPERS.code, seeded(), { lead: 200 });
    advance(h, 190);
    expect(h.cx).toBe(0);
  });
});
