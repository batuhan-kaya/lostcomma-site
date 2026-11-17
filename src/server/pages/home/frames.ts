/**
 * 03 · Services: what plays inside the service frame. Five real looking products, each one telling
 * a short story on a loop (styles/pages/_frames.css):
 *
 *   website    Lodos · a sailing club. The page scrolls · the fleet · a visitor books Sunday 10:00
 *   app        Pocket · a wallet on iOS. A salary lands · send ₺250 to Ece · the list updates
 *   identity   Clay · a ceramics studio's brand book. Mark · colour · type · in use
 *   motion     a motion editor playing our own logo sting · the playhead runs the timeline
 *   automation a workflow builder · a booking runs through calendar · payment · mail and chat
 *
 * Pure markup we wrote ourselves (raw) · always inside an aria-hidden container. The mock products'
 * copy stays in English like a client's real product would · no commas (the brand rule holds
 * everywhere on the page). Every loop moves transform and opacity only · only the frame on show
 * plays · reduced motion shows each one as a composed still.
 */
import { raw, type Safe } from '../../html';
import { MARK } from '../../../shared/logo';

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
  back: ico('<path d="M15 5l-7 7 7 7"/>'),
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
};

/** The pointer a visitor moves around a mock (never a team cursor: those are the crew's). */
const POINTER = `<svg viewBox="0 0 24 24"><path d="M3 2 L3 19.5 L7.8 15.2 L11 22 L14.2 20.6 L11.1 13.9 L17.6 13.7 Z"/></svg>`;

/** A sailing boat seen from the side · its hull colour and sails come from the card. */
const boat = (sail: string, hull: string, jib = true) =>
  `<svg viewBox="0 0 160 110"><path d="M80 12 L80 78 L122 78 Z" fill="${sail}"/>${jib ? `<path d="M74 24 L74 78 L44 78 Z" fill="${sail}" opacity=".82"/>` : ''}<path d="M34 82 L130 82 L118 96 L44 96 Z" fill="${hull}"/><path d="M77 8 L77 82" stroke="${hull}" stroke-width="2.5"/></svg>`;

/* ---------------- website · Lodos ---------------- */

/** November 2026 starts on a Sunday: six empty days first (weeks start on Monday). */
function calendar(): string {
  const full = new Set([3, 4, 10, 17, 18, 24, 25]);
  const cells: string[] = Array.from({ length: 6 }, () => '<i></i>');
  for (let d = 1; d <= 30; d++) {
    const cls = d < 16 ? 'past' : full.has(d) ? 'full' : d === 22 ? 'pick' : 'free';
    cells.push(`<i class="${cls}">${d}</i>`);
  }
  return cells.join('');
}

