/**
 * The statistics beacon (docs/ISTATISTIK.md). No cookies and nothing stored on the device: one
 * random id per page view lives in memory · the page view · time on screen · how far down ·
 * clicks on links and buttons go to /api/stats with sendBeacon (after a moment · every 30 s while
 * the page shows · when it hides or closes). Nothing typed into a form is ever read.
 *
 * Not counted: Do Not Track or Global Privacy Control · a browser told "do not count me"
 * (localStorage lc-stats-off · the privacy page and the panel set it) · the panel · frames.
 */
const OFF_KEY = 'lc-stats-off';
const HEARTBEAT_MS = 30_000;

interface Ev {
  k: 'click' | 'out' | 'contact' | 'event';
  n: string;
  g?: string;
  x?: number;
  y?: number;
  t: number;
}

let on = false;
let id = '';
let base = 0;
let shownAt: number | null = null;
let ms = 0;
let bottom = 0;
let queue: Ev[] = [];
let timer = 0;

function uuid(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 15) | 64;
  b[8] = (b[8]! & 63) | 128;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Whether this browser asked not to be counted. */
export function statsOff(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.doNotTrack === '1' || nav.globalPrivacyControl) return true;
  try {
    return localStorage.getItem(OFF_KEY) === '1';
  } catch {
    return false;
  }
}

/** "Do not count me" on this browser (or count again). */
export function setStatsOff(off: boolean): void {
  try {
    if (off) localStorage.setItem(OFF_KEY, '1');
    else localStorage.removeItem(OFF_KEY);
  } catch {
    /* storage blocked: nothing to remember */
  }
  if (off) {
    on = false;
    queue = [];
  }
}

const now = () => performance.now();
const seen = () => Math.round(ms + (shownAt !== null ? now() - shownAt : 0));
const depth = () => {
  const h = document.documentElement.scrollHeight;
  return h ? Math.min(100, Math.round((Math.max(bottom, scrollY + innerHeight) / h) * 100)) : 0;
};

function flush(): void {
  if (!on || !id) return;
  const q = location.search.match(/utm_[a-z]+=[^&]*/g)?.join('&') ?? '';
  const body = JSON.stringify({
    id,
    path: location.pathname,
    page: document.documentElement.dataset.page ?? '',
    lang: document.documentElement.lang,
    ref: document.referrer,
    q,
    w: innerWidth,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
    bl: navigator.language ?? '',
    ms: seen(),
    sc: depth(),
    age: Math.round(now() - base),
    ev: queue,
  });
  if (navigator.sendBeacon('/api/stats', new Blob([body], { type: 'application/json' }))) queue = [];
}

/** Something worth counting that is not a click (a found egg · a language switch). */
export function track(name: string, target = ''): void {
  if (on) queue.push({ k: 'event', n: name, g: target, t: Math.round(now() - base) });
}

function view(): void {
  id = uuid();
  base = now();
  ms = 0;
  bottom = scrollY + innerHeight;
  queue = [];
  shownAt = document.visibilityState === 'visible' ? now() : null;
  clearTimeout(timer);
  timer = window.setTimeout(flush, 1500);
}

function click(e: MouseEvent): void {
  if (!on) return;
  const el = (e.target as Element | null)?.closest?.('a[href],button,summary,[role="button"],[data-stat]');
  if (!el || el.closest('.crew,[data-stat-skip]')) return;
  const label = (el.getAttribute('data-stat') || el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 80);
  let k: Ev['k'] = 'click';
  let g = '';
  if (el instanceof HTMLAnchorElement) {
    const u = new URL(el.href, location.href);
    if (u.protocol === 'mailto:' || u.protocol === 'tel:') [k, g] = ['contact', u.protocol.slice(0, -1)];
    else if (u.origin !== location.origin) [k, g] = ['out', (u.host + u.pathname).slice(0, 200)];
    else g = u.pathname;
  }
  // A keyboard press has no position.
  const pos = e.detail > 0 ? { x: Math.round((e.clientX / innerWidth) * 1000), y: Math.round(e.pageY) } : {};
  queue.push({ k, n: label, g, t: Math.round(now() - base), ...pos });
}

/** Starts counting this page. Called once from app.ts. */
export function startStats(): void {
  if (statsOff() || window.top !== window || location.pathname.startsWith('/panel') || !navigator.sendBeacon) return;
  on = true;
  view();
  addEventListener('scroll', () => (bottom = Math.max(bottom, scrollY + innerHeight)), { passive: true });
  document.addEventListener('click', click, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (shownAt !== null) ms += now() - shownAt;
      shownAt = null;
      flush();
    } else shownAt = now();
  });
  addEventListener('pagehide', flush);
  // Back from the cache: a new page view.
  addEventListener('pageshow', (e) => e.persisted && on && view());
  window.setInterval(() => document.visibilityState === 'visible' && flush(), HEARTBEAT_MS);
}
