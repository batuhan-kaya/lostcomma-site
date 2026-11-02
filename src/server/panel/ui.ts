/**
 * Panel markup: the page shell (side menu · header · flash) and small form parts. Turkish only.
 * Every panel class starts with p- so nothing clashes with the site's own CSS (app.css loads too
 * for fonts · tokens · base type).
 */
import type { Assets } from '../assets';
import { html, raw, type Safe, type Value } from '../html';

export type Errors = Record<string, string>;
export type Lang2 = 'tr' | 'en';

export interface Counts {
  briefs: number;
  calls: number;
  mail: number;
}

export interface Shell {
  title: string;
  /** Menu item to mark (projects · notes · …). */
  section: string;
  body: Safe;
  crumbs?: { label: string; href?: string }[];
  actions?: Safe;
  flash?: string | null;
  /** Extra page CSS (the note preview uses the site's note styles). */
  styles?: string[];
  counts: Counts;
  csrf: string;
  wide?: boolean;
}

const NAV: ({ key: string; label: string; href: string; count?: keyof Counts } | null)[] = [
  { key: 'home', label: 'Pano', href: '/panel' },
  { key: 'stats', label: 'İstatistik', href: '/panel/stats' },
  null,
  { key: 'projects', label: 'İşler', href: '/panel/projects' },
  { key: 'notes', label: 'Notlar', href: '/panel/notes' },
  { key: 'media', label: 'Görseller', href: '/panel/media' },
  { key: 'people', label: 'Ekip', href: '/panel/people' },
  null,
  { key: 'briefs', label: 'Gelen kutusu', href: '/panel/briefs', count: 'briefs' },
  { key: 'bookings', label: 'Görüşmeler', href: '/panel/bookings', count: 'calls' },
  { key: 'mail', label: 'E-postalar', href: '/panel/mail', count: 'mail' },
  null,
  { key: 'settings', label: 'Site ayarları', href: '/panel/settings' },
  { key: 'redirects', label: 'Yönlendirmeler', href: '/panel/redirects' },
  { key: 'log', label: 'Kayıt', href: '/panel/log' },
  { key: 'account', label: 'Hesap', href: '/panel/account' },
];

export const FLASH: Record<string, string> = {
  saved: 'Kaydedildi.',
  created: 'Oluşturuldu.',
  deleted: 'Silindi.',
  restored: 'Eski hali geri geldi.',
  uploaded: 'Yüklendi.',
  cancelled: 'Görüşme iptal edildi.',
  retried: 'Tekrar deneniyor.',
  test: 'Deneme e-postası sıraya girdi.',
  others: 'Diğer bütün oturumlar kapandı.',
  ended: 'Oturum kapandı.',
  password: 'Şifre değişti. Diğer oturumlar kapandı.',
  'totp-on': 'İki adımlı doğrulama açık.',
  'totp-off': 'İki adımlı doğrulama kapandı.',
  closure: 'Kapalı zaman eklendi.',
  'closure-gone': 'Kapalı zaman kaldırıldı.',
  redirect: 'Yönlendirme eklendi.',
  'redirect-gone': 'Yönlendirme kaldırıldı.',
};

function navList(section: string, counts: Counts): Safe {
  return html`<ul class="p-nav">${NAV.map((n) =>
    n === null
      ? html`<li class="p-sep" aria-hidden="true"></li>`
      : html`<li><a href="${n.href}"${n.key === section ? html` aria-current="page"` : ''}><span>${n.label}</span>${n.count && counts[n.count] ? html`<b class="p-count" aria-label="${counts[n.count]} yeni">${counts[n.count]}</b>` : ''}</a></li>`,
  )}</ul>`;
}

export function shell(assets: Assets, s: Shell): string {
  const css = ['app', 'panel', ...(s.styles ?? [])].map((n) => assets.css(n)).filter(Boolean);
  const js = assets.js('panel', 'tr');
  return `<!doctype html>${html`<html lang="tr" class="th-paper" data-page="panel">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="same-origin">
<title>${s.title} · Panel · Lost Comma</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
${css.map((c) => html`<link rel="stylesheet" href="${c}">`)}
${js ? html`<script type="module" src="${js}"></script>` : ''}
</head>
<body class="p" data-csrf="${s.csrf}">
<a class="p-skip" href="#main">İçeriğe geç</a>
<div class="p-shell">
<header class="p-side">
<a class="p-logo" href="/panel"><span>lost</span><i aria-hidden="true">|</i><span>comma</span><small class="mono">panel</small></a>
<details class="p-menu"><summary class="mono">Menü</summary><nav aria-label="Panel">${navList(s.section, s.counts)}</nav></details>
<nav class="p-navd" aria-label="Panel">${navList(s.section, s.counts)}</nav>
<div class="p-sidefoot">
<a class="mono" href="/tr" target="_blank" rel="noopener">Siteyi aç <span aria-hidden="true">↗</span></a>
<form method="post" action="/panel/logout"><input type="hidden" name="_csrf" value="${s.csrf}"><button class="p-link mono" type="submit">Çıkış</button></form>
</div>
</header>
<main id="main" class="p-main${s.wide ? ' wide' : ''}" tabindex="-1">
<div class="p-head">
${s.crumbs?.length ? html`<p class="p-crumbs mono">${s.crumbs.map((c, i) => html`${i ? html`<span aria-hidden="true">/</span>` : ''}${c.href ? html`<a href="${c.href}">${c.label}</a>` : html`<span>${c.label}</span>`}`)}</p>` : ''}
<div class="p-titlebar"><h1>${s.title}</h1>${s.actions ? html`<div class="p-actions">${s.actions}</div>` : ''}</div>
</div>
${s.flash ? html`<p class="p-flash" role="status" data-flash>${s.flash}</p>` : ''}
${s.body}
</main>
</div>
</body>
</html>`.value}`;
}