const WEB = `<div class="fc-web" lang="en">
<div class="wv"><div class="wpage">
<section class="wp-hero">
<span class="wsun"></span>
<svg class="wsea" viewBox="0 0 752 300" preserveAspectRatio="xMidYMax slice"><g transform="translate(232 0)"><g class="wb1"><path d="M250 98 L250 212 L314 212 Z" fill="#FBF4EA"/><path d="M243 118 L243 212 L206 212 Z" fill="#EFE2D2"/><path d="M196 215 L322 215 L308 227 L210 227 Z" fill="#0E1F40"/></g></g><g transform="translate(62 0)"><g class="wb2"><path d="M560 166 L560 220 L590 220 Z" fill="#FBF4EA"/><path d="M546 222 L596 222 L590 228 L552 228 Z" fill="#0E1F40"/></g></g><g class="wsh" fill="#FFE2C4" opacity=".55"><rect x="452" y="244" width="80" height="2"/><rect x="420" y="258" width="120" height="2"/><rect x="452" y="272" width="56" height="2"/></g></svg>
<span class="wwind"><span class="wwa">${ico('<path d="M12 3v18M12 3l-5 6M12 3l5 6"/>')}</span><span><b>NE 14 kn</b><small>Moda · 21°C</small></span></span>
<div class="wcopy"><span class="wk">Sailing club · since 1998</span><b class="wt">Catch the<br>north wind.</b><p>Lessons and club races on the Bosphorus. Seven days a week from April to November.</p><span class="wbtns"><span class="wcta">Book a sail</span><span class="wgh">See the fleet</span></span></div>
</section>
<div class="wstats"><span><b>26</b><small>boats</small></span><span><b>1 400</b><small>members</small></span><span><b>312</b><small>race days a year</small></span><span><b>4.9 ★</b><small>from 860 reviews</small></span></div>
<section class="wfleet"><header><b>The fleet</b><span>All 26 boats →</span></header><div class="wcards">
<article><span class="wimg i1">${boat('#FBF4EA', '#0E1F40')}</span><b>J/70</b><small>Sport keelboat · 4 crew</small><span class="wrow"><em>from ₺1 800</em><i>Book</i></span></article>
<article class="hov"><span class="wimg i2">${boat('#FFFFFF', '#E9785A', false)}</span><b>Laser Standard</b><small>Single hander · lessons</small><span class="wrow"><em>from ₺900</em><i>Book</i></span></article>
<article><span class="wimg i3">${boat('#0E1F40', '#F2D6B3')}</span><b>Beneteau 40.7</b><small>Cruiser racer · 8 crew</small><span class="wrow"><em>from ₺6 400</em><i>Book</i></span></article>
</div></section>
<section class="wbook"><div class="wbl"><span class="wk">Book a morning</span><b>Pick a day.<br>We bring the wind.</b><p>Two hour sessions with a skipper. Life jackets and tea included.</p><ul><li>Free cancellation up to 24 h before</li><li>All levels welcome</li><li>Pick up from Moda pier</li></ul></div>
<div class="wcal"><header><b>November 2026</b><span>‹ ›</span></header><div class="wdn"><i>Mo</i><i>Tu</i><i>We</i><i>Th</i><i>Fr</i><i>Sa</i><i>Su</i></div><div class="wgrid">${calendar()}</div>
<div class="wslots"><i>08:30</i><i class="pick">10:00</i><i class="full">12:30</i><i>15:00</i></div>
<span class="wres"><span class="r1">Reserve</span><span class="r2">${I.check}Booked · Sun 22 · 10:00</span></span>
<span class="wptr">${POINTER}</span></div>
</section>
<footer class="wft"><b>LODOS</b><span>Moda pier · Kadıköy</span><span>hello@lodos.club</span><span>© 2026</span></footer>
</div></div>
<header class="wn"><b>LODOS</b><span class="wl"><span>Fleet</span><span>Lessons</span><span>Races</span><span>Club</span></span><span class="wnb">Join the club</span></header>
</div>`;

/* ---------------- app · Pocket ---------------- */

const STATUS = `<span class="ios"><b>9:41</b><span class="isl"></span><span class="sig"><i></i><i></i><i></i><i></i></span><svg class="wifi" viewBox="0 0 18 13"><path d="M9 12.2l2.4-2.9a3.6 3.6 0 0 0-4.8 0zM4.4 7.3l1.4 1.6a5 5 0 0 1 6.4 0l1.4-1.6a7.2 7.2 0 0 0-9.2 0zM1.4 4.1l1.5 1.6a9.4 9.4 0 0 1 12.2 0l1.5-1.6a11.6 11.6 0 0 0-15.2 0z"/></svg><span class="bat"><i></i></span></span>`;

const ROW = (cls: string, tile: string, name: string, sub: string, amt: string, plus = false) =>
  `<span class="arow ${cls}"><i class="t ${tile}"></i><span><b>${name}</b><small>${sub}</small></span><em${plus ? ' class="in"' : ''}>${amt}</em></span>`;

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

