import type { AnyPage } from '../page';
import type { RouteId } from '../routes';
import { casePage } from './case';
import { homePage } from './home';
import { labPage } from './lab';
import { notePage } from './note';
import { notesPage } from './notes';
import { processPage } from './process';
import { servicePage } from './service';
import { servicesPage } from './services';
import { studioPage } from './studio';
import * as stubs from './stub';
import { workPage } from './work';

/** Static pages served straight from the route table. Param routes register their own handlers. */
export const STATIC_PAGES: Partial<Record<RouteId, AnyPage>> = {
  home: homePage(),
  work: workPage,
  services: servicesPage,
  process: processPage,
  studio: studioPage,
  notes: notesPage,
  lab: labPage,
  start: stubs.start,
  now: stubs.now,
  uses: stubs.uses,
};

/** Pages on a route with params. load() finds the content · null is a 404. */
export const PARAM_PAGES: Partial<Record<RouteId, AnyPage>> = {
  case: casePage,
  service: servicePage,
  note: notePage,
};

export { notFound } from './notFound';
export { homePage } from './home';
