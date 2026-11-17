/**
 * 03 · Services: what plays inside the service frame. Five real looking products, each one telling
 * a short story on a loop (styles/pages/_frames.css):
 *
 *   website    Lodos · a sailing club. Hero · the fleet · a visitor books Sunday 10:00 · the footer
 *   app        Pocket · a wallet on iOS. Send ₺250 to Ece · a receipt · the list and the balance update
 *   identity   Clay · a ceramics studio's brand book. Mark · colour · type · in use
 *   motion     a motion editor playing our own logo sting · the playhead runs the timeline
 *   automation a workflow builder · a booking runs through calendar · payment · mail and chat
 *
 * Pure markup we wrote ourselves (raw) · always inside an aria-hidden container. The mock products'
 * copy stays in English like a client's real product would · no commas (the brand rule holds
 * everywhere on the page). Every loop moves transform and opacity only · only the frame on show
 * plays · reduced motion shows each one as a composed still. Lodos and Pocket take optional photos
 * (pictures.ts): without one the drawing or the initials stay.
 */
import { raw, type Safe } from '../../html';
import { MARK } from '../../../shared/logo';
import { noPictures, type Pic, type PictureName } from './pictures';

/* ---------------- small drawings ---------------- */

const ico = (d: string, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true"${extra}>${d}</svg>`;
const I = {
  arrowUp: ico('<path d="M7 17L17 7M9 7h8v8"/>'),
  arrowDown: ico('<path d="M17 7L7 17M15 17H7V9"/>'),
  plus: ico('<path d="M12 5v14M5 12h14"/>'),
  card: ico('<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M3 10h18M7 15h3"/>'),
  bell: ico('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
  home: ico('<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>'),
  chart: ico('<path d="M5 20V10M12 20V4M19 20v-7"/>'),
  user: ico('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
  users: ico('<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20c1-3.6 3.4-5.5 6.5-5.5s5.5 1.9 6.5 5.5"/><path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M18 14.8c1.7.7 2.9 2.4 3.5 5.2"/>'),
  back: ico('<path d="M15 5l-7 7 7 7"/>'),
  arrowL: ico('<path d="M20 12H5M11 5.5L4.5 12l6.5 6.5"/>'),
  next: ico('<path d="M9 5l7 7-7 7"/>'),
  down: ico('<path d="M6 9l6 6 6-6"/>'),
  search: ico('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>'),
  check: ico('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  globe: ico('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.2 3.8 8.5s-1.2 6.1-3.8 8.5c-2.6-2.4-3.8-5.2-3.8-8.5s1.2-6.1 3.8-8.5z"/>'),
  cal: ico('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  pay: ico('<rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 10h19"/><circle cx="16.5" cy="14.5" r="1.4"/>'),
  branch: ico('<path d="M12 3l9 9-9 9-9-9z"/>'),
  mail: ico('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3.5 7l8.5 6.5L20.5 7"/>'),
  chat: ico('<path d="M4 5h16v11H9l-5 4z"/><path d="M8.5 9.5h7M8.5 12.5h4"/>'),
  db: ico('<ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>'),
  clock: ico('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  play: ico('<path d="M8 5l11 7-11 7z"/>'),
  bolt: ico('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
  heart: ico('<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>'),
  star: ico('<path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>'),
  ruler: ico('<path d="M3 15.5L15.5 3 21 8.5 8.5 21z"/><path d="M7 11.5l2 2M10 8.5l1.5 1.5M13 5.5l2 2"/>'),
  pin: ico('<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
  sail: ico('<path d="M12 3v14M12 3l7 14h-7M10 6.5L5 17h5"/><path d="M3.5 19.5h17l-1.5 2h-14z"/>'),
  eye: ico('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  scan: ico('<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M4 12h16"/>'),
  bank: ico('<path d="M3.5 9.5L12 4l8.5 5.5zM5.5 10v7.5M10 10v7.5M14 10v7.5M18.5 10v7.5M3.5 20h17"/>'),
  coffee: ico('<path d="M5 9h11v5.5A4.5 4.5 0 0 1 11.5 19h-2A4.5 4.5 0 0 1 5 14.5z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8.5 3.5c-.8 1 .8 2 0 3M12 3.5c-.8 1 .8 2 0 3"/>'),
  ferry: ico('<path d="M3 15.5h18l-2.2 4H5.2z"/><path d="M6 15.5V11h12v4.5M9 11V8h6v3M12 8V5"/>'),
  dots: ico('<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>'),
  share: ico('<path d="M12 15V3.5M7.5 8L12 3.5 16.5 8"/><path d="M5 12.5v6A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-6"/>'),
  pencil: ico('<path d="M4 20l1-4.5L15.5 5a2 2 0 0 1 3 0l.5.5a2 2 0 0 1 0 3L8.5 19z"/><path d="M13.5 7l3.5 3.5"/>'),
  wave: ico('<path d="M8.5 8.5a5 5 0 0 1 0 7M12 6a8.5 8.5 0 0 1 0 12M15.5 3.5a12 12 0 0 1 0 17"/>'),
  camera: ico('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17" cy="7" r=".8"/>'),
  film: ico('<rect x="3" y="5.5" width="18" height="13" rx="3.5"/><path d="M10.5 9.5l4 2.5-4 2.5z"/>'),
};

/** The pointer a visitor moves around a mock (never a team cursor: those are the crew's). */
const POINTER = `<svg viewBox="0 0 24 24"><path d="M3 2 L3 19.5 L7.8 15.2 L11 22 L14.2 20.6 L11.1 13.9 L17.6 13.7 Z"/></svg>`;

/** A photo when its slot has one (pictures.ts) · else nothing and the drawing under it shows. */
const photo = (src: string | undefined) => (src ? `<img src="${src}" alt="" decoding="async" loading="lazy" draggable="false">` : '');

/** A person: their photo · else their initials on their own colour. */
const face = (pic: Pic, who: string, initials: string, cls = '') => {
  const src = pic(('app-' + who) as PictureName);
  return `<i class="fce p-${who}${cls ? ' ' + cls : ''}">${src ? photo(src) : initials || I.user}</i>`;
};

/* ---------------- website · Lodos ---------------- */

/** A sailing boat seen against the light: mast at x · waterline at y · h tall (mainsail and jib). */
function silhouette(x: number, y: number, h: number, rim = true): string {
  const w = h * 0.46;
  const main = `M${x + 1.5} ${y - h} Q${x + w * 0.62} ${y - h * 0.5} ${x + w} ${y - h * 0.06} L${x + 1.5} ${y - h * 0.06} Z`;
  const jib = `M${x - 1.5} ${y - h * 0.86} L${x - 1.5} ${y - h * 0.06} L${x - w * 0.62} ${y - h * 0.06} Z`;
  const hull = `M${x - w * 0.86} ${y - h * 0.03} L${x + w * 1.08} ${y - h * 0.03} L${x + w * 0.92} ${y + h * 0.07} L${x - w * 0.66} ${y + h * 0.07} Z`;
  const edge = rim ? `<path d="M${x + 1.5} ${y - h} Q${x + w * 0.62} ${y - h * 0.5} ${x + w} ${y - h * 0.06}" fill="none" stroke="#FFCF98" stroke-width="1.3" opacity=".85"/>` : '';
  return `<path d="${jib}" opacity=".9"/><path d="${main}"/><path d="${hull}"/>${edge}`;
}

/** A mosque on the far shore: a dome on its drum · two half domes · two minarets. */
function mosque(x: number, y: number, r: number): string {
  const min = (m: number) =>
    `<rect x="${m - r * 0.12}" y="${y - r * 3.1}" width="${r * 0.24}" height="${r * 3.1}"/><rect x="${m - r * 0.2}" y="${y - r * 2.3}" width="${r * 0.4}" height="${r * 0.16}"/><path d="M${m - r * 0.12} ${y - r * 3.1}L${m} ${y - r * 3.75}L${m + r * 0.12} ${y - r * 3.1}Z"/>`;
  return (
    `<rect x="${x - r * 2.2}" y="${y - r * 0.6}" width="${r * 4.4}" height="${r * 0.6}"/>` +
    `<rect x="${x - r * 0.95}" y="${y - r * 1}" width="${r * 1.9}" height="${r * 0.42}"/>` +
    `<path d="M${x - r} ${y - r}A${r} ${r} 0 0 1 ${x + r} ${y - r}Z"/>` +
    `<path d="M${x - r * 2.05} ${y - r * 0.58}A${r * 0.55} ${r * 0.55} 0 0 1 ${x - r * 0.95} ${y - r * 0.58}ZM${x + r * 0.95} ${y - r * 0.58}A${r * 0.55} ${r * 0.55} 0 0 1 ${x + r * 2.05} ${y - r * 0.58}Z"/>` +
    `<rect x="${x - 0.6}" y="${y - r * 2.35}" width="1.2" height="${r * 0.4}"/>` +
    min(x - r * 2.7) +
    min(x + r * 2.7)
  );
}

/** The sun path on the water: short strokes that thin out toward us. */
const GLINT = [
  [298, 54], [303, 40], [308, 62], [314, 30], [320, 48], [327, 22], [334, 40], [342, 18], [351, 30], [361, 14], [372, 22], [384, 10],
]
  .map(([y, w], i) => `<rect x="${528 - w! / 2 + (i % 2 ? 6 : -5)}" y="${y}" width="${w}" height="${1.4 + i * 0.12}" rx=".8" opacity="${(0.9 - i * 0.055).toFixed(2)}"/>`)
  .join('');

/** Without a photo the hero is drawn: the Bosphorus at golden hour · the old city · the bridge. */
const HERO_ART = `<svg viewBox="0 0 780 452" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="lds-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F2E58"/><stop offset=".42" stop-color="#5C5E8E"/><stop offset=".72" stop-color="#C98785"/><stop offset=".9" stop-color="#F0B486"/><stop offset="1" stop-color="#F8CF98"/></linearGradient>
<linearGradient id="lds-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E2A884"/><stop offset=".14" stop-color="#9A7B90"/><stop offset=".42" stop-color="#3D4C7A"/><stop offset="1" stop-color="#0C1934"/></linearGradient>
<radialGradient id="lds-sun"><stop offset="0" stop-color="#FFE7BD" stop-opacity=".95"/><stop offset=".35" stop-color="#FFC98E" stop-opacity=".5"/><stop offset="1" stop-color="#FFC98E" stop-opacity="0"/></radialGradient></defs>
<rect width="780" height="296" fill="url(#lds-sky)"/>
<g class="wsun"><circle cx="528" cy="270" r="150" fill="url(#lds-sun)"/><circle cx="528" cy="284" r="21" fill="#FFF0CF"/></g>
<g fill="#7D6681" opacity=".8"><path d="M0 296V286C60 281 110 284 170 282S300 279 360 283 480 286 560 281 690 284 780 280V296Z"/>${mosque(436, 284, 9.5)}<rect x="378" y="258" width="8" height="26"/><path d="M376.5 259L382 245L387.5 259Z"/></g>
<g fill="none" stroke="#7D6681" opacity=".75"><path d="M592 284H780" stroke-width="2"/><path d="M600 284Q632 278 646 246Q706 282 748 246Q764 262 790 272" stroke-width="1.2"/></g><g fill="#7D6681" opacity=".8"><rect x="644" y="244" width="4" height="40"/><rect x="746" y="244" width="4" height="40"/></g>
<rect y="294" width="780" height="158" fill="url(#lds-sea)"/>
<g class="wsh" fill="#FFDDB0">${GLINT}</g>
<g fill="#0A142B" opacity=".28"><rect x="0" y="380" width="230" height="1.2"/><rect x="40" y="398" width="310" height="1.2"/><rect x="590" y="372" width="190" height="1.2"/><rect x="520" y="412" width="260" height="1.2"/></g>
<g class="wb2" fill="#16203F">${silhouette(488, 306, 28, false)}</g>
<g class="wb1" fill="#0D1530">${silhouette(612, 352, 92)}</g>
<g fill="#0D1530" opacity=".22" transform="matrix(1 0 0 -.45 0 510.4)">${silhouette(612, 352, 92, false)}</g>
</svg>`;

/** Fleet cards without a photo: the boat drawn on its own water and light. */
function boatArt(id: string, sky: [string, string], sea: [string, string], shore: string, boat: string): string {
  return `<svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="${id}-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient><linearGradient id="${id}-w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sea[0]}"/><stop offset="1" stop-color="${sea[1]}"/></linearGradient></defs><rect width="300" height="132" fill="url(#${id}-s)"/><path d="M0 132V122C50 118 90 121 140 119S240 117 300 121V132Z" fill="${shore}"/><rect y="131" width="300" height="69" fill="url(#${id}-w)"/><g fill="#FFFFFF" opacity=".35"><rect x="18" y="150" width="60" height="1.4"/><rect x="210" y="160" width="70" height="1.4"/><rect x="60" y="178" width="90" height="1.4"/><rect x="190" y="186" width="80" height="1.4"/></g>${boat}</svg>`;
}

const J70 = boatArt(
  'lj',
  ['#B9D5F0', '#E4EFF8'],
  ['#2E6FA6', '#173F6B'],
  '#9DB8D2',
  `<g transform="rotate(-7 150 140)"><path d="M146 46Q86 70 84 134L146 134Z" fill="#E9785A"/><path d="M152 34Q186 84 198 134L152 134Z" fill="#FFFFFF"/><path d="M152 34Q186 84 198 134" fill="none" stroke="#D5DDE6" stroke-width="2"/><path d="M149 30V138" stroke="#0F2240" stroke-width="2.4"/><path d="M98 136H212L202 150H110Z" fill="#0F2240"/><g fill="#FCE3CF"><circle cx="176" cy="132" r="3.2"/><circle cx="186" cy="133" r="3.2"/></g></g><path d="M80 154Q120 150 160 156" fill="none" stroke="#FFFFFF" stroke-width="2" opacity=".6"/>`,
);
const LASER = boatArt(
  'll',
  ['#F6C9A6', '#FCE8D6'],
  ['#D98C74', '#7C4B5C'],
  '#E0AE96',
  `<g transform="rotate(-10 150 140)"><path d="M150 40Q186 86 192 136L150 136Z" fill="#FFFFFF"/><path d="M150 40Q186 86 192 136" fill="none" stroke="#E8D9CB" stroke-width="2"/><path d="M148 38V140" stroke="#3A2F3F" stroke-width="2"/><path d="M118 138H196L190 147H124Z" fill="#FFFFFF"/><path d="M118 138H196" stroke="#E9785A" stroke-width="2"/><circle cx="192" cy="128" r="4.2" fill="#0F2240"/><path d="M190 132L202 140" stroke="#0F2240" stroke-width="4" stroke-linecap="round"/></g><path d="M110 154Q150 151 196 157" fill="none" stroke="#FFFFFF" stroke-width="2" opacity=".5"/>`,
);
const CRUISER = boatArt(
  'lc',
  ['#C9D9DE', '#EEF3F4'],
  ['#4F8592', '#1F4752'],
  '#A9C0C6',
  `<g transform="rotate(-4 150 140)"><path d="M140 34Q90 84 88 132L140 132Z" fill="#F7F7F2"/><path d="M146 22Q192 78 206 130L146 130Z" fill="#FFFFFF"/><path d="M146 22Q192 78 206 130" fill="none" stroke="#D8E1E3" stroke-width="2"/><path d="M143 18V134" stroke="#2A3540" stroke-width="2.6"/><path d="M72 132H226L212 152H90Z" fill="#FFFFFF"/><path d="M76 138H222" stroke="#0F2240" stroke-width="3"/><path d="M128 126H170V132H128Z" fill="#DDE5E8"/><g fill="#0F2240"><rect x="132" y="128" width="6" height="2" rx="1"/><rect x="142" y="128" width="6" height="2" rx="1"/><rect x="152" y="128" width="6" height="2" rx="1"/></g></g><path d="M70 160Q130 155 210 162" fill="none" stroke="#FFFFFF" stroke-width="2" opacity=".5"/>`,
);

/** November 2026 starts on a Sunday: six empty days first (weeks start on Monday). Today is the 17th. */
function calendar(): string {
  const full = new Set([21, 28]);
  const cells: string[] = Array.from({ length: 6 }, () => '<i></i>');
  for (let d = 1; d <= 30; d++) {
    const cls = d < 17 ? 'past' : d === 17 ? 'today' : full.has(d) ? 'full' : d === 22 ? 'pick' : 'free';
    cells.push(`<i class="${cls}">${d}</i>`);
  }
  return cells.join('');
}

const LOGO = `<span class="wlogo"><svg viewBox="0 0 24 24"><path d="M12.6 2.5V16.5H20.5Z"/><path d="M11 6.5V16.5H4.6Z" opacity=".72"/><path d="M3 18.5H21L19.2 21.5H4.8Z"/></svg><b>LODOS</b></span>`;
const NAV = (cls: string) =>
  `<header class="wn ${cls}">${LOGO}<span class="wl"><span>Fleet</span><span>Lessons</span><span>Races</span><span>Club</span><span>Journal</span></span><span class="wnr"><span class="wlang">EN</span><span>Sign in</span><span class="wnb">Book a sail</span></span></header>`;

function fleetCard(cls: string, img: string, art: string, badge: string, name: string, rate: string, sub: string, crew: string, len: string, price: string): string {
  return `<article class="${cls}"><span class="wimg"><span class="wpic">${img || art}</span>${badge ? `<i class="wbadge">${badge}</i>` : ''}<i class="wfav">${I.heart}</i></span><span class="wtop"><b>${name}</b><span class="wrate">${I.star}${rate}</span></span><small class="wsb">${sub}</small><span class="wspec"><span>${I.users}${crew}</span><span>${I.ruler}${len}</span><span>${I.clock}2 h</span></span><span class="wrow"><span class="wprice">from <b>${price}</b> / sail</span><i class="wbtn">Book</i></span></article>`;
}

function web(pic: Pic): string {
  const hero = pic('web-hero');
  return `<div class="fc-web" lang="en">
<div class="wv"><div class="wpage">
<section class="wh${hero ? ' has-pic' : ''}">
<span class="wh-pic">${hero ? photo(hero) : HERO_ART}</span><span class="wh-veil"></span>
<div class="wh-copy"><span class="wk">Sailing club on the Bosphorus</span><b class="wt">Catch the<br>north wind.</b><p>Lessons · club races and private sails from Moda pier. Seven days a week from April to November.</p>
<span class="wproof"><span class="wfaces">${face(pic, 'ada', '')}${face(pic, 'mert', '')}${face(pic, 'zeynep', '')}</span><span class="wstars">★★★★★</span><span><b>4.9</b> from 860 reviews</span></span></div>
<span class="wwx"><span class="wwa">${ico('<path d="M12 3v18M12 3l-5 6M12 3l5 6"/>')}</span><span><small>Live at Moda</small><b>NE 14 kn</b></span><i></i><span><small>Gusts 18</small><b>21°C</b></span></span>
<div class="wsrch"><span class="wf"><i>${I.sail}</i><span><small>Experience</small><b>Two hour sail</b></span></span><span class="wf"><i>${I.cal}</i><span><small>When</small><b>This weekend</b></span></span><span class="wf"><i>${I.users}</i><span><small>Crew</small><b>4 people</b></span></span><span class="wgo">${I.search}Check availability</span></div>
</section>
<div class="wst"><span><b>26</b><small>boats from four<br>to twelve crew</small></span><span><b>1 400</b><small>members<br>in the club</small></span><span><b>312</b><small>race days<br>every year</small></span><span><b>11</b><small>skippers<br>on the pier</small></span></div>
<section class="wfl"><header><span><span class="wk">The fleet</span><b class="wh2">Twenty six boats.<br>One for every wind.</b></span><span class="wfr"><span class="wchips"><i class="on">All<em>26</em></i><i>Keelboats<em>9</em></i><i>Dinghies<em>12</em></i><i>Cruisers<em>5</em></i></span><span class="warr"><i>${I.back}</i><i class="on">${I.next}</i></span></span></header>
<div class="wcards">
${fleetCard('', photo(pic('web-j70')), J70, 'Most booked', 'J/70', '4.9', 'Sport keelboat · fast and dry', '4 crew', '6.9 m', '₺1 800')}
${fleetCard('hov', photo(pic('web-laser')), LASER, 'Lessons', 'Laser Standard', '4.8', 'Single hander · learn to sail', '1 crew', '4.2 m', '₺900')}
${fleetCard('', photo(pic('web-cruiser')), CRUISER, '', 'Beneteau 40.7', '5.0', 'Cruiser racer · a day out', '8 crew', '12.2 m', '₺6 400')}
</div></section>
<section class="wbk"><div class="wbl"><span class="wk">Book a morning</span><b class="wh2">Pick a day.<br>We bring the wind.</b><p>Two hour sails with a skipper on board. Life jackets and tea included.</p>
<span class="wsk"><i class="wav">${pic('web-skipper') ? photo(pic('web-skipper')) : 'DA'}</i><span><small>Your skipper</small><b>Defne Arslan</b><small>Yachtmaster · 11 years at Lodos</small></span><span class="wrate">${I.star}4.98</span></span>
<ul><li>Free cancellation up to 24 h before</li><li>All levels welcome · no experience needed</li><li>We meet you on Moda pier</li></ul>
<span class="wq"><span class="wstars">★★★★★</span><span>“The best morning of my year. Defne made the wind feel easy.”</span><small>Ece · sailed with us in October</small></span></div>
<div class="wcal"><div class="wmon"><span><b>November 2026</b><small>J/70 · two hour sail</small></span><span class="warr"><i>${I.back}</i><i>${I.next}</i></span></div>
<div class="wdn"><i>Mo</i><i>Tu</i><i>We</i><i>Th</i><i>Fr</i><i>Sa</i><i>Su</i></div><div class="wgrid">${calendar()}</div>
<div class="wtimes"><span><small>Start time</small><small>All times in İstanbul</small></span><div class="wslots"><i>08:30</i><i class="pick">10:00</i><i class="full">12:30</i><i>15:00</i><i>17:30</i></div></div>
<div class="wsum"><span class="s0"><b>Choose a day and a time</b><small>Up to 4 crew · skipper included</small></span><span class="s1"><b>Sun 22 Nov · 10:00 to 12:00</b><small>J/70 · 4 crew · skipper included</small></span><b class="wtot">₺1 800</b></div>
<span class="wres"><span class="r1">Reserve</span><span class="r2">${I.check}Booked · see you on the pier</span></span>
</div></section>
<footer class="wft"><div class="wft-top"><span class="wfb">${LOGO}<p>A sailing club on the Bosphorus since 1998.</p><small>The race calendar in your inbox</small><span class="wnews"><i>Email address</i><b>Subscribe</b></span></span>
<span class="wfc"><b>Sail</b><i>Fleet</i><i>Lessons</i><i>Club races</i><i>Private sails</i></span><span class="wfc"><b>Club</b><i>About us</i><i>Membership</i><i>Journal</i><i>Careers</i></span><span class="wfc"><b>Visit</b><i>Moda pier</i><i>Kadıköy · İstanbul</i><i>hello@lodos.club</i><i>Daily 08:00 to 20:00</i></span></div>
<div class="wft-bot"><span>© 2026 Lodos Sailing Club</span><span>Privacy · Terms · Cookies</span><span class="wsoc"><i>${I.camera}</i><i>${I.film}</i><i>${I.mail}</i></span></div></footer>
</div></div>
<div class="wnav">${NAV('wn-a')}${NAV('wn-b')}</div>
<span class="wptr">${POINTER}</span>
</div>`;
}

/* ---------------- app · Pocket ---------------- */

const STATUS = `<span class="ios"><b>9:41</b><span class="isl"></span><span class="sig"><i></i><i></i><i></i><i></i></span><svg class="wifi" viewBox="0 0 18 13"><path d="M9 12.2l2.4-2.9a3.6 3.6 0 0 0-4.8 0zM4.4 7.3l1.4 1.6a5 5 0 0 1 6.4 0l1.4-1.6a7.2 7.2 0 0 0-9.2 0zM1.4 4.1l1.5 1.6a9.4 9.4 0 0 1 12.2 0l1.5-1.6a11.6 11.6 0 0 0-15.2 0z"/></svg><span class="bat"><i></i></span></span>`;

/** Android: a punch hole in the middle · Material's signal · wifi and battery on the right. */
const STATUS_AND = `<span class="ios droid"><b>9:41</b><span class="pun"></span><span class="dsig"><svg viewBox="0 0 16 16"><path d="M15 1v14H1z"/></svg></span><svg class="wifi" viewBox="0 0 18 13"><path d="M9 12.6L0.6 3.6a12.4 12.4 0 0 1 16.8 0z"/></svg><span class="dbat"><i></i></span></span>`;

/** Our own mark pays the salary (the studio is the employer in the story). */
const LC = `<svg viewBox="-20 -20 533 909" class="lcm"><path d="${MARK.top}"/><path d="${MARK.comma}"/></svg>`;

const ROW = (cls: string, tile: string, name: string, sub: string, amt: string, plus = false) =>
  `<span class="arow ${cls}">${tile}<span class="atx"><b>${name}</b><small>${sub}</small></span><em${plus ? ' class="in"' : ''}>${amt}</em></span>`;

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

function app(pic: Pic, os: 'ios' | 'android' = 'ios'): string {
  const and = os === 'android';
  const back = and ? I.arrowL : I.back;
  const contact = (who: string, ini: string, name: string, tag: string) =>
    `<span class="acr">${face(pic, who, ini)}<span><b>${name}</b><small>${tag}</small></span><i class="aon">P</i></span>`;
  return `<div class="fc-app${and ? ' and' : ''}" lang="en"><div class="ap">
${and ? STATUS_AND : STATUS}
<div class="ahome">
<header class="ahd">${face(pic, 'deniz', 'DK')}<span class="ahi"><small>Good morning</small><b>Deniz Kaya</b></span><span class="aic aic1">${I.search}</span><span class="aic abell">${I.bell}<i></i></span></header>
<div class="acard"><span class="amesh"><i class="m1"></i><i class="m2"></i><i class="m3"></i></span>
<span class="acrow"><small>Total balance ${I.eye}</small><span class="acur">TRY ${I.down}</span></span>
<span class="abal"><b class="bal1">₺48 210<em>.50</em></b><b class="bal2">₺47 960<em>.50</em></b></span>
<span class="aup">${I.arrowUp}₺32 000 in this month</span>
<span class="afoot"><span class="anum">•••• 4821</span><span class="abrand">${I.wave}<b>Pocket</b></span></span></div>
<div class="aacts"><span class="send"><i>${I.arrowUp}</i>Send</span><span><i>${I.arrowDown}</i>Request</span><span><i>${I.plus}</i>Top up</span><span><i>${I.dots}</i>More</span></div>
<div class="aweek"><header><span><small>Spent this week</small><b>₺3 420</b></span><span class="apill">${I.arrowDown}12% vs last week</span></header>
<span class="achart"><span class="aavg"><i>avg</i></span><span class="abars"><i class="d1"></i><i class="d2"></i><i class="d3"></i><i class="d4"></i><i class="d5"></i><i class="d6"></i><i class="d7"></i></span><b class="atip">₺620</b></span>
<span class="adays"><i>M</i><i>T</i><i>W</i><i>T</i><i>F</i><i>S</i><i class="on">S</i></span></div>
<div class="alist"><header><b>Recent</b><span>See all</span></header><div class="arows">
${ROW('rnew', face(pic, 'ece', 'EY'), 'Ece Yılmaz', 'Transfer · just now', '−₺250')}
${ROW('r1', `<i class="t ts">${LC}</i>`, 'Salary', 'Lost Comma · 09:02', '+₺32 000', true)}
${ROW('r2', `<i class="t tc">${I.coffee}</i>`, 'Moda Coffee', 'Food and drink · 08:41', '−₺85')}
${ROW('r3', `<i class="t tf">${I.ferry}</i>`, 'Ferry · Kadıköy', 'Transport · yesterday', '−₺34')}
</div></div>
<nav class="atab"><span class="on">${I.home}Home</span><span>${I.card}Cards</span><span>${I.chart}Insights</span><span>${I.user}Profile</span></nav>
</div>
<div class="aflow">
<div class="asend"><header class="anav"><i>${back}</i><b>Send money</b><i>${I.scan}</i></header>
<span class="asearch">${I.search}Name · @tag · phone or IBAN</span>
<span class="aiban"><i>${I.bank}</i><span><b>Send to a bank account</b><small>Any IBAN in Türkiye · arrives in seconds</small></span>${I.next}</span>
<small class="acap c1">Recent</small>
<div class="arec"><span class="ece">${face(pic, 'ece', 'EY')}Ece</span><span>${face(pic, 'mert', 'MA')}Mert</span><span>${face(pic, 'zeynep', 'ZK')}Zeynep</span><span>${face(pic, 'can', 'CD')}Can</span></div>
<small class="acap c2">On Pocket</small>
<div class="acon">${contact('ada', 'AB', 'Ada Bulut', '@adabulut')}${contact('berk', 'BO', 'Berk Oral', '@berk')}${contact('cem', 'CT', 'Cem Tan', '@cemtan')}${contact('elif', 'EŞ', 'Elif Şahin', '@elifs')}${contact('kaan', 'KU', 'Kaan Uslu', '@kaanu')}${contact('nil', 'NA', 'Nil Akın', '@nilakin')}</div></div>
<div class="aamt"><header class="anav"><i>${back}</i><span class="ato">${face(pic, 'ece', 'EY')}<span><b>Ece Yılmaz</b><small>@ece · on Pocket</small></span></span><i>${I.dots}</i></header>
<span class="aval"><b class="v0">₺0</b><b class="v1">₺2</b><b class="v2">₺25</b><b class="v3">₺250</b></span>
<small class="aleft">Balance ₺48 210.50</small>
<span class="achips"><i>₺100</i><i class="c250">₺250</i><i>₺500</i><i>₺1 000</i></span>
<span class="anote">${I.pencil}Add a note</span>
<span class="ainfo">${I.bolt}Arrives instantly · no fee</span>
<div class="akeys">${KEYS.map((k, i) => `<i class="k${i}">${k}</i>`).join('')}</div>
<span class="asendb"><b class="l1">Send</b><b class="l2">Send ₺250</b><i class="spin"></i></span></div>
<div class="aok"><span class="aokc"><i class="rg1"></i><i class="rg2"></i><span class="aokb">${I.check}</span></span><b class="aokt">₺250 sent</b><small class="aoks">to Ece Yılmaz · arrived instantly</small>
<span class="aokr"><span><small>To</small><b>${face(pic, 'ece', 'EY')}Ece Yılmaz</b></span><span><small>Account</small><b class="m">TR•• •••• •••• 4410</b></span><span><small>Reference</small><b class="m">PCK 2611 0942</b></span><span><small>Fee</small><b>Free</b></span></span>
<span class="ashare">${I.share}Share receipt</span><span class="adone">Done</span></div>
</div>
<i class="atap t1"></i><i class="atap t2"></i><i class="atap t3"></i><i class="atap t4"></i><i class="atap t5"></i><i class="atap t6"></i><i class="atap t7"></i>
<span class="ahome-ind"></span>
</div></div>`;
}


/* ---------------- identity · Clay ---------------- */

const CLAY_MARK = `<path d="M62 120 Q44 96 54 72 Q60 60 58 40 L92 40 Q90 60 96 72 Q106 96 88 120 Z"/><rect x="54" y="34" width="42" height="9" rx="4"/>`;

const ID = `<div class="fc-id" lang="en">
<section class="is s1"><svg class="igrid" viewBox="0 0 150 150"><circle cx="75" cy="80" r="46"/><circle cx="75" cy="80" r="30"/><path d="M75 10V140M10 80H140M29 34L121 126M121 34L29 126"/><path d="M54 40H96M54 120H96"/></svg><svg class="imk" viewBox="0 0 150 150">${CLAY_MARK}</svg><b class="iwm">Clay</b><span class="icap"><b>01</b>Mark · drawn on a 12 unit grid</span></section>
<section class="is s2"><div class="isw"><span class="c1"><b>Terracotta</b><small>#C8643B</small><small>PMS 7591</small></span><span class="c2"><b>Bosphorus</b><small>#1E5B5A</small><small>PMS 5473</small></span><span class="c3"><b>Ochre</b><small>#E0A54A</small><small>PMS 7409</small></span><span class="c4"><b>Slip</b><small>#F7EFE4</small><small>Paper white</small></span></div><span class="icap"><b>02</b>Colour · fired earth and sea</span></section>
<section class="is s3"><b class="iaa">Aa</b><span class="ispec"><b>Anybody Italic 820</b><small>Display · headlines · the mark’s word</small><span class="iabc">ABCÇDEFGĞHIİJKLMNOÖ<br>abcçdefgğhıijklmnoö 0123456789</span><b class="ig">Geist 400</b><small>Text · labels · prices</small></span><span class="icap"><b>03</b>Type · warm and a little tilted</span></section>
<section class="is s4"><span class="icard ib"><b>Selin Aydın</b><small>Founder · ceramicist</small><small class="m">selin@clay.studio</small></span><span class="icard if"><svg viewBox="0 0 150 150">${CLAY_MARK}</svg><b>Clay</b></span><span class="itote"><svg viewBox="0 0 150 150">${CLAY_MARK}</svg><b>Clay</b><small>Kadıköy · İstanbul</small></span><span class="iapp"><svg viewBox="0 0 150 150">${CLAY_MARK}</svg></span><span class="icup"><i></i></span><span class="icap"><b>04</b>In use · cards · bags · app · cups</span></section>
<header class="ihd"><b>Clay</b><span>Brand guidelines · v1.2</span></header>
<span class="ipg"><b class="p1">01</b><b class="p2">02</b><b class="p3">03</b><b class="p4">04</b><span>/ 04</span></span>
</div>`;

/* ---------------- motion · our own sting in an editor ---------------- */

const LAYERS: [string, string][] = [
  ['Comma', 'l-c'],
  ['Corner', 'l-k'],
  ['Wordmark', 'l-w'],
  ['Shadow', 'l-s'],
  ['Background', 'l-b'],
];

const FRAMES = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).join('<br>');

/** The editor · its preview plays our logo sting · or a real loop when a live motion project has one. */
const MO = (loop: string | null) => `<div class="fc-mo" lang="en">
<header class="mbar"><span class="mdots"><i></i><i></i><i></i></span><span class="mtab">Logo sting.comp</span><span class="mmeta">1920 × 820 · 24 fps · 4 s</span><span class="mrender">Render</span></header>
<div class="mview"><div class="mcomp">${loop ? `<div class="fc-vid">${loop}</div>` : `<span class="mshadow"></span><svg class="mcorner" viewBox="0 0 ${MARK.w} ${MARK.base}"><path d="${MARK.top}"/></svg><span class="mcomma"><svg viewBox="34 586 247 283"><path d="${MARK.comma}"/></svg></span><b class="mword">${'lost comma'
  .split('')
  .map((ch, i) => `<i class="ch${i}">${ch === ' ' ? '&nbsp;' : ch}</i>`)
  .join('')}</b>`}</div><span class="mzoom">Fit · 19%</span></div>
<aside class="mgraph"><header><b>Graph</b><span>Comma · Position Y</span></header><svg viewBox="0 0 240 100" preserveAspectRatio="none"><path class="gg" d="M0 25H240M0 50H240M0 75H240M60 0V100M120 0V100M180 0V100"/><path class="gc" d="M0 92 C40 92 52 -8 84 6 C104 14 104 40 120 40 C134 40 138 26 150 28 C164 30 170 34 240 34"/><circle class="gh" cx="52" cy="2" r="3"/><circle class="gh" cx="40" cy="92" r="3"/><path class="gl" d="M40 92 L52 2"/></svg><i class="gph"></i><span class="gval"><span><small>Ease</small><b>Out back · 1.56</b></span><span><small>Value</small><b>412 px</b></span></span></aside>
<div class="mtl"><div class="mhead"><span class="mtc"><b>00:00:0</b><span class="msec"><span><b>0<br>1<br>2<br>3</b></span></span><b>:</b><span class="mfr"><span><b>${FRAMES}</b></span></span></span><span class="mplay">${I.play}</span></div>
<div class="mruler"><i>0s</i><i>1s</i><i>2s</i><i>3s</i><i>4s</i></div>
${LAYERS.map(([n, c]) => `<div class="mrow ${c}"><span class="mname"><i></i>${n}</span><span class="mtrack"><i class="bar"></i><i class="k a"></i><i class="k b"></i><i class="k c"></i></span></div>`).join('')}
<i class="mph"></i></div>
</div>`;

/* ---------------- automation · a booking runs through the tools ---------------- */

const NODE = (cls: string, icon: string, tile: string, title: string, sub: string, ms: string) =>
  `<div class="an ${cls}"><i class="tile ${tile}">${icon}</i><span><b>${title}</b><small>${sub}</small></span><span class="ast"><i class="run"></i><i class="ok">${I.check}</i></span><em>${ms}</em></div>`;

const AUTO = `<div class="fc-auto" lang="en">
<header class="xbar"><span class="xlogo">${I.bolt}</span><span class="xcrumb"><small>Workflows /</small><b>Booking to invoice</b></span><span class="xon"><i></i>Active</span><span class="xlast">Runs on every booking</span><span class="xtest">${I.play}Test run</span></header>
<div class="xcanvas">
<svg class="xwires" viewBox="0 0 540 426"><path d="M156 53H196M332 53H372M440 80V150M440 204V270"/><path class="no" d="M372 177H332" /><path d="M412 204V236H264V270"/></svg>
<span class="xlbl yes">yes</span><span class="xlbl nope">no</span>
${NODE('n1', I.globe, 'g1', 'New booking', 'Website form', 'trigger')}
${NODE('n2', I.cal, 'g2', 'Check calendar', '2 seats free', '84 ms')}
${NODE('n3', I.pay, 'g3', 'Take payment', '₺1 800 · card', '640 ms')}
${NODE('n4', I.branch, 'g4', 'If paid', 'Status is paid', '2 ms')}
${NODE('n7 idle', I.clock, 'g7', 'Remind in 24 h', 'Waits for payment', '·')}
${NODE('n5', I.mail, 'g5', 'Send receipt', 'E-mail · PDF invoice', '210 ms')}
${NODE('n6', I.chat, 'g6', 'Tell the crew', 'Team chat · #bookings', '96 ms')}
<i class="pk p1"></i><i class="pk p2"></i><i class="pk p3"></i><i class="pk p4"></i><i class="pk p5"></i>
<span class="xmini"><i class="zo"></i><i class="zi"></i><b>100%</b></span>
</div>
<aside class="xlog"><header><b>Executions</b><span class="xf"><i class="on">All</i><i>Failed</i></span></header>
<div class="xrun"><span class="xs"><i class="run"></i><i class="ok">${I.check}</i></span><span><b>#2841 · Ece Yılmaz</b><small class="r">Running · step <em class="st1">1</em><em class="st2">2</em><em class="st3">3</em><em class="st4">4</em> of 5</small><small class="d">Booking · ₺1 800 · paid</small></span><em class="xt">1.2 s</em></div>
<div class="xrow"><span class="xs"><i class="ok">${I.check}</i></span><span><b>#2840 · Mert Aksoy</b><small>Booking · ₺900 · paid</small></span><em class="xt">1.1 s</em></div>
<div class="xrow warn"><span class="xs"><i class="re">↻</i></span><span><b>#2839 · Ada Bulut</b><small>Payment retried once</small></span><em class="xt">3.4 s</em></div>
<div class="xrow"><span class="xs"><i class="ok">${I.check}</i></span><span><b>#2838 · Can Demir</b><small>Booking · ₺6 400 · paid</small></span><em class="xt">1.3 s</em></div>
<div class="xrow"><span class="xs"><i class="ok">${I.check}</i></span><span><b>#2837 · Selin Aydın</b><small>Booking · ₺1 800 · paid</small></span><em class="xt">1.2 s</em></div>
<div class="xstat"><small>This month</small><span><b>1 284</b><small>runs</small></span><span><b>99.8%</b><small>succeeded</small></span><span><b>46 h</b><small>saved</small></span><span class="xspark"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div>
</aside>
</div>`;

/**
 * The five things inside the service frame (in the order of the content's services). `loop` is the
 * rendered video of the newest live motion project: the editor's preview plays it instead of the sting.
 */
/** Apps: the same Pocket on Android · a second artboard beside the iPhone (services.ts). */
export function androidArt(pic: Pic = noPictures): Safe {
  return raw(app(pic, 'android'));
}

export function frameArt(loop: Safe | null = null, pic: Pic = noPictures): Safe[] {
  return [raw(web(pic)), raw(app(pic)), raw(ID), raw(MO(loop ? loop.value : null)), raw(AUTO)];
}
