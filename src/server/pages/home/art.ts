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
