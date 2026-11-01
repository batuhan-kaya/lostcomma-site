/**
 * Where a visit is from. An IP database when GEOIP_DB points at one (DB-IP Lite · MaxMind format ·
 * gives the city) · else the country of the browser's time zone. The address itself is never stored.
 */
import { existsSync } from 'node:fs';
import { ZONES } from './zones';

export interface Place {
  country: string;
  city: string;
}

export type GeoLookup = (ip: string) => Place | null;

export function countryOfZone(tz: string): string {
  return ZONES[tz] ?? '';
}

/** Opens the IP database once. Missing or broken: null (the time zone does the job). */
export async function openGeo(path: string | undefined, warn: (msg: string) => void = () => {}): Promise<GeoLookup | null> {
  if (!path) return null;
  if (!existsSync(path)) {
    warn(`GEOIP_DB not found: ${path}`);
    return null;
  }
  try {
    const { open } = await import('maxmind');
    const reader = await open<import('maxmind').CityResponse>(path);
    return (ip) => {
      try {
        const r = reader.get(ip);
        if (!r) return null;
        return { country: (r.country?.iso_code ?? '').toUpperCase(), city: (r.city?.names as Record<string, string> | undefined)?.en ?? '' };
      } catch {
        return null;
      }
    };
  } catch (err) {
    warn(`GEOIP_DB could not be read: ${String(err)}`);
    return null;
  }
}

export function placeOf(geo: GeoLookup | null, ip: string, tz: string): Place {
  const hit = geo?.(ip);
  if (hit && hit.country) return { country: hit.country.slice(0, 2).toUpperCase(), city: hit.city.slice(0, 80) };
  return { country: countryOfZone(tz), city: '' };
}
