/**
 * Photos inside the drawn product mocks of 03 · services (frames.ts). Each one is optional: a mock
 * without its photo keeps its drawing. `npm run mock -- <name> <file>` crops a photo to its slot and
 * writes `src/images/<name>.webp` (commit it) · the build copies it with a content hash.
 *
 * Sizes are twice the size the slot is drawn at (sharp on retina screens).
 */
export const PICTURES = {
  // website · Lodos (a sailing club)
  'web-hero': { w: 1600, h: 928, what: 'Lodos hero · a keelboat sailing on the Bosphorus at golden hour' },
  'web-j70': { w: 720, h: 480, what: 'Lodos fleet · a J/70 sport keelboat sailing' },
  'web-laser': { w: 720, h: 480, what: 'Lodos fleet · a single handed dinghy with one sailor' },
  'web-cruiser': { w: 720, h: 480, what: 'Lodos fleet · a 40 foot cruiser racer under sail' },
  'web-skipper': { w: 160, h: 160, what: 'Lodos booking · the skipper Defne Arslan' },
  // app · Pocket (a wallet) · people
  'app-deniz': { w: 160, h: 160, what: 'Pocket · Deniz Kaya (the account holder)' },
  'app-ece': { w: 160, h: 160, what: 'Pocket · Ece Yılmaz' },
  'app-mert': { w: 160, h: 160, what: 'Pocket · Mert Aksoy' },
  'app-zeynep': { w: 160, h: 160, what: 'Pocket · Zeynep Koç' },
  'app-can': { w: 160, h: 160, what: 'Pocket · Can Demir' },
  'app-ada': { w: 160, h: 160, what: 'Pocket · Ada Bulut' },
  'app-berk': { w: 160, h: 160, what: 'Pocket · Berk Oral' },
  'app-cem': { w: 160, h: 160, what: 'Pocket · Cem Tan' },
} as const;

export type PictureName = keyof typeof PICTURES;

/** Where a photo lives once built (Assets.image) · undefined while the slot has none. */
export type Pic = (name: PictureName) => string | undefined;

export const noPictures: Pic = () => undefined;
