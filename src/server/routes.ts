import type { Lang } from './i18n';

/** Localized paths. Never hand-write a path anywhere else: use href(). */
export const ROUTES = {
  home: { tr: '/tr', en: '/en' },
  work: { tr: '/tr/isler', en: '/en/work' },
  case: { tr: '/tr/isler/:slug', en: '/en/work/:slug' },
  services: { tr: '/tr/hizmetler', en: '/en/services' },
  service: { tr: '/tr/hizmetler/:slug', en: '/en/services/:slug' },
  process: { tr: '/tr/surec', en: '/en/process' },
  studio: { tr: '/tr/studyo', en: '/en/studio' },
  notes: { tr: '/tr/notes', en: '/en/notes' },
  note: { tr: '/tr/notes/:slug', en: '/en/notes/:slug' },
  rss: { tr: '/tr/notes/rss.xml', en: '/en/notes/rss.xml' },
  lab: { tr: '/tr/lab', en: '/en/lab' },
  start: { tr: '/tr/basla', en: '/en/start' },
  now: { tr: '/tr/simdi', en: '/en/now' },
  uses: { tr: '/tr/araclar', en: '/en/uses' },
  privacy: { tr: '/tr/gizlilik', en: '/en/privacy' },
  kvkk: { tr: '/tr/kvkk', en: '/en/kvkk' },
  cookies: { tr: '/tr/cerezler', en: '/en/cookies' },
} as const satisfies Record<string, Record<Lang, string>>;

export type RouteId = keyof typeof ROUTES;
export type Params = Record<string, string>;

export function href(lang: Lang, id: RouteId, params: Params = {}): string {
  return ROUTES[id][lang].replace(/:(\w+)/g, (_, k: string) => {
    const v = params[k];
    if (v === undefined) throw new Error(`href(${id}) needs param ${k}`);
    return encodeURIComponent(v);
  });
}

/** Static routes have no params and can be rendered from the route table alone. */
export function isStatic(id: RouteId): boolean {
  return !ROUTES[id].tr.includes(':');
}
