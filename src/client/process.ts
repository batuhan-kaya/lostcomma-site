/**
 * Process · the edit suite. Ten weeks on four tracks: drag anywhere on the timeline to scrub ·
 * click a clip to jump to it · play (one week every 1.4 s) · step a week back or forward. The
 * ruler is a slider for the keyboard (arrows a day · page keys a week · Home and End).
 * The monitor and the inspector follow the playhead.
 */
import { getCrew } from './lib/crew';
import { reducedMotion } from './lib/motion';
import { t } from './lib/t';
import { clipOn, pad2, PHASE_WHO, phaseOf, START, WEEK_SECONDS, WEEKS, weekDay } from '../shared/timeline';

interface Phase {
  n: string;
  w: string;
  hap: string;
  you: string;
  get: string;
}

const $ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<E>(s);
const $$ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<E>(s)];
const INITIAL: Record<string, string> = { you: 'Y', design: 'D', motion: 'M', code: 'C' };

const data = JSON.parse(document.getElementById('page-data')?.textContent ?? '{}') as { phases?: Phase[] };
const crew = getCrew();
const reduce = reducedMotion();
const ed = $('[data-ed]');
const phases = data.phases ?? [];

let p = START;
let shown = phaseOf(p);
let playing = false;
let last = 0;
let raf = 0;
let user = false;

function text(el: Element | null, v: string): void {
  if (el && el.textContent !== v) el.textContent = v;
}

function timecode(at: number): string {
  const { week, day } = weekDay(at);
  return `${t('H{w} · G{d}', { w: pad2(week), d: day })} · ${phases[phaseOf(at)]?.n ?? ''}`;
}

function apply(): void {
  if (!ed) return;
  const pct = `${((p / WEEKS) * 100).toFixed(3)}%`;
  const head = $('[data-head]', ed);
  const done = $('[data-done]', ed);
  if (head) head.style.left = pct;
  if (done) done.style.width = pct;
  const tc = timecode(p);
  text($('[data-tc]', ed), tc);
  text($('[data-tc2]', ed), tc);
  const rul = $('[data-rul]', ed);
  rul?.setAttribute('aria-valuenow', p.toFixed(2));
  rul?.setAttribute('aria-valuetext', tc);
  const { week } = weekDay(p);
  $$('.wk', ed).forEach((w, i) => w.classList.toggle('on', i + 1 === week));
  for (const c of $$<HTMLButtonElement>('.clip', ed)) c.classList.toggle('on', clipOn(Number(c.dataset.at), Number(c.dataset.len), p));
  const i = phaseOf(p);
  if (i === shown) return;
  shown = i;
  const ph = phases[i];
  if (!ph) return;
  for (const s of $$('[data-ph]', ed)) s.classList.toggle('on', Number(s.dataset.ph) === i);
  $('[data-scr]', ed)?.setAttribute('aria-label', `${ph.w} · ${ph.n}`);
  text($('[data-iw]', ed), ph.w);
  text($('[data-in]', ed), ph.n);
  text($('[data-ihap]', ed), ph.hap);
  text($('[data-iyou]', ed), ph.you);
  text($('[data-iget]', ed), ph.get);
  const who = $('[data-iwho]', ed);
  if (who) who.innerHTML = (PHASE_WHO[i] ?? []).map((w) => `<span class="av c-${w}">${INITIAL[w]}</span>`).join('');
}

function seek(v: number): void {
  p = Math.max(0, Math.min(WEEKS, v));
  apply();
}

function setPlaying(on: boolean): void {
  playing = on;
  const b = $('[data-play]', ed ?? document);
  b?.classList.toggle('on', on);
  b?.setAttribute('aria-pressed', String(on));
  b?.setAttribute('aria-label', on ? t('Durdur') : t('On haftayı oynat'));
  cancelAnimationFrame(raf);
  if (on) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
}

function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  seek(p + dt / WEEK_SECONDS);
  if (p >= WEEKS) {
    setPlaying(false);
    if (crew?.current === 'hero') crew.once('end', 'design', t('ve işte yayın günü'), 2400);
    return;
  }
  if (playing) raf = requestAnimationFrame(frame);
}

function play(): void {
  if (playing) return setPlaying(false);
  if (p >= WEEKS - 0.02) seek(0);
  if (reduce) {
    // No playback with reduced motion: jump to the end of the next phase instead.
    const next = [1, 2, 3, 5, 8, 9, 10].find((w) => w > p + 0.01) ?? WEEKS;
    return seek(next === WEEKS ? WEEKS : next);
  }
  setPlaying(true);
}

const mine = () => {
  user = true;
  setPlaying(false);
};

if (ed) {
  const area = $('[data-tl]', ed)!;
  const rul = $('[data-rul]', ed)!;
  const fromX = (x: number) => {
    const b = area.getBoundingClientRect();
    return ((x - b.left) / b.width) * WEEKS;
  };
  let drag = false;
  area.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const clip = (e.target as Element).closest<HTMLButtonElement>('.clip');
    mine();
    if (clip) return;
    drag = true;
    area.setPointerCapture(e.pointerId);
    seek(fromX(e.clientX));
  });
  area.addEventListener('pointermove', (e) => {
    if (drag) seek(fromX(e.clientX));
  });
  const up = () => {
    drag = false;
  };
  area.addEventListener('pointerup', up);
  area.addEventListener('pointercancel', up);
  for (const c of $$<HTMLButtonElement>('.clip', ed)) {
    c.addEventListener('click', () => {
      mine();
      seek(Math.min(WEEKS, Number(c.dataset.at) + 0.02));
    });
  }
  rul.addEventListener('keydown', (e) => {
    const by: Record<string, number> = { ArrowLeft: -0.2, ArrowDown: -0.2, ArrowRight: 0.2, ArrowUp: 0.2, PageDown: -1, PageUp: 1 };
    let v: number | null = e.key in by ? p + by[e.key]! : null;
    if (e.key === 'Home') v = 0;
    if (e.key === 'End') v = WEEKS;
    if (v === null) return;
    e.preventDefault();
    mine();
    seek(Math.round(v * 100) / 100);
  });
  $('[data-play]', ed)?.addEventListener('click', () => {
    user = true;
    play();
  });
  $('[data-prev]', ed)?.addEventListener('click', () => {
    mine();
    seek(Math.max(0, Math.floor(p - 0.0001)));
  });
  $('[data-next]', ed)?.addEventListener('click', () => {
    mine();
    seek(Math.min(WEEKS, Math.floor(p) + 1));
  });
  apply();
}

crew?.addScenes({
  hero: async (c, signal) => {
    if (user) return;
    await c.sleep(3200, signal);
    if (user) return;
    await c.go('motion', { sel: '[data-play]', fx: 0.5, fy: 0.7 }, signal);
    if (user) return c.home('motion');
    c.press('motion');
    seek(0);
    setPlaying(true);
    c.say('motion', t('çalıştır'), 1400);
    await c.sleep(900, signal);
    c.home('motion');
  },
  week: async (c, signal) => {
    await c.sleep(1200, signal);
    c.once('w1', c.hostOf('week'), t('en sevdiğimiz gün cuma'), 2200);
  },
});
