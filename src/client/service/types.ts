import type { Name } from '../lib/crew';

/** The page-data block of a service page (src/server/pages/service/index.ts). */
export interface ServiceData {
  key: 'web' | 'app' | 'identity' | 'motion';
  host: Name;
  verdict: [string, string, string];
  weeks: [string, string, string];
  reach?: Record<'easy' | 'ok' | 'hard', [string, string]>;
  sizes?: { n: string; sz: string; real: string; ver: string; vno: string; rule: string; cap: string; v: 1 | 2 | 3 }[];
  curves?: { n: string; d: string }[];
  editor?: Record<'tr' | 'en', { h: string; p: string }>;
}
