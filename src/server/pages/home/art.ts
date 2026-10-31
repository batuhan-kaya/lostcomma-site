/**
 * Decorative artwork for the homepage: the fake client sites inside the service frame and
 * the board, and the little process illustrations. Pure markup we wrote ourselves (raw()).
 * Everything here sits inside aria-hidden containers. The mock client copy stays as designed.
 */
import { raw, type Safe } from '../../html';

const SAIL = `<svg viewBox="0 0 520 340" preserveAspectRatio="xMidYMid slice"><path d="M170 92 L170 200 L230 200 Z" fill="#FBF4EA"></path><path d="M163 110 L163 200 L128 200 Z" fill="#EFE2D2"></path><path d="M118 203 L236 203 L223 214 L131 214 Z" fill="#0E1F40"></path><path d="M380 150 L380 204 L408 204 Z" fill="#FBF4EA"></path><path d="M368 206 L414 206 L409 212 L373 212 Z" fill="#0E1F40"></path></svg>`;
const CLAY = `<svg viewBox="0 0 240 300" preserveAspectRatio="xMidYMax meet"><path d="M52 252 Q30 200 50 160 Q60 140 58 110 L74 110 Q72 140 82 160 Q102 200 80 252 Z" fill="#C8643B"></path><path d="M128 160 L152 160 L150 180 L130 180 Z" fill="#1E5B5A"></path><path d="M112 252 Q96 252 96 222 Q96 180 140 178 Q184 180 184 222 Q184 252 168 252 Z" fill="#1E5B5A"></path><path d="M190 252 Q182 230 194 214 L198 200 L210 200 L214 214 Q226 230 218 252 Z" fill="#E0A54A"></path><rect x="20" y="252" width="210" height="5" fill="#B9A893"></rect></svg>`;

/**
 * Drawn board artwork keyed by the project's `art` field. A project with a cover image shows the
 * image instead. The last one belongs to the Lab frame, which is not a project.
 */
export const BOARD_ART: Record<string, Safe> = {
  sail: raw(`<span class="ar ar-sail"><span class="su"></span>${SAIL}<b class="tt">Catch the<br>north wind.</b></span>`),
  cera: raw(`<span class="ar ar-clay">${CLAY}<b class="tt">Clay</b></span>`),
  fest: raw(`<span class="ar ar-fest"><span class="rg r1"></span><span class="rg r2"></span><span class="rg r3"></span><span class="mono">Istanbul · 26</span><b class="tt">SES</b></span>`),
  fin: raw(`<span class="ar ar-fin"><span class="dt"></span><span class="ph"><span class="mono">Balance</span><b>+12.4%</b><svg viewBox="0 0 190 120"><polyline points="0,104 28,88 52,96 80,60 108,68 136,36 164,44 190,12" fill="none" stroke="#1FB884" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"></polyline></svg></span></span>`),
  cof: raw(`<span class="ar ar-roast"><span class="bag"><span class="lbl">No. 7</span></span></span>`),
  arc: raw(`<span class="ar ar-arch"><span class="mono">Form follows light</span><i class="k1"></i><i class="k2"></i><i class="k3"></i><i class="k4"></i><i class="k5"></i></span>`),
  book: raw(`<span class="ar ar-book"><b class="tt">Read<br>slowly.</b><i class="bk k1"></i><i class="bk k2"></i><i class="bk k3"></i><i class="bk k4"></i><i class="bk k5"></i><span class="sh"></span></span>`),
  lab: raw(`<span class="ar ar-lab"><span>A</span><span>a</span><span>g</span><span>!</span><span class="mono">Lab · type that breathes</span></span>`),
};

