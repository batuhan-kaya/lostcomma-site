/**
 * The Lab's drawings. Pure canvas: each one gets a context in CSS pixels · the size · the time ·
 * where the pointer is (or a teammate's cursor) · its one control value · and a quality level
 * from the budget meter (0 = full). Calm palette: milk on the night ground · lime as the one accent.
 */
import { ditherLevel, type Meter } from '../../shared/lab';
import { step, type Body } from '../../shared/spring';

export interface Pt {
  x: number;
  y: number;
}

export interface Fit {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
}

const LIME = '#CDF23A';
const milk = (a: number) => `rgba(242,241,236,${a.toFixed(2)})`;

/** Sizes the backing store to the box (device pixels capped at 2 · 1 on lower quality levels). */
export function fit(cv: HTMLCanvasElement, level = 0): Fit | null {
  const dpr = level > 0 ? 1 : Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth;
  const h = cv.clientHeight;
  if (!w || !h) return null;
  const W = Math.round(w * dpr);
  const H = Math.round(h * dpr);
  if (cv.width !== W || cv.height !== H) {
    cv.width = W;
    cv.height = H;
  }
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

/* ---------------- the comma ---------------- */

const DOT = new Path2D();
DOT.arc(0, 0, 3.2, 0, Math.PI * 2);
const TAIL = new Path2D('M2.6 1.2Q3.4 6.2 -1.6 9.2');

function comma(ctx: CanvasRenderingContext2D, base: DOMMatrix, x: number, y: number, a: number, s: number): void {
  const c = Math.cos(a) * s;
  const n = Math.sin(a) * s;
  ctx.setTransform(base.a * c, base.a * n, -base.a * n, base.a * c, base.a * x, base.a * y);
  ctx.fill(DOT);
  ctx.stroke(TAIL);
}

function prep(ctx: CanvasRenderingContext2D): DOMMatrix {
  const base = ctx.getTransform();
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  return base;
}

/* ---------------- hero · the comma field ---------------- */

export interface Pull extends Pt {
  colour: string;
  /** How much of the colour a comma right under it takes (0..1). */
  strength: number;
}

/** A field of commas that drift slowly and turn toward the nearest cursor. */
export function field(f: Fit, t: number, pulls: Pull[], level: number): void {
  const { ctx, w, h } = f;
  ctx.clearRect(0, 0, w, h);
  const base = prep(ctx);
  // Phones get a quieter field: fewer and fainter commas behind the words.
  const narrow = w < 700;
  const sp = ([34, 44, 56][level] ?? 56) + (narrow ? 8 : 0);
  const rest = narrow ? 0.1 : 0.16;
  const R = narrow ? 150 : 220;
  for (let y = sp / 2 + 4; y < h; y += sp) {
    for (let x = sp / 2; x < w; x += sp) {
      let a = Math.sin(x * 0.006 + t * 0.0003) * 1.4 + Math.cos(y * 0.008 - t * 0.00025) * 1.2;
      let s = 1;
      let near: Pull | null = null;
      let best = R * R;
      for (const p of pulls) {
        const d = (x - p.x) ** 2 + (y - p.y) ** 2;
        if (d < best) {
          best = d;
          near = p;
        }
      }
      if (near) {
        const q = 1 - Math.sqrt(best) / R;
        a = Math.atan2(y - near.y, x - near.x) - (Math.PI / 2) * (1 - q) * 0.2;
        s = 1 + q * 0.9;
        const mix = q * near.strength;
        ctx.globalAlpha = 1;
        ctx.fillStyle = ctx.strokeStyle = mix > 0.35 ? near.colour : milk(rest + q * 0.6);
        if (mix > 0.35) ctx.globalAlpha = 0.35 + mix * 0.6;
      } else {
        ctx.globalAlpha = 1;
        ctx.fillStyle = ctx.strokeStyle = milk(rest);
      }
      comma(ctx, base, x, y, a, s);
    }
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(base);
}

/* ---------------- 002 · comma rain ---------------- */

interface Drop extends Pt {
  v: number;
  a: number;
  s: number;
}

export function rain(): (f: Fit, t: number, p: Pt | null, v: number, moving: boolean, level: number) => void {
  const drops: Drop[] = [];
  return ({ ctx, w, h }, t, p, v, moving, level) => {
    const n = Math.round(v / (level + 1));
    while (drops.length < n) drops.push({ x: Math.random() * w, y: Math.random() * h - h, v: 1 + Math.random() * 2.4, a: Math.random() * 0.6 - 0.3, s: 0.7 + Math.random() * 0.8 });
    if (drops.length > n) drops.length = n;
    ctx.clearRect(0, 0, w, h);
    const base = prep(ctx);
    drops.forEach((r, i) => {
      if (moving) {
        r.y += r.v;
        r.x += Math.sin(t * 0.001 + i) * 0.3;
        if (p) {
          const dx = r.x - p.x;
          const dy = r.y - p.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < 70 && dy < 10) {
            r.x += (dx / d) * 4;
            r.y -= 0.6;
          }
        }
        if (r.y > h + 10) {
          r.y = -12;
          r.x = Math.random() * w;
        }
      }
      ctx.fillStyle = ctx.strokeStyle = i % 12 === 0 ? LIME : milk(0.62);
      comma(ctx, base, r.x, r.y, r.a, r.s);
    });
    ctx.setTransform(base);
    if (p) {
      ctx.strokeStyle = 'rgba(205,242,58,.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 70, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
  };
}

/* ---------------- 003 · magnetic dots ---------------- */

export function dots(): (f: Fit, t: number, p: Pt | null, v: number, moving: boolean, level: number) => void {
  return ({ ctx, w, h }, t, p, v, _moving, level) => {
    ctx.clearRect(0, 0, w, h);
    const sp = [18, 24, 30][level] ?? 30;
    const px = p ? p.x : w / 2 + Math.cos(t * 0.0008) * w * 0.3;
    const py = p ? p.y : h / 2 + Math.sin(t * 0.0011) * h * 0.3;
    for (let y = sp; y < h; y += sp) {
      for (let x = sp; x < w; x += sp) {
        const dx = px - x;
        const dy = py - y;
        const f = v * Math.exp(-(dx * dx + dy * dy) / 9000);
        ctx.fillStyle = f > 0.3 ? LIME : milk(Math.min(1, 0.3 + f));
        ctx.beginPath();
        ctx.arc(x + dx * f, y + dy * f, 1.6 + f * 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };
}

/* ---------------- 004 · caret orchestra ---------------- */

export function carets(): (f: Fit, t: number, p: Pt | null, v: number) => void {
  return ({ ctx, w, h }, t, p, v) => {
    ctx.clearRect(0, 0, w, h);
    const n = 22;
    const gap = w / (n + 1);
    const beat = ((t * v) / 60000) * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const x = gap * (i + 1);
      const ph = p ? (Math.abs(x - p.x) / w) * 6 : i * 0.45;
      const q = (Math.sin(beat - ph) + 1) / 2;
      const hh = 30 + q * h * 0.55;
      ctx.fillStyle = q > 0.86 ? LIME : milk(0.22 + q * 0.6);
      ctx.fillRect(x - 2, h / 2 - hh / 2, 4, hh);
    }
  };
}

/* ---------------- 005 · dither sun ---------------- */

/** Night to milk in five steps: the sun stays neutral · the accent is the brightest dot. */
const TONES = [
  [22, 22, 24],
  [48, 48, 52],
  [96, 96, 98],
  [168, 167, 162],
  [242, 241, 236],
] as const;

export function dither(): (f: Fit, t: number, p: Pt | null, v: number, moving: boolean, level: number) => void {
  let off: { c: HTMLCanvasElement; x: CanvasRenderingContext2D; img: ImageData } | null = null;
  return ({ ctx, w, h }, t, p, v, _moving, level) => {
    const cw = [120, 90, 64][level] ?? 64;
    const ch = Math.max(1, Math.round((cw * h) / w));
    if (!off || off.c.width !== cw || off.c.height !== ch) {
      const c = document.createElement('canvas');
      c.width = cw;
      c.height = ch;
      const x = c.getContext('2d')!;
      off = { c, x, img: x.createImageData(cw, ch) };
    }
    const sx = (p ? p.x / w : 0.5 + Math.cos(t * 0.0006) * 0.25) * cw;
    const sy = (p ? p.y / h : 0.45 + Math.sin(t * 0.0008) * 0.15) * ch;
    const d = off.img.data;
    const L = Math.max(2, Math.round(v));
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const dist = Math.hypot(x - sx, (y - sy) * 1.1) / (cw * 0.42);
        let br = Math.max(0, 1 - dist);
        br = br * br * (3 - 2 * br) + (y > ch * 0.74 ? -0.12 : 0);
        const lv = ditherLevel(br, L, x, y);
        const tone = lv === L - 1 && L > 2 && br > 0.92 ? [205, 242, 58] : TONES[Math.round((lv / (L - 1)) * (TONES.length - 1))]!;
        const o = (y * cw + x) * 4;
        d[o] = tone[0]!;
        d[o + 1] = tone[1]!;
        d[o + 2] = tone[2]!;
        d[o + 3] = 255;
      }
    }
    off.x.putImageData(off.img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off.c, 0, 0, w, h);
  };
}

/* ---------------- 006 · spring chain ---------------- */

/** Fourteen springs in a row · each one chases the one before it with the same step() as the cursors. */
export function chain(): (f: Fit, t: number, p: Pt | null, v: number, moving: boolean) => void {
  const links: Body[] = [];
  return ({ ctx, w, h }, t, p, v, moving) => {
    if (!links.length) for (let i = 0; i < 14; i++) links.push({ x: w / 2, y: h / 2, vx: 0, vy: 0 });
    const tx = p ? p.x : w / 2 + Math.cos(t * 0.0013) * w * 0.32;
    const ty = p ? p.y : h / 2 + Math.sin(t * 0.0021) * h * 0.3;
    const k = { pull: v, damping: 0.78, maxSpeed: 60, arriveDist: 0, arriveSpeed: 0 };
    if (moving) links.forEach((b, i) => step(b, i ? links[i - 1]!.x : tx, i ? links[i - 1]!.y : ty, k));
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = milk(0.22);
    ctx.lineWidth = 2;
    ctx.beginPath();
    links.forEach((b, i) => (i ? ctx.lineTo(b.x, b.y) : ctx.moveTo(b.x, b.y)));
    ctx.stroke();
    for (let i = links.length - 1; i >= 0; i--) {
      const b = links[i]!;
      ctx.fillStyle = i === 0 ? LIME : milk(0.85 - i * 0.05);
      ctx.beginPath();
      ctx.arc(b.x, b.y, 13 - i * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  };
}

/** Times one drawing and feeds its meter. Returns the level for the next frame. */
export function timed(meter: Meter, draw: () => void): number {
  const t0 = performance.now();
  draw();
  return meter.add(performance.now() - t0);
}
