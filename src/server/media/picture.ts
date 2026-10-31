/**
 * <picture> markup for an image from the pipeline: AVIF first · WebP for older browsers ·
 * width and height set so nothing jumps while it loads · the dominant colour fills the box
 * until then (data-c · applied by the client because the CSP forbids style attributes).
 */
import { html, type Safe } from '../html';
import type { Lang } from '../i18n';

export const FORMATS = ['avif', 'webp'] as const;
export type Format = (typeof FORMATS)[number];

export interface MediaRef {
  key: string;
  width: number;
  height: number;
  widths: number[];
  color: string;
  alt: Partial<Record<Lang, string>>;
}

export interface PictureOptions {
  lang: Lang;
  /** How wide the image is drawn, as a sizes attribute: "(max-width: 760px) 100vw, 600px". */
  sizes: string;
  /** Overrides the image's own alt text. Empty string = decorative. */
  alt?: string;
  /** Above the fold: load at once with high priority instead of lazily. */
  priority?: boolean;
  class?: string;
}

export const mediaUrl = (key: string, width: number, format: Format) => `/media/${key}/${width}.${format}`;

/** The variant closest to 960 px: the fallback src for browsers without srcset. */
function fallbackWidth(widths: number[]): number {
  return widths.reduce((best, w) => (Math.abs(w - 960) < Math.abs(best - 960) ? w : best), widths[0] ?? 0);
}

export function picture(m: MediaRef, o: PictureOptions): Safe {
  const other: Lang = o.lang === 'tr' ? 'en' : 'tr';
  const alt = o.alt ?? m.alt[o.lang] ?? m.alt[other] ?? '';
  const srcset = (f: Format) => m.widths.map((w) => `${mediaUrl(m.key, w, f)} ${w}w`).join(', ');
  return html`<picture class="pic${o.class ? ' ' + o.class : ''}">${FORMATS.map(
    (f) => html`<source type="image/${f}" srcset="${srcset(f)}" sizes="${o.sizes}">`,
  )}<img src="${mediaUrl(m.key, fallbackWidth(m.widths), 'webp')}" width="${m.width}" height="${m.height}" alt="${alt}" ${o.priority ? html`fetchpriority="high"` : html`loading="lazy"`} decoding="async" data-c="${m.color}"></picture>`;
}
