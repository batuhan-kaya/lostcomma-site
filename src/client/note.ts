/**
 * A note. Reading position (the table of contents and the meta line) · footnotes placed beside
 * the line that cites them · copy buttons on code · the spring playground (the same step()
 * the cursors run) · select a sentence to copy it as a quote or as a link to that sentence.
 */
import { feel, graphPoints, PRESETS, presetOf, SPRING, step, type Body } from '../shared/spring';
import { getCrew, type Name } from './lib/crew';
import { reducedMotion } from './lib/motion';
import { t } from './lib/t';

const $ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<E>(s);
const $$ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<E>(s)];

const data = JSON.parse(document.getElementById('page-data')?.textContent ?? '{}') as { minutes: number; url: string; title: string; who: Name };
const crew = getCrew();
const reduce = reducedMotion();
const body = $('[data-body]');
const art = $('[data-sec="art"]');

/* ---------------- reading position ---------------- */

const heads = $$('[data-h]', body ?? document);
const tocItems = $$('[data-toc] li');
const bar = $('[data-bar]');
const pctEl = $('[data-pct]');
const readEl = $('[data-read]');
let active = -1;
let pct = -1;

function readLine(): number {
  return Math.min(innerHeight || 900, 1000) * 0.35;
}

function onActive(i: number): void {
  tocItems.forEach((li, k) => li.classList.toggle('on', k === i));
  const h = heads[i];
  // The author's cursor keeps them company at the heading they are reading.
  if (h && crew?.current === 'art') crew.aim(data.who, { el: h, end: true, dx: 18, dy: -6, rest: true });
}

function measure(): void {
  if (!body) return;
  const line = readLine();
  let a = 0;
  heads.forEach((h, i) => {
    if (h.getBoundingClientRect().top < line) a = i;
  });
  const b = body.getBoundingClientRect();
  const p = Math.round(Math.max(0, Math.min(1, (line - b.top) / Math.max(1, b.height - line))) * 100);
  if (a !== active) {
    active = a;
    onActive(a);
  }
  if (p !== pct) {
    pct = p;
    if (bar) bar.style.height = `calc(${p}% - 8px)`;
    const left = Math.max(0, Math.round(data.minutes * (1 - p / 100)));
    if (pctEl) pctEl.textContent = `${t('%{p}', { p })} · ${t('{n} dk kaldı', { n: left })}`;
    if (readEl) readEl.textContent = p <= 0 ? t('Başlanmadı') : p >= 100 ? t('Okundu') : t('%{p} okundu', { p });
  }
}

let queued = false;
function queue(): void {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    measure();
  });
}
addEventListener('scroll', queue, { passive: true });
addEventListener('resize', queue, { passive: true });
measure();

/* ---------------- side notes ---------------- */

const side = $('.side[aria-label]');
const notes = $$('[data-sn]');
const wide = matchMedia('(min-width: 1101px)');

function placeNotes(): void {
  if (!side || !notes.length) return;
  const on = wide.matches;
  side.classList.toggle('placed', on);
  if (!on) {
    for (const n of notes) n.style.top = '';
    return;
  }
  const top0 = side.getBoundingClientRect().top;
  let floor = 0;
  for (const n of notes) {
    const ref = document.getElementById(`fnr-${n.dataset.sn}`);
    if (!ref) continue;
    const y = Math.max(floor, Math.round(ref.getBoundingClientRect().top - top0 - 2));
    n.style.top = `${y}px`;
    floor = y + n.offsetHeight + 14;
  }
}

// A footnote and its mark light up together.
for (const n of notes) {
  const ref = document.getElementById(`fnr-${n.dataset.sn}`);
  if (!ref) continue;
  const on = (v: boolean) => {
    n.classList.toggle('hi', v);
    ref.classList.toggle('hi', v);
  };
  for (const el of [n, ref]) {
    el.addEventListener('pointerenter', () => on(true));
    el.addEventListener('pointerleave', () => on(false));
    el.addEventListener('focusin', () => on(true));
    el.addEventListener('focusout', () => on(false));
  }
}

if (body) new ResizeObserver(placeNotes).observe(body);
wide.addEventListener('change', placeNotes);
document.fonts?.ready.then(placeNotes).catch(() => {});
placeNotes();

/* ---------------- copy code ---------------- */

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

