/** Homepage: the approved "Live" design. Each section's moment lives in its own module. */
import { getCrew } from './lib/crew';
import { Board } from './home/board';
import { Brief } from './home/brief';
import { Comma } from './home/comma';
import { Hero } from './home/hero';
import { Manifesto } from './home/manifesto';
import { Process } from './home/process';
import { Services } from './home/services';
import { readData } from './home/shared';
import { t } from './lib/t';

const data = readData();
const crew = getCrew();

const hero = new Hero(data, crew);
const manifesto = new Manifesto(crew);
const services = new Services(data);
const board = new Board(data);
const process = new Process();
const brief = new Brief(data, crew);
const root = document.querySelector<HTMLElement>('[data-root]');
if (root) new Comma(root, crew);

crew?.enableIdle();
crew?.addScenes({
  hero: hero.scene,
  mf: manifesto.scene,
  svc: services.scene,
  work: board.scene,
  prc: process.scene,
  ctc: brief.scene,
  ft: async (c, signal) => {
    await c.sleep(1500, signal);
    c.once('bye', c.hostOf('ft'), t('yine gel'), 2400);
  },
});
