/**
 * Case study · the version history. Pick a version · drag the scrubber · or play it from the first
 * sketch to launch. The frame changes with it and the teammate who made that version hosts the
 * section. Swatches copy their hex. Without JS the page shows the final version.
 */
import { getCrew, type Name } from './lib/crew';
import { t } from './lib/t';

interface Version {
  v: string;
  who: Name;
  title: string;
  summary: string;
  comment: string;
  label: string;
}
interface CaseData {
  bubbles: { who: Name; text: string }[];
  versions: Version[];
}

const $ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<E>(s);
const $$ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<E>(s)];
const INITIAL: Record<Name, string> = { design: 'D', code: 'C', motion: 'M' };

const data = JSON.parse(document.getElementById('page-data')?.textContent ?? '{}') as CaseData;
const crew = getCrew();

/* ---------------- history ---------------- */

const hist = $('section[data-sec="hist"]');
const versions = data.versions ?? [];
let at = versions.length - 1;
let playing = 0;

function text(sel: string, value: string): void {
  const el = $(sel, hist ?? document);
  if (el) el.textContent = value;
}

function show(i: number): void {
  const v = versions[i];
  if (!hist || !v || i === at) return;
  const was = versions[at]?.who;
  at = i;
  for (const b of $$<HTMLButtonElement>('[data-v]', hist)) {
    const on = Number(b.dataset.v) === i;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
    // The host rests beside the version that is on.
    if (on) {
      b.dataset.rest = 'host';
      b.dataset.restAt = '1 0.32 6 0';
    } else {
      delete b.dataset.rest;
      delete b.dataset.restAt;
    }
  }
  const fr = $('[data-fr]', hist);
  if (fr) {
    fr.className = fr.className.replace(/\bvs-\d+\b/, `vs-${i}`);
    for (const f of $$('[data-fi]', fr)) f.classList.toggle('on', Number(f.dataset.fi) === i);
    fr.setAttribute('aria-label', v.label);
  }
  const rng = $<HTMLInputElement>('[data-rng]', hist);
  if (rng) {
    rng.value = String(i);
    rng.setAttribute('aria-valuetext', `${v.v} · ${v.title}`);
  }
  $$('.ticks span', hist).forEach((s, k) => s.classList.toggle('on', k === i));
  text('[data-verof]', `${v.v} · ${v.title}`);
  text('[data-curs]', v.summary);
  text('[data-curc]', v.comment);
  text('[data-curwho]', `${v.who} · ${v.v}`);
  const av = $('[data-curav]', hist);
  if (av) {
    av.className = av.className.replace(/\bc-\w+\b/, `c-${v.who}`);
    av.textContent = INITIAL[v.who];
  }
  hist.dataset.host = v.who;
  if (crew?.current === 'hist') {
    if (v.who !== was) crew.cast(v.who);
    crew.home(v.who);
  }
}

function stop(): void {
  if (!playing) return;
  window.clearInterval(playing);
  playing = 0;
  const b = $('[data-play]', hist ?? document);
  b?.classList.remove('on');
  b?.setAttribute('aria-pressed', 'false');
  text('[data-playtxt]', t('Geçmişi oynat'));
}

function play(): void {
  if (playing) return stop();
  const b = $('[data-play]', hist ?? document);
  b?.classList.add('on');
  b?.setAttribute('aria-pressed', 'true');
  text('[data-playtxt]', t('Durdur'));
  if (at === versions.length - 1) show(0);
  playing = window.setInterval(() => (at + 1 < versions.length ? show(at + 1) : stop()), 1700);
}

if (hist) {
  for (const b of $$<HTMLButtonElement>('[data-v]', hist)) {
    b.addEventListener('click', () => {
      stop();
      show(Number(b.dataset.v));
    });
  }
  $<HTMLInputElement>('[data-rng]', hist)?.addEventListener('input', (e) => {
    stop();
    show(Number((e.target as HTMLInputElement).value));
  });
  $('[data-play]', hist)?.addEventListener('click', play);
}

/* ---------------- swatches ---------------- */

for (const b of $$<HTMLButtonElement>('.swb[data-hex]')) {
  let timer = 0;
  b.addEventListener('click', () => {
    const hex = b.dataset.hex ?? '';
    navigator.clipboard?.writeText(hex).catch(() => undefined);
    b.classList.add('cp');
    const live = b.closest('.tile')?.querySelector('[data-copied]');
    if (live) live.textContent = t('{hex} kopyalandı', { hex });
    window.clearTimeout(timer);
    timer = window.setTimeout(() => b.classList.remove('cp'), 1400);
  });
}

/* ---------------- the team ---------------- */

crew?.addScenes({
  hero: async (c, signal) => {
    const [first, second] = data.bubbles ?? [];
    await c.sleep(3400, signal);
    if (first) c.once('h1', first.who, first.text, 2400);
    await c.sleep(4200, signal);
    if (second) c.once('h2', second.who, second.text, 2400);
  },
  hist: async (c, signal) => {
    await c.sleep(900, signal);
    c.once('hist0', c.hostOf('hist'), t('noktayı zamanda geri sürükle'), 2600);
  },
  dets: async (c, signal) => {
    if (!$('.swb')) return;
    await c.sleep(1200, signal);
    c.once('d1', c.hostOf('dets'), t('kopyalamak için bir renge tıkla'), 2400);
  },
});
