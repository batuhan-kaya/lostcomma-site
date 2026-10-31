import type { Page } from '../page';
import type { RouteId } from '../routes';
import * as stubs from './stub';

/** Static pages served straight from the route table. Param routes register their own handlers. */
export const STATIC_PAGES: Partial<Record<RouteId, Page>> = {
  home: stubs.home,
  work: stubs.work,
  services: stubs.services,
  process: stubs.process,
  studio: stubs.studio,
  notes: stubs.notes,
  lab: stubs.lab,
  start: stubs.start,
  now: stubs.now,
  uses: stubs.uses,
};

export { notFound } from './notFound';
