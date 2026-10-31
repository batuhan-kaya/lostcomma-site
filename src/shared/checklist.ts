/**
 * The "twelve things" checklist on every service page: how big a project the ticks sound like.
 * 0 small · 1 medium · 2 large. Motion counts differently: any film work makes it a film and
 * ten ticks or more make it a system. Shared by the server (first paint) and the client.
 */
export type ServiceKey = 'web' | 'app' | 'identity' | 'motion';
export type Tier = 0 | 1 | 2;

/** Motion: logo animation · brand film · social loops · storyboards · sound. */
const FILM = [4, 5, 6, 7, 8];

export function tierOf(key: ServiceKey, ticks: readonly boolean[]): Tier {
  const n = ticks.filter(Boolean).length;
  if (key === 'motion') return n >= 10 ? 2 : FILM.some((i) => ticks[i]) ? 1 : 0;
  return n <= 4 ? 0 : n <= 9 ? 1 : 2;
}
