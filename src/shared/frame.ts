/**
 * Websites hero: the resizable frame. The little site is drawn at its real width (min to max)
 * and scaled to fit the room (k = room / max). The server, the CSS first state and the client
 * all start at `start` · a unit test keeps service.css on the same numbers.
 */
export const FRAME = { min: 340, max: 1360, start: 1280 } as const;
