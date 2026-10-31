/**
 * 404 · the map. Hovering or focusing a star draws the way from the lost comma to it (on the same
 * spring as the cursors) and the box on the left says which page it is and how many letters away.
 * Leaving the map goes back to the closest page. ⌘Z / Ctrl+Z: the team tries to undo. It never existed.
 */
import { getCrew } from './lib/crew';
import { reducedMotion } from './lib/motion';
import { t } from './lib/t';
import { PRESETS, step, type Body } from '../shared/spring';

const $ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<E>(s);

const map = $<SVGSVGElement>('[data-map]');
const route = $<SVGPathElement>('[data-route]');
const you = $<SVGGElement>('[data-you-at]');
const nodes = [...document.querySelectorAll<SVGAElement>('[data-node]')];
const rk = $('[data-rk]');
const rname = $<HTMLAnchorElement>('[data-rname]');
const rlabel = $('[data-rlabel]');
const rd = $('[data-rd]');
const crew = getCrew();

const lettersAway = (d: number) => (d === 0 ? t('Sadece dili farklı') : d === 1 ? t('1 harf uzakta') : t('{n} harf uzakta', { n: d }));

if (map && route && you && rname && rlabel && rk && rd) {
  const from = { x: Number(you.dataset.x), y: Number(you.dataset.y) };
  const home = nodes.find((n) => n.classList.contains('on')) ?? nodes[0]!;
  const first = { kick: rk.textContent ?? '', label: rlabel.textContent ?? '', href: rname.getAttribute('href') ?? '', dist: rd.textContent ?? '', lang: rlabel.getAttribute('lang') };
  const SPRING = { damping: PRESETS[0]!.damping, pull: PRESETS[0]!.pull, maxSpeed: 40, arriveDist: 0.05, arriveSpeed: 0.02 };
  const tip: Body = { x: Number(home.dataset.x), y: Number(home.dataset.y), vx: 0, vy: 0 };
  let goal = { x: tip.x, y: tip.y };
  let raf = 0;
  let current: SVGAElement = home;

  const draw = () => route.setAttribute('d', `M${from.x} ${from.y}L${tip.x.toFixed(2)} ${tip.y.toFixed(2)}`);
  const tick = () => {
    if (step(tip, goal.x, goal.y, SPRING)) {
      Object.assign(tip, { x: goal.x, y: goal.y, vx: 0, vy: 0 });
      raf = 0;
    } else raf = requestAnimationFrame(tick);
    draw();
  };

  const show = (n: SVGAElement) => {
    if (n === current) return;
    current.classList.remove('peek');
    current = n;
    if (n !== home) n.classList.add('peek');
    goal = { x: Number(n.dataset.x), y: Number(n.dataset.y) };
    if (reducedMotion()) {
      tip.x = goal.x;
      tip.y = goal.y;
      draw();
    } else if (!raf) raf = requestAnimationFrame(tick);
    if (n === home) {
      rk.textContent = first.kick;
      rlabel.textContent = first.label;
      if (first.lang) rlabel.setAttribute('lang', first.lang);
      else rlabel.removeAttribute('lang');
      rname.setAttribute('href', first.href);
      rd.textContent = first.dist;
      return;
    }
    const text = n.querySelector('text');
    rk.textContent = t('Bu sayfa');
    rlabel.textContent = text?.textContent ?? '';
    const lang = text?.getAttribute('lang');
    if (lang) rlabel.setAttribute('lang', lang);
    else rlabel.removeAttribute('lang');
    rname.setAttribute('href', n.getAttribute('href') ?? '/');
    rd.textContent = lettersAway(Number(n.dataset.d));
  };

  for (const n of nodes) {
    n.addEventListener('pointerenter', () => show(n));
    n.addEventListener('focus', () => show(n));
    n.addEventListener('blur', () => show(home));
  }
  map.addEventListener('pointerleave', () => show(home));

  /* ⌘Z · Ctrl+Z: the team tries */
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'z' || !(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (crew) crew.say('code', t('geri alamıyoruz · hiç var olmadı'), 2600);
    const h1 = $('.ttl');
    h1?.classList.remove('nope');
    void h1?.getBoundingClientRect();
    h1?.classList.add('nope');
  });

  /* the team: design points at the closest page */
  let busy = false;
  map.addEventListener('pointerdown', () => (busy = true));
  crew?.addScenes({
    hero: async (c, signal) => {
      await c.sleep(1800, signal);
      if (busy) return;
      const dot = home.querySelector('.dot');
      if (!dot || home === nodes[0]) {
        c.once('n0', 'motion', t('biz de sık kayboluruz'), 2600);
        return;
      }
      await c.go('design', { el: dot, fx: 0.5, fy: 0.5 }, signal);
      c.once('n1', 'design', t('bunu mu arıyordun'), 2600);
      await c.sleep(3200, signal);
      c.home('design');
    },
  });
}
