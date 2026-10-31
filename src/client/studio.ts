/**
 * Studio. The selections in the title say hello · hovering a teammate's card hands the page to
 * that cursor · "Say hi" sends it to the button. The settings window is real: tabs (arrow keys) ·
 * switches that bounce back · locked ones that refuse · Display switches that change this page ·
 * a range and a select that answer. The open sign and the ferry follow Istanbul time. And if you
 * found the comma on the homepage the numbers know.
 */
import { getCrew, type Name } from './lib/crew';
import { reducedMotion } from './lib/motion';
import { t } from './lib/t';
import { ferry, studioOpen } from '../shared/istanbul';
import { boatTransform } from '../shared/map';
import { MEET_WARN, meetLevel } from '../shared/studio';

interface StudioData {
  toasts?: Record<string, string[]>;
  meet?: { levels: [string, string, string, string]; warn: string };
  drink?: Record<string, string>;
  hello?: Partial<Record<Name, string>>;
}

const $ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<E>(s);
const $$ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<E>(s)];
const data = JSON.parse(document.getElementById('page-data')?.textContent ?? '{}') as StudioData;
const crew = getCrew();
const html = document.documentElement;
let still = reducedMotion();

const hello = (n: Name) => data.hello?.[n] ?? t('selam');

/* ---------------- the title ---------------- */

for (const w of $$('.ttl [data-w]')) {
  w.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse' || crew?.current !== 'hero') return;
    const n = w.dataset.w as Name;
    crew.once(`w-${n}`, n, hello(n), 2000);
  });
}

/* ---------------- the team ---------------- */

const team = $('section[data-sec="team"]');
for (const c of $$('.card[data-who]')) {
  c.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse' || !team || crew?.current !== 'team') return;
    const n = c.dataset.who as Name;
    if (team.dataset.host === n) return;
    team.dataset.host = n;
    crew.cast(n);
    crew.home(n);
  });
}

for (const b of $$<HTMLButtonElement>('[data-hi]')) {
  let timer = 0;
  b.addEventListener('click', async () => {
    const n = b.dataset.hi as Name;
    const line = hello(n);
    const bubble = $('[data-hello]', b.closest('.card') ?? document);
    const cursor = !!crew && !crew.touch && crew.current === 'team';
    // The cursor says it when it can. The card says it otherwise (and always for screen readers).
    if (bubble) {
      bubble.classList.toggle('sr', cursor);
      bubble.textContent = line;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => (bubble.textContent = ''), 2600);
    }
    if (!cursor || !crew || !team) return;
    team.dataset.host = n;
    crew.cast(n);
    crew.aim(n, { el: b, fx: 0.9, fy: 0.2, dx: 6 });
    window.setTimeout(() => {
      crew.press(n);
      crew.say(n, line, 2200);
    }, still ? 0 : 900);
    window.setTimeout(() => crew.home(n), 3400);
  });
}

/* ---------------- settings ---------------- */

const win = $('[data-win]');
const toastEl = $('[data-toast]', win ?? document);
let toastTimer = 0;
function toast(msg: string): void {
  if (!toastEl || !msg) return;
  const span = $('span', toastEl);
  if (span) span.textContent = msg;
  toastEl.classList.add('on');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('on'), 2400);
}

function shake(row: Element | null): void {
  if (!row) return;
  row.classList.remove('shake');
  void (row as HTMLElement).offsetWidth;
  row.classList.add('shake');
}

const DISPLAY: Record<string, (on: boolean) => void> = {
  still: (on) => {
    still = on || reducedMotion();
    if (crew) crew.calm(on);
    else html.classList.toggle('still', on);
  },
  big: (on) => html.classList.toggle('st-big', on),
  hc: (on) => html.classList.toggle('st-hc', on),
};

