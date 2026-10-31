/**
 * Page themes. The CSS for each lives in src/styles/themes.css as .th-<id>.
 * Only the background is mirrored here (for <meta name="theme-color">).
 * test/themes.test.ts keeps both in sync.
 */
export const THEMES = {
  paper: '#ECECE8',
  ink: '#0E0E0F',
  navy: '#0F1F3A',
  blue: '#3B35FF',
  night: '#141416',
  pink: '#FF9BD2',
  milk: '#F2F1EC',
  lab: '#161618',
  lime: '#CDF23A',
  sun: '#FFC633',
} as const;

export type ThemeId = keyof typeof THEMES;

/** Next band wipe colors. CSS: .nb-<id> sets --nbg and --nfg. */
export const NEXT_TONES = ['paper', 'ink', 'night', 'pink', 'milk', 'lab', 'lime', 'sun'] as const;
export type NextTone = (typeof NEXT_TONES)[number];
