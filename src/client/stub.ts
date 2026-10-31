/** Placeholder pages (phase 0 stubs): one quiet line from the host in the hero. */
import { getCrew } from './lib/crew';
import { t } from './lib/t';

getCrew()?.addScenes({
  hero: async (crew, signal) => {
    await crew.sleep(3200, signal);
    const host = crew.hostOf('next');
    crew.once('stub', host, t('Burası yapım aşamasında'), 2600);
  },
});