for (const btn of $$<HTMLButtonElement>('[data-copy]')) {
  btn.hidden = false;
  const label = btn.textContent ?? '';
  let timer = 0;
  btn.addEventListener('click', async () => {
    const code = btn.closest('figure')?.querySelector('code')?.textContent ?? '';
    const ok = await copy(code);
    btn.textContent = ok ? t('Kopyalandı') : t('Kopyalanamadı');
    btn.classList.toggle('ok', ok);
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      btn.textContent = label;
      btn.classList.remove('ok');
    }, 1600);
  });
}

/* ---------------- spring playground ---------------- */

const FEEL = { none: t('Aşmıyor · sürüklenmiş gibi'), little: t('Biraz aşıyor'), wobbly: t('Titriyor') };

function playground(root: HTMLElement): void {
  const box = $('[data-pg]', root);
  const tgt = $('[data-pgt]', root);
  const cur = $('[data-pgc]', root);
  const line = $('[data-pgl]', root);
  const feelEl = $('[data-pgfeel]', root);
  const hint = $('[data-pghint]', root);
  const inputs = { pull: $<HTMLInputElement>('[data-pgin="pull"]', root), damping: $<HTMLInputElement>('[data-pgin="damping"]', root) };
  const values = { pull: $('[data-pgv="pull"]', root), damping: $('[data-pgv="damping"]', root) };
  if (!box || !tgt || !cur || !line) return;
  root.classList.add('live');

  const k = { ...SPRING };
  const b: Body = { x: 0, y: 0, vx: 0, vy: 0 };
  const target = { x: 0, y: 0 };
  let axisX = true;
  let e0 = 1;
  const hist: number[] = [];
  let hover = false;
  let auto = 0;
  let autoAt = 0;
  let raf = 0;
  let frames = 0;
  const SPOTS = [
    [0.18, 0.3],
    [0.8, 0.66],
    [0.55, 0.22],
    [0.28, 0.74],
  ] as const;

  function aimAt(x: number, y: number): void {
    target.x = x;
    target.y = y;
    const ex = b.x - x;
    const ey = b.y - y;
    axisX = Math.abs(ex) >= Math.abs(ey);
    e0 = (axisX ? ex : ey) || 1;
  }

  function sync(): void {
    if (inputs.pull) inputs.pull.value = String(k.pull);
    if (inputs.damping) inputs.damping.value = String(k.damping);
    if (values.pull) values.pull.textContent = k.pull.toFixed(3);
    if (values.damping) values.damping.textContent = k.damping.toFixed(2);
    if (feelEl) feelEl.textContent = FEEL[feel(k.pull, k.damping)];
    const p = presetOf(k.pull, k.damping);
    for (const btn of $$('[data-pgp]', root)) btn.setAttribute('aria-pressed', String(btn.dataset.pgp === p));
  }

  function frame(now: number): void {
    raf = requestAnimationFrame(frame);
    const W = box!.clientWidth;
    const H = box!.clientHeight;
    if (!hover && now - autoAt > 1700) {
      autoAt = now;
      auto = (auto + 1) % SPOTS.length;
      const s = SPOTS[auto]!;
      aimAt(s[0] * W, s[1] * H);
    }
    if (reduce) Object.assign(b, { x: target.x, y: target.y, vx: 0, vy: 0 });
    else step(b, target.x, target.y, k);
    place();
    hist.push((axisX ? b.x - target.x : b.y - target.y) / e0);
    if (hist.length > 160) hist.shift();
    if (++frames % 2 === 0) line!.setAttribute('points', graphPoints(hist));
  }

  function place(): void {
    cur!.style.transform = `translate3d(${(b.x - 3).toFixed(1)}px,${(b.y - 2).toFixed(1)}px,0)`;
    tgt!.style.transform = `translate3d(${target.x.toFixed(1)}px,${target.y.toFixed(1)}px,0)`;
  }

  function start(): void {
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function stop(): void {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  // Runs only while on screen.
  new IntersectionObserver((es) => (es.some((e) => e.isIntersecting) ? start() : stop())).observe(root);

  const local = (e: PointerEvent) => {
    const r = box.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  box.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const p = local(e);
    if (Math.hypot(p.x - target.x, p.y - target.y) > 60) aimAt(p.x, p.y);
    else Object.assign(target, p);
    if (!hover) {
      hover = true;
      if (hint) hint.textContent = t('Seni takip ediyor');
    }
  });
  // Touch: a tap moves the target (the page keeps scrolling under a finger).
  box.addEventListener('pointerdown', (e) => {
    const p = local(e);
    aimAt(p.x, p.y);
    hover = e.pointerType !== 'touch';
    autoAt = performance.now() + 1200;
  });
  box.addEventListener('pointerleave', () => {
    hover = false;
    autoAt = performance.now();
    if (hint) hint.textContent = t('Kutunun içinde bir yeri göster');
  });

  for (const key of ['pull', 'damping'] as const) {
    inputs[key]?.addEventListener('input', () => {
      k[key] = Number(inputs[key]!.value);
      sync();
    });
  }
  for (const btn of $$('[data-pgp]', root)) {
    btn.addEventListener('click', () => {
      const p = PRESETS.find((x) => x.key === btn.dataset.pgp);
      if (!p) return;
      k.pull = p.pull;
      k.damping = p.damping;
      sync();
      // Jump the target so the new feel shows at once.
      autoAt = 0;
      hover = false;
    });
  }
  sync();
  // First paint before it ever runs: the cursor resting beside its target (the graph comes from the server).
  aimAt(box.clientWidth * 0.62, box.clientHeight * 0.44);
  Object.assign(b, { x: target.x + 12, y: target.y + 10 });
  place();
}

$$('[data-play]').forEach(playground);

/* ---------------- quote a sentence ---------------- */

let selBar: HTMLDivElement | null = null;
let selText = '';

function hideBar(): void {
  selBar?.remove();
  selBar = null;
}

function fragment(text: string): string {
  const words = text.split(/\s+/);
  const enc = (s: string) => encodeURIComponent(s).replace(/-/g, '%2D');
  if (words.length <= 8) return `#:~:text=${enc(text)}`;
  return `#:~:text=${enc(words.slice(0, 4).join(' '))},${enc(words.slice(-4).join(' '))}`;
}

function showBar(range: Range): void {
  if (!body) return;
  hideBar();
  const r = range.getBoundingClientRect();
  const bb = body.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'selbar';
  el.setAttribute('role', 'toolbar');
  el.setAttribute('aria-label', t('Seçili metin'));
  const mk = (label: string, make: () => string) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.addEventListener('pointerdown', (e) => e.preventDefault());
    btn.addEventListener('click', async () => {
      btn.textContent = (await copy(make())) ? t('Kopyalandı') : t('Kopyalanamadı');
      window.setTimeout(hideBar, 1200);
    });
    return btn;
  };
  el.append(
    mk(t('Alıntıyı kopyala'), () => `“${selText}” ${data.url}`),
    mk(t('Bağlantıyı kopyala'), () => data.url + fragment(selText)),
  );
  body.append(el);
  selBar = el;
  const x = Math.max(90, Math.min(bb.width - 90, r.left + r.width / 2 - bb.left));
  el.style.left = `${x.toFixed(0)}px`;
  el.style.top = `${(r.top - bb.top - 12).toFixed(0)}px`;
}

