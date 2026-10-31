/**
 * A service in detail. The shared parts live here (the twelve things checklist and its summary
 * bar · the hosts' lines). Each service brings its own hero and hood from ./service/<key>.ts.
 */
import { getCrew } from './lib/crew';
import { t } from './lib/t';
import { tierOf, type ServiceKey } from '../shared/checklist';
import { init as app } from './service/app';
import { init as identity } from './service/identity';
import { init as motion } from './service/motion';
import type { ServiceData } from './service/types';
import { init as web } from './service/web';

const $ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<E>(s);
const $$ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<E>(s)];

const data = JSON.parse(document.getElementById('page-data')?.textContent ?? '{}') as ServiceData;
const crew = getCrew();
const key = data.key as ServiceKey;

/* ---------------- twelve things ---------------- */

const boxes = $$<HTMLButtonElement>('[data-ck]');
function summary(): void {
  const ticks = boxes.map((b) => b.classList.contains('on'));
  const tier = tierOf(key, ticks);
  const picked = $('[data-picked]');
  const verdict = $('[data-verdict]');
  const weeks = $('[data-weeks]');
  if (picked) picked.textContent = String(ticks.filter(Boolean).length);
  if (verdict) verdict.textContent = data.verdict?.[tier] ?? '';
  if (weeks) weeks.textContent = data.weeks?.[tier] ?? '';
}
for (const b of boxes) {
  b.addEventListener('click', () => {
    const on = !b.classList.contains('on');
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
    summary();
  });
}

/* ---------------- the hosts' lines below the hero ---------------- */

const LINES: Record<ServiceKey, string> = {
  web: t('birkaçını işaretle. dinliyoruz'),
  app: t('uygulamanın neye ihtiyacı varsa işaretle'),
  identity: t('markanın neye ihtiyacı varsa işaretle'),
  motion: t('tek bir düğme ya da koca bir film'),
};
crew?.addScenes({
  get: async (c, signal) => {
    await c.sleep(1200, signal);
    c.once('g1', c.hostOf('get'), LINES[key], 2400);
  },
});

/* ---------------- this service's hero and hood ---------------- */

// All four are bundled (a few kb each): the hero scene has to be registered before the crew
// starts on DOMContentLoaded and a lazy chunk could arrive after that.
const INIT: Record<ServiceKey, (d: ServiceData) => void> = { web, app, identity, motion };
INIT[key]?.(data);