/** A bare page (sign in). */
export function bare(assets: Assets, title: string, body: Safe): string {
  const css = ['app', 'panel'].map((n) => assets.css(n)).filter(Boolean);
  const js = assets.js('panel', 'tr');
  return `<!doctype html>${html`<html lang="tr" class="th-paper" data-page="panel">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title} · Panel · Lost Comma</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
${css.map((c) => html`<link rel="stylesheet" href="${c}">`)}
${js ? html`<script type="module" src="${js}"></script>` : ''}
</head>
<body class="p p-bare"><main id="main" class="p-gate">${body}</main></body>
</html>`.value}`;
}

/* ---------------- form parts ---------------- */

export const csrfField = (csrf: string) => html`<input type="hidden" name="_csrf" value="${csrf}">`;

interface FieldOpts {
  type?: string;
  hint?: string | Safe;
  error?: string;
  required?: boolean;
  attrs?: Safe;
  /** Turns the comma check on for this field (data-lint). */
  copy?: boolean;
  wide?: boolean;
  id?: string;
}

const idOf = (name: string) => `f-${name.replace(/[^a-z0-9]+/gi, '-')}`;

function wrap(name: string, label: Value, control: Safe, o: FieldOpts): Safe {
  const id = o.id ?? idOf(name);
  return html`<div class="p-field${o.error ? ' bad' : ''}${o.wide ? ' wide' : ''}">
<label for="${id}">${label}${o.required ? html`<span class="p-req" aria-hidden="true">*</span>` : ''}</label>
${control}
${o.hint ? html`<p class="p-hint" id="${id}-h">${o.hint}</p>` : ''}
${o.error ? html`<p class="p-err" id="${id}-e">${o.error}</p>` : ''}
</div>`;
}

function described(name: string, o: FieldOpts): Safe {
  const id = o.id ?? idOf(name);
  const ids = [o.hint ? `${id}-h` : '', o.error ? `${id}-e` : ''].filter(Boolean).join(' ');
  return html`${ids ? html` aria-describedby="${ids}"` : ''}${o.error ? html` aria-invalid="true"` : ''}${o.required ? html` required` : ''}${o.copy ? html` data-lint` : ''}`;
}

export function input(name: string, label: Value, value: string | number | null | undefined, o: FieldOpts = {}): Safe {
  const id = o.id ?? idOf(name);
  return wrap(name, label, html`<input class="p-in" id="${id}" name="${name}" type="${o.type ?? 'text'}" value="${value ?? ''}"${described(name, o)}${o.attrs ?? ''}>`, o);
}

export function area(name: string, label: Value, value: string | null | undefined, o: FieldOpts & { rows?: number } = {}): Safe {
  const id = o.id ?? idOf(name);
  return wrap(name, label, html`<textarea class="p-in" id="${id}" name="${name}" rows="${o.rows ?? 3}"${described(name, o)}${o.attrs ?? ''}>${value ?? ''}</textarea>`, o);
}

export function select(name: string, label: Value, value: string | number | null | undefined, options: { value: string | number; label: string; disabled?: boolean }[], o: FieldOpts = {}): Safe {
  const id = o.id ?? idOf(name);
  const v = value === null || value === undefined ? '' : String(value);
  return wrap(
    name,
    label,
    html`<select class="p-in" id="${id}" name="${name}"${described(name, o)}${o.attrs ?? ''}>${options.map((x) => html`<option value="${x.value}"${String(x.value) === v ? html` selected` : ''}${x.disabled ? html` disabled` : ''}>${x.label}</option>`)}</select>`,
    o,
  );
}

export function checks(name: string, label: string, values: string[], options: { value: string; label: string }[], o: { hint?: string; error?: string } = {}): Safe {
  return html`<fieldset class="p-field p-checks${o.error ? ' bad' : ''}"><legend>${label}</legend><div>${options.map(
    (x) => html`<label class="p-chip"><input type="checkbox" name="${name}" value="${x.value}"${values.includes(x.value) ? html` checked` : ''}><span>${x.label}</span></label>`,
  )}</div>${o.hint ? html`<p class="p-hint">${o.hint}</p>` : ''}${o.error ? html`<p class="p-err">${o.error}</p>` : ''}</fieldset>`;
}

