/**
 * Decorative artwork for the homepage: the fake client sites on the board and the little process
 * illustrations (the service frame's products live in frames.ts). Pure markup we wrote ourselves (raw()).
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
