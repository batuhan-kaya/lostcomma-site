/**
 * Loops (src/server/media/video.ts) play while they are on screen and wanted · pause otherwise.
 * With reduced motion they wait on their poster until the visitor asks for one to play.
 */
import { reducedMotion } from './motion';

const reduce = reducedMotion();
const all = new Map<Element, Loop>();
let io: IntersectionObserver | null = null;

function observer(): IntersectionObserver {
  io ??= new IntersectionObserver((entries) => {
    for (const e of entries) {
      const loop = all.get(e.target);
      if (!loop) continue;
      loop.visible = e.isIntersecting;
      loop.sync();
    }
  });
  return io;
}

export class Loop {
  visible = false;
  private wanted: boolean;
  private asked = false;

  constructor(
    readonly el: HTMLVideoElement,
    wanted = true,
  ) {
    this.wanted = wanted && !reduce;
    el.muted = true;
    all.set(el, this);
    observer().observe(el);
  }

  /** Whether this loop should play when it can. `byVisitor` lets it play under reduced motion too. */
  set(wanted: boolean, byVisitor = false): void {
    this.wanted = wanted;
    if (byVisitor) this.asked = wanted;
    this.sync();
  }

  get playing(): boolean {
    return !this.el.paused;
  }

  sync(): void {
    const go = this.wanted && this.visible && (!reduce || this.asked);
    if (go) {
      if (this.el.preload !== 'auto') this.el.preload = 'auto';
      this.el.play().catch(() => {
        /* the browser said no (power saving) · the poster stays */
      });
    } else if (!this.el.paused) this.el.pause();
  }
}

export const prefersStill = reduce;
