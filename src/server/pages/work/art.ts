import type { ProjectCard } from '../../data/content';
import { html, type Safe } from '../../html';
import type { Lang } from '../../i18n';
import { picture } from '../../media/picture';

/**
 * Drawn covers from the Work page design (src/styles/pages/_art.css). Each project points at one
 * with projects.art until a real cover image arrives. Shapes are six <i> elements and a word.
 */
export const ART_TEXT: Record<string, string> = {
  clim: '+1.4°C',
  musm: 'Room 4 · Track 12',
  sail: 'Regatta 26',
  film: '00:12 / 00:40',
  cera: 'kil',
  bake: 'FIRIN',
  fest: 'LOUD',
  fin: '₺ 12 480',
  cof: 'No. 6',
  fer: '08:40 Kadıköy',
  arc: 'Plan B · 1:200',
  rad: 'FM 98.4',
  book: 'kitap',
  lc: 'lost comma',
};

/** The frame size shown next to a layer (the canvas the work was made for). */
export const FRAME_SIZE: Record<ProjectCard['discipline'], string> = {
  web: '1440 × 900',
  app: '390 × 844',
  identity: '1080 × 1080',
  motion: '1920 × 820',
};

/** Short group keys used in class names (.g-web · .g-app · .g-id · .g-mo). */
export const GROUP_CLASS: Record<ProjectCard['discipline'], string> = { web: 'web', app: 'app', identity: 'id', motion: 'mo' };

export interface ArtOptions {
  /** Shown (.on). The preview frame stacks every cover and turns one on at a time. */
  on?: boolean;
  /** data-pa: the layer this cover belongs to (preview frame). */
  index?: number;
}

export function drawnArt(key: string | null, o: ArtOptions = {}): Safe {
  const k = key && key in ART_TEXT ? key : 'none';
  return html`<span class="art a-${k}${o.on ? ' on' : ''}"${o.index !== undefined ? html` data-pa="${o.index}"` : ''} aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><em>${ART_TEXT[k] ?? ''}</em></span>`;
}

/** The project's cover image when it has one · its drawing otherwise. */
export function coverOrArt(p: ProjectCard, lang: Lang, sizes: string, o: ArtOptions = {}): Safe {
  if (!p.cover) return drawnArt(p.art, o);
  return html`<span class="art img${o.on ? ' on' : ''}"${o.index !== undefined ? html` data-pa="${o.index}"` : ''} aria-hidden="true">${picture(p.cover, { lang, sizes, alt: '' })}</span>`;
}
