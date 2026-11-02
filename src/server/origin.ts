/**
 * Same-site posts only: the brief · bookings · statistics and the panel refuse a POST whose Origin
 * is another site (browsers always send Origin on POST). The site's own host is always allowed.
 *
 * EXTRA_ORIGINS adds hosts for a preview behind a proxy that rewrites Origin: GitHub Codespaces
 * sends http://localhost:3000 for every request (scripts/preview.mjs sets it there). Empty in
 * production.
 */
export function originHosts(siteUrl: string, extra = ''): Set<string> {
  const hosts = new Set([new URL(siteUrl).host]);
  for (const h of extra.split(/[\s,]+/)) if (h.trim()) hosts.add(h.trim().toLowerCase());
  return hosts;
}

/** True when the request may come from here: no Origin header · or one of our hosts. */
export function fromHere(origin: string | undefined, hosts: Set<string>): boolean {
  if (!origin) return true;
  try {
    return hosts.has(new URL(origin).host.toLowerCase());
  } catch {
    return false;
  }
}