if (win) {
  const tabs = $$<HTMLButtonElement>('[role="tab"]', win);
  const select = (tab: HTMLButtonElement, focus = false) => {
    for (const x of tabs) {
      const on = x === tab;
      x.classList.toggle('on', on);
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
      const pane = document.getElementById(x.getAttribute('aria-controls') ?? '');
      if (pane) pane.hidden = !on;
    }
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      const go: Record<string, number> = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in go)) return;
      e.preventDefault();
      select(tabs[(go[e.key]! + tabs.length) % tabs.length]!, true);
    });
  });

  for (const sw of $$<HTMLButtonElement>('[data-sw]', win)) {
    const key = sw.dataset.sw ?? '';
    const kind = sw.dataset.kind;
    const say = data.toasts?.[key] ?? [];
    sw.addEventListener('click', () => {
      if (kind === 'locked') {
        shake(sw.closest('.row'));
        return toast(say[0] ?? '');
      }
      if (kind === 'bounce') {
        sw.classList.remove('on');
        sw.setAttribute('aria-checked', 'false');
        toast(say[0] ?? '');
        window.setTimeout(() => {
          sw.classList.add('on');
          sw.setAttribute('aria-checked', 'true');
        }, 900);
        return;
      }
      const on = sw.getAttribute('aria-checked') !== 'true';
      sw.classList.toggle('on', on);
      sw.setAttribute('aria-checked', String(on));
      DISPLAY[key]?.(on);
      toast((on ? say[0] : say[1]) ?? '');
    });
  }

  const meet = $<HTMLInputElement>('[data-meet]', win);
  let warned = false;
  meet?.addEventListener('input', () => {
    const n = Number(meet.value);
    const label = data.meet?.levels[meetLevel(n)] ?? '';
    const v = $('[data-meetv]', win);
    if (v) v.textContent = label;
    meet.setAttribute('aria-valuetext', `${n} · ${label}`);
    if (n >= MEET_WARN && !warned) toast(data.meet?.warn ?? '');
    warned = n >= MEET_WARN;
  });
  const drink = $<HTMLSelectElement>('[data-drink]', win);
  drink?.addEventListener('change', () => toast(data.drink?.[drink.value] ?? ''));
}

/* ---------------- Istanbul time: the open sign and the ferry ---------------- */

const boat = $<SVGGElement>('[data-boat]');
const feryLine = $('[data-fery]');
function istanbulTick(): void {
  const now = new Date();
  const open = studioOpen(now);
  for (const el of $$('[data-open]')) {
    el.classList.toggle('is', open);
    const label = $('[data-opent]', el);
    if (!label) continue;
    const long = !!el.closest('.hmeta');
    const v = open ? (long ? t('Stüdyo açık') : t('Açık')) : long ? t('Stüdyo kapalı') : t('Kapalı');
    if (label.textContent !== v) label.textContent = v;
  }
  const f = ferry(now, now.getUTCSeconds() + now.getUTCMilliseconds() / 1000);
  boat?.setAttribute('transform', boatTransform(f.at, f.east));
  if (feryLine) {
    const v = f.running ? `${t('Karaköy’den sonraki vapur · {time}', { time: f.next })} · ${t('aşağı yukarı 20 dakikada bir')}` : t('Vapurlar uyuyor. İlki {time}’de.', { time: f.next });
    if (feryLine.textContent !== v) feryLine.textContent = v;
  }
}
istanbulTick();
// The boat moves a little every second · held still it only catches up twice a minute.
let tickTimer = 0;
const schedule = () => {
  window.clearTimeout(tickTimer);
  tickTimer = window.setTimeout(() => {
    istanbulTick();
    schedule();
  }, still || html.classList.contains('still') ? 30_000 : 1000);
};
schedule();

/* ---------------- the comma you found on the homepage ---------------- */

if (html.classList.contains('found')) {
  const n = $('[data-commas]');
  if (n) n.textContent = '1';
  const you = $('[data-yfound]');
  if (you) you.hidden = false;
}

/* ---------------- the team's lines ---------------- */

crew?.addScenes({
  hero: async (c, signal) => {
    await c.sleep(3600, signal);
    c.once('h1', 'design', t('merhaba. evet gerçeğiz'), 2400);
    await c.sleep(3800, signal);
    c.once('h2', 'motion', t('aşağı kaydır. kartlarımız var'), 2400);
  },
  set: async (c, signal) => {
    await c.sleep(1200, signal);
    c.once('s1', c.hostOf('set'), t('virgül anahtarını dene'), 2400);
  },
});