export function toggle(name: string, label: string, on: boolean, hint?: string): Safe {
  return html`<label class="p-toggle"><input type="checkbox" name="${name}" value="1"${on ? html` checked` : ''}><span>${label}</span>${hint ? html`<small>${hint}</small>` : ''}</label>`;
}

/** The same field in both languages side by side. Names end in _tr and _en. */
export function pair(base: string, label: string, values: Partial<Record<Lang2, string | null>>, errors: Errors, o: FieldOpts & { area?: boolean; rows?: number } = {}): Safe {
  const one = (l: Lang2) => {
    const name = `${base}_${l}`;
    const lab = html`${label} <span class="p-lang">${l.toUpperCase()}</span>`;
    const opts = { ...o, error: errors[name], hint: l === 'tr' ? o.hint : undefined };
    return o.area ? area(name, lab, values[l], { ...opts, attrs: html`${o.attrs ?? ''} lang="${l}"` }) : input(name, lab, values[l], { ...opts, attrs: html`${o.attrs ?? ''} lang="${l}"` });
  };
  return html`<div class="p-pair">${one('tr')}${one('en')}</div>`;
}

export function errorSummary(errors: Errors, extra?: string | null): Safe {
  const list = Object.entries(errors);
  if (!list.length && !extra) return html``;
  return html`<div class="p-errors" role="alert" tabindex="-1" data-errors>
<b>${list.length ? `Kaydedilmedi · ${list.length} alanda sorun var` : 'Kaydedilmedi'}</b>
${extra ? html`<p>${extra}</p>` : ''}
${list.length ? html`<ul>${list.map(([k, v]) => html`<li><a href="#${idOf(k)}">${v}</a></li>`)}</ul>` : ''}
</div>`;
}

export function saveBar(label = 'Kaydet', extra?: Safe): Safe {
  return html`<div class="p-savebar"><span class="p-dirty mono" data-dirty hidden>Kaydedilmemiş değişiklik var</span>${extra ?? ''}<button class="p-btn" type="submit">${label}</button><kbd class="mono" aria-hidden="true">⌘S</kbd></div>`;
}

/** A small form with one button that asks before it acts (data-confirm). */
export function actionForm(action: string, label: string, csrf: string, o: { confirm?: string; danger?: boolean; fields?: Safe; ghost?: boolean } = {}): Safe {
  return html`<form class="p-inline" method="post" action="${action}"${o.confirm ? html` data-confirm="${o.confirm}"` : ''}>${csrfField(csrf)}${o.fields ?? ''}<button class="p-btn${o.danger ? ' danger' : ''}${o.ghost ? ' ghost' : ''}" type="submit">${label}</button></form>`;
}

export function section(title: string | Safe, body: Safe, o: { id?: string; hint?: string | Safe; aside?: Safe } = {}): Safe {
  return html`<section class="p-sec"${o.id ? html` id="${o.id}"` : ''}><div class="p-sech"><h2>${title}</h2>${o.aside ?? ''}</div>${o.hint ? html`<p class="p-hint">${o.hint}</p>` : ''}${body}</section>`;
}

export function empty(text: string, action?: Safe): Safe {
  return html`<div class="p-empty"><p>${text}</p>${action ?? ''}</div>`;
}

export const badge = (text: string, tone: 'ok' | 'warn' | 'bad' | 'mute' | 'acc' = 'mute') => html`<span class="p-badge ${tone}">${text}</span>`;

/* ---------------- time ---------------- */

const TZ = 'Europe/Istanbul';
const parts = (d: Date, o: Intl.DateTimeFormatOptions) => Object.fromEntries(new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, ...o }).formatToParts(d).map((p) => [p.type, p.value]));

/** "3 Kas 2026 · 11:00" (Istanbul). */
export function when(d: Date | null | undefined, withTime = true): string {
  if (!d) return '—';
  const p = parts(d, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${p.day} ${p.month} ${p.year}${withTime ? ` · ${p.hour}:${p.minute}` : ''}`;
}

/** "3 dk önce" · "dün" · a date. */
export function ago(d: Date | null | undefined, now: Date): string {
  if (!d) return '—';
  const s = Math.round((now.getTime() - d.getTime()) / 1000);
  if (s < 0) return when(d);
  if (s < 60) return 'az önce';
  if (s < 3600) return `${Math.floor(s / 60)} dk önce`;
  if (s < 86_400) return `${Math.floor(s / 3600)} sa önce`;
  if (s < 2 * 86_400) return 'dün';
  if (s < 14 * 86_400) return `${Math.floor(s / 86_400)} gün önce`;
  return when(d, false);
}

export const timeTag = (d: Date | null | undefined, now: Date) => (d ? html`<time datetime="${d.toISOString()}" title="${when(d)}">${ago(d, now)}</time>` : html`—`);

/** A datetime-local value in Istanbul time ("2026-11-03T11:00"). */
export function istLocal(d: Date | null | undefined): string {
  if (!d) return '';
  const p = parts(d, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Back from a datetime-local value in Istanbul time (UTC+3 all year). */
export function fromIstLocal(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(`${v}:00+03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const plural = (n: number, word: string) => `${n} ${word}`;

export { raw };