const APP = `<div class="fc-app" lang="en"><div class="ap">
${STATUS}
<div class="ahome">
<header class="ahd"><span class="aav">DK</span><span><small>Good morning</small><b>Deniz</b></span><span class="abell">${I.bell}<i></i></span></header>
<div class="acard"><span class="aglow"></span><small>Total balance</small><span class="abal"><b class="bal1">₺48 210<em>.50</em></b><b class="bal2">₺47 960<em>.50</em></b></span><span class="aup">↑ ₺32 000 this month</span><span class="afoot"><span>•••• 4821</span><b>Pocket</b></span></div>
<div class="aacts"><span class="send"><i>${I.arrowUp}</i>Send</span><span><i>${I.arrowDown}</i>Request</span><span><i>${I.plus}</i>Top up</span><span><i>${I.card}</i>Cards</span></div>
<div class="aweek"><header><span><small>Spent this week</small><b>₺3 420</b></span><span class="apill">−12% vs last</span></header><span class="abars"><i class="d1"></i><i class="d2"></i><i class="d3"></i><i class="d4"></i><i class="d5"></i><i class="d6"></i><i class="d7"></i></span><span class="adays"><i>M</i><i>T</i><i>W</i><i>T</i><i>F</i><i>S</i><i class="on">S</i></span></div>
<div class="alist"><header><b>Recent</b><span>See all</span></header><div class="arows">
${ROW('rnew', 'te', 'Ece Yılmaz', 'Sent · just now', '−₺250')}
${ROW('r1', 'ts', 'Salary · Lost Comma', 'Today · 09:02', '+₺32 000', true)}
${ROW('r2', 'tc', 'Moda Coffee', 'Yesterday · 08:41', '−₺85')}
${ROW('r3', 'tf', 'Ferry · Kadıköy', 'Yesterday · 08:12', '−₺34')}
</div></div>
<nav class="atab"><span class="on">${I.home}Home</span><span>${I.card}Cards</span><span>${I.chart}Insights</span><span>${I.user}Profile</span></nav>
</div>
<div class="aflow">
<div class="asend"><header class="anav"><i>${I.back}</i><b>Send money</b><span></span></header><span class="asearch">${I.search}Name · phone or IBAN</span><small class="acap">Recent</small><div class="arec"><span class="ece"><i>EY</i>Ece</span><span><i class="c2">MA</i>Mert</span><span><i class="c3">ZK</i>Zeynep</span><span><i class="c4">CD</i>Can</span></div><small class="acap">Contacts</small><div class="acon"><span><i>AB</i><b>Ada Bulut</b><small>+90 532 •• •• 14</small></span><span><i class="c3">BO</i><b>Berk Oral</b><small>+90 541 •• •• 07</small></span><span><i class="c2">CT</i><b>Cem Tan</b><small>+90 505 •• •• 52</small></span></div></div>
<div class="aamt"><header class="anav"><i>${I.back}</i><b>Amount</b><span></span></header><span class="ato"><i>EY</i>To Ece Yılmaz</span><span class="aval"><b class="v0">₺0</b><b class="v1">₺2</b><b class="v2">₺25</b><b class="v3">₺250</b></span><small class="aleft">Balance ₺48 210.50</small><span class="anote">Add a note</span><div class="akeys">${KEYS.map((k, i) => `<i class="k${i}">${k}</i>`).join('')}</div><span class="asendb"><b>Send ₺250</b><i class="spin"></i></span></div>
<div class="aok"><span class="aokc">${I.check}</span><b>₺250 sent</b><small>to Ece Yılmaz · just now</small><span class="aokr"><span><small>Reference</small><b>PCK 2611 0942</b></span><span><small>Fee</small><b>Free</b></span></span><span class="adone">Done</span></div>
</div>
<i class="atap t1"></i><i class="atap t2"></i><i class="atap t3"></i><i class="atap t4"></i><i class="atap t5"></i><i class="atap t6"></i><i class="atap t7"></i>
<span class="ahome-ind"></span>
</div></div>`;

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
export function frameArt(loop: Safe | null = null): Safe[] {
  return [raw(WEB), raw(APP), raw(ID), raw(MO(loop ? loop.value : null)), raw(AUTO)];
}