let selTimer = 0;
document.addEventListener('selectionchange', () => {
  window.clearTimeout(selTimer);
  selTimer = window.setTimeout(() => {
    const s = getSelection();
    const text = s ? String(s).trim().replace(/\s+/g, ' ') : '';
    if (!s || s.isCollapsed || !body || !s.anchorNode || !body.contains(s.anchorNode) || text.length < 3 || text.length > 400) {
      if (selBar && !selBar.contains(document.activeElement)) hideBar();
      return;
    }
    if (s.anchorNode.parentElement?.closest('.selbar,.play,figure.code')) return;
    selText = text;
    showBar(s.getRangeAt(0));
    if (crew?.current === 'art') crew.once('sel', data.who, t('güzel seçim'), 1600);
  }, 180);
});

/* ---------------- the team ---------------- */

const hasPlay = !!$('[data-play]');
crew?.addScenes({
  hero: async (c, signal) => {
    await c.sleep(3200, signal);
    c.once('h1', data.who, t('bunu ben yazdım'), 2200);
    if (!hasPlay) return;
    await c.sleep(3400, signal);
    const other: Name = data.who === 'motion' ? 'design' : 'motion';
    c.once('h2', other, t('oyun alanı en güzel kısmı'), 2400);
  },
  art: async (c, signal) => {
    if (heads[active]) c.aim(data.who, { el: heads[active], end: true, dx: 18, dy: -6, rest: true });
    await c.sleep(1600, signal);
    c.once('a1', data.who, t('alıntılamak için bir cümle seç'), 2600);
  },
});
if (art) queue();