/** The four things inside the service frame: website · app · identity · motion. */
export const FRAME_ART: Safe[] = [
  raw(`<div class="fc-web"><span class="wn"><b>LODOS</b><span class="wl"><span>Fleet</span><span>Lessons</span><span>Club</span></span><span class="wb">Join</span></span><span class="wh"><span class="wsun"></span><svg viewBox="0 0 752 286" preserveAspectRatio="xMidYMax slice"><path d="M250 92 L250 206 L314 206 Z" fill="#FBF4EA"></path><path d="M243 112 L243 206 L206 206 Z" fill="#EFE2D2"></path><path d="M196 209 L322 209 L308 221 L210 221 Z" fill="#0E1F40"></path><path d="M560 160 L560 214 L590 214 Z" fill="#FBF4EA"></path><path d="M546 216 L596 216 L590 222 L552 222 Z" fill="#0E1F40"></path><g fill="#FFE2C4" opacity=".55"><rect x="440" y="236" width="80" height="2"></rect><rect x="420" y="250" width="120" height="2"></rect><rect x="452" y="264" width="56" height="2"></rect></g></svg><b class="wt">Catch the<br>north wind.</b><span class="wcta">Book a sail</span></span><span class="wcards"><span><i></i><span><b>Moda</b><small>Sunday mornings</small></span></span><span><i></i><span><b>Caddebostan</b><small>Racing season</small></span></span><span><i></i><span><b>Kalamış</b><small>Night sails</small></span></span></span></div>`),
  raw(`<div class="fc-app"><span class="ah mono">Balance</span><b class="abig">₺48 210</b><span class="adelta">+12.4% this month</span><svg viewBox="0 0 238 120" preserveAspectRatio="none"><defs><linearGradient id="lv-ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3EE0A8" stop-opacity=".35"></stop><stop offset="1" stop-color="#3EE0A8" stop-opacity="0"></stop></linearGradient></defs><path d="M0 98 L30 84 L58 92 L90 60 L120 68 L150 36 L182 44 L214 16 L238 22 L238 120 L0 120 Z" fill="url(#lv-ag)"></path><polyline points="0,98 30,84 58,92 90,60 120,68 150,36 182,44 214,16 238,22" fill="none" stroke="#1FB884" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"></polyline><circle cx="214" cy="16" r="5" fill="#0E0E0F"></circle></svg><span class="aseg"><i class="on">1W</i><i>1M</i><i>1Y</i></span><span class="abtns"><b>Send</b><b>Receive</b></span><span class="alist"><span><i></i>Coffee<em>−₺85</em></span><span><i></i>Studio rent<em>−₺9 400</em></span><span><i></i>Invoice paid<em>+₺22 000</em></span></span></div>`),
  raw(`<div class="fc-id"><span class="im"><svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="72" fill="#C8643B"></circle><path d="M62 120 Q44 96 54 72 Q60 60 58 40 L92 40 Q90 60 96 72 Q106 96 88 120 Z" fill="#F7EFE4"></path><rect x="54" y="34" width="42" height="9" rx="4" fill="#F7EFE4"></rect></svg></span><b class="iw">Clay</b><span class="ity"><b>Aa</b><small class="mono">Anybody italic · 820</small></span><span class="isw"><i></i><i></i><i></i><i></i></span></div>`),
  raw(`<div class="fc-mo"><span class="mstage"><i class="mball"></i><b class="mword">Hello</b></span><span class="mtc mono">00:04:12</span><span class="mtl"><span class="mtr"><em class="mono">Position</em><i class="kf l0"></i><i class="kf l46"></i><i class="kf l96"></i></span><span class="mtr"><em class="mono">Scale</em><i class="kf l12"></i><i class="kf l70"></i></span><span class="mtr"><em class="mono">Weight</em><i class="kf l4"></i><i class="kf l58"></i><i class="kf l88"></i></span><i class="mph"></i></span></div>`),
];

/** Process cards: listen · sketch · prototype · build · launch. Chat lines come in translated. */
export function stepArt(i: number, chat: { ask: string; answer: string; live: string }): Safe {
  switch (i) {
    case 0:
      return raw(
        `<span class="il il-ask"><span class="q1"></span><span class="q2"></span><span class="q3"><i></i><i></i><i></i></span></span>`
          .replace('<span class="q1"></span>', `<span class="q1">${escape(chat.ask)}</span>`)
          .replace('<span class="q2"></span>', `<span class="q2">${escape(chat.answer)}</span>`),
      );
    case 1:
      return raw(`<span class="il"><svg viewBox="0 0 156 212"><rect class="sk" x="14" y="16" width="128" height="80" rx="4"></rect><path class="sk x" d="M14 16 L142 96 M142 16 L14 96"></path><path class="sk" d="M14 112 L110 112 M14 126 L90 126 M14 140 L100 140"></path><rect class="sk" x="14" y="160" width="56" height="20" rx="10"></rect><path class="sk" d="M96 176 C110 160 126 168 134 152 M128 150 L135 151 L134 158"></path><circle class="sk" cx="128" cy="190" r="9"></circle></svg></span>`);
    case 2:
      return raw(`<span class="il"><svg viewBox="0 0 156 212"><rect x="12" y="20" width="58" height="104" rx="8" fill="#ECEBE6"></rect><rect x="86" y="70" width="58" height="104" rx="8" fill="#ECEBE6"></rect><rect x="20" y="96" width="42" height="14" rx="4" fill="rgba(59,53,255,.18)" stroke="#3B35FF" stroke-width="1.5"></rect><path d="M62 103 C84 103 70 122 86 122" fill="none" stroke="#3B35FF" stroke-width="2"></path><circle cx="62" cy="103" r="3.5" fill="#3B35FF"></circle><rect x="94" y="82" width="42" height="8" rx="4" fill="#C9C7C0"></rect><rect x="94" y="96" width="30" height="8" rx="4" fill="#C9C7C0"></rect><rect x="20" y="32" width="42" height="8" rx="4" fill="#C9C7C0"></rect><rect x="20" y="46" width="30" height="8" rx="4" fill="#C9C7C0"></rect><path d="M40 160 L40 192 L48 185 L53 196 L57 194 L52 183 L62 183 Z" fill="#0E0E0F"></path></svg></span>`);
    case 3:
      return raw(`<span class="il il-build"><i class="a"></i><i class="b"></i><i class="c"></i><i class="d"></i><i class="e"></i><i class="f"></i><i class="g"></i><i class="h"></i><span class="cur2"></span></span>`);
    default:
      return raw(
        `<span class="il il-ship"><span class="ts"><i></i>${escape(chat.live)}</span><svg viewBox="0 0 156 140" preserveAspectRatio="none"><path d="M8 120 L36 112 L58 116 L80 92 L102 96 L124 60 L148 30" fill="none" stroke="#3B35FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path><path d="M8 132 L148 132" stroke="#D8D6D0" stroke-width="1.5"></path></svg></span>`,
      );
  }
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}
