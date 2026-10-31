/**
 * Lab: the performance budget and the small rules the experiments share.
 *
 * Every drawing measures itself. A Meter keeps a slowly forgetting average of what one frame
 * costs · when a drawing stays over its budget for a while it steps down a quality level
 * (fewer pixels or fewer marks) and steps back up once there is room again.
 */

/** Milliseconds per frame. The whole page should stay well inside one 60 Hz frame (16.7 ms). */
export const BUDGET = { page: 8, field: 3, tile: 1.5 } as const;

export class Meter {
  /** Average cost of one frame in ms. */
  ema = 0;
  /** 0 = full quality. */
  level = 0;
  private over = 0;
  private under = 0;

  constructor(
    readonly budget: number,
    readonly maxLevel = 2,
  ) {}

  /** Adds one frame's cost and returns the quality level to draw the next one at. */
  add(ms: number): number {
    this.ema = this.ema ? this.ema * 0.9 + ms * 0.1 : ms;
    if (this.ema > this.budget) {
      this.over++;
      this.under = 0;
    } else {
      this.under++;
      this.over = 0;
    }
    if (this.over > 45 && this.level < this.maxLevel) {
      this.level++;
      this.over = 0;
      this.ema = 0;
    } else if (this.under > 600 && this.level > 0 && this.ema < this.budget * 0.35) {
      this.level--;
      this.under = 0;
    }
    return this.level;
  }
}

/** "0.4" · always a point (a decimal comma would break the brand rule in Turkish). */
export function ms(v: number): string {
  return (Math.round(v * 10) / 10).toFixed(1);
}

/** The breathing word: letters · digits · spaces and a little punctuation · never a comma · nine at most. */
export function cleanWord(s: string): string {
  return s.replace(/[^\p{L}\p{N} .!?'’-]/gu, '').slice(0, 9);
}

/** 4 × 4 ordered dithering thresholds (Bayer) between 0 and 1. */
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function bayer(x: number, y: number): number {
  return (B4[(y & 3) * 4 + (x & 3)]! + 0.5) / 16;
}

/** A brightness between 0 and 1 dithered down to one of `levels` tones. */
export function ditherLevel(brightness: number, levels: number, x: number, y: number): number {
  const L = Math.max(2, Math.round(levels));
  const lv = Math.floor(Math.max(0, Math.min(1, brightness)) * (L - 1) + bayer(x, y));
  return Math.max(0, Math.min(L - 1, lv));
}

/** Variable font axes for the breathing word from a point in its box (0..1 each way). */
export function breathAxes(fx: number, fy: number): { wdth: number; wght: number } {
  const x = Math.max(0, Math.min(1, fx));
  const y = Math.max(0, Math.min(1, fy));
  return { wdth: 50 + 80 * x, wght: 900 - 760 * y };
}
