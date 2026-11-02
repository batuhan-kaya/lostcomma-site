/**
 * Where a visit came from. The browser gives the full address of the previous page · we keep
 * only the site (without www) and the path · never the query (it can carry personal things).
 */

export interface Source {
  host: string;
  path: string;
}

/** Apps that open links as android-app://<package>/ */
const APPS: Record<string, string> = {
  'com.google.android.gm': 'mail.google.com',
  'com.google.android.googlequicksearchbox': 'google.com',
  'com.linkedin.android': 'linkedin.com',
  'com.instagram.android': 'instagram.com',
  'com.facebook.katana': 'facebook.com',
  'org.telegram.messenger': 'telegram.org',
  'com.whatsapp': 'whatsapp.com',
  'com.twitter.android': 'x.com',
  'com.slack': 'slack.com',
};

export function parseReferrer(ref: string, siteHost: string): Source | null {
  if (!ref) return null;
  const app = /^android-app:\/\/([\w.]+)/.exec(ref);
  if (app) return { host: APPS[app[1]!] ?? app[1]!, path: '' };
  let u: URL;
  try {
    u = new URL(ref);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  const host = u.host.toLowerCase().replace(/^www\./, '');
  // A page of our own: not a source.
  if (host === siteHost.toLowerCase().replace(/^www\./, '')) return null;
  const path = u.pathname === '/' ? '' : u.pathname.slice(0, 120);
  return { host: host.slice(0, 120), path };
}

/** Friendly names for the places people come from (the panel shows these). */
const NAMES: [RegExp, string][] = [
  [/(^|\.)google\.[a-z.]+$/, 'Google'],
  [/^mail\.google\.com$/, 'Gmail'],
  [/(^|\.)bing\.com$/, 'Bing'],
  [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo'],
  [/(^|\.)yandex\.[a-z.]+$/, 'Yandex'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)facebook\.com$|^fb\.me$/, 'Facebook'],
  [/^t\.co$|(^|\.)x\.com$|(^|\.)twitter\.com$/, 'X'],
  [/(^|\.)linkedin\.com$|^lnkd\.in$/, 'LinkedIn'],
  [/(^|\.)behance\.net$/, 'Behance'],
  [/(^|\.)dribbble\.com$/, 'Dribbble'],
  [/(^|\.)awwwards\.com$/, 'Awwwards'],
  [/(^|\.)github\.com$/, 'GitHub'],
  [/(^|\.)youtube\.com$|^youtu\.be$/, 'YouTube'],
  [/(^|\.)chatgpt\.com$|(^|\.)openai\.com$/, 'ChatGPT'],
  [/(^|\.)perplexity\.ai$/, 'Perplexity'],
  [/(^|\.)claude\.ai$/, 'Claude'],
  [/(^|\.)telegram\.org$|^t\.me$/, 'Telegram'],
  [/(^|\.)whatsapp\.com$|^wa\.me$/, 'WhatsApp'],
  [/(^|\.)slack\.com$/, 'Slack'],
];

export function sourceName(host: string): string {
  if (!host) return 'Doğrudan';
  for (const [re, name] of NAMES) if (re.test(host)) return name;
  return host;
}

/** utm_source · utm_medium · utm_campaign from a query string (the rest is dropped). */
export function utmOf(search: string): { source: string; medium: string; campaign: string } {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const v = (k: string) => (q.get(k) ?? '').trim().toLowerCase().slice(0, 60);
  return { source: v('utm_source'), medium: v('utm_medium'), campaign: v('utm_campaign') };
}
