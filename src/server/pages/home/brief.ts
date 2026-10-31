import { html, raw, type Safe } from '../../html';
import type { Ctx } from '../../page';
import { BRIEF_BUDGETS, BRIEF_TIMES, BRIEF_TYPES, HOME } from '../../content/home';
import { istanbulTime } from '../../layout/chrome';

export type ContactTheme = 'ink' | 'paper' | 'lime' | 'coral' | 'blue';

const GLYPHS = [
  '<rect x="3" y="6" width="30" height="24" rx="4"></rect><path d="M3 12 H33 M9 18 H23 M9 23 H18"></path>',
  '<rect x="10" y="3" width="16" height="30" rx="4"></rect><path d="M15.5 7.5 H20.5 M15.5 28.5 H20.5"></path>',
  '<circle cx="13" cy="15" r="9"></circle><rect x="15" y="15" width="16" height="16" rx="3"></rect>',
  '<path d="M3 31 C17 31 13 7 30 7"></path><circle cx="30" cy="7" r="3.2"></circle><path d="M3 34 H33" opacity=".35"></path>',
];

/** Studio hours: weekdays 09 to 19 in Istanbul. */
export function studioOpen(d: Date): boolean {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', weekday: 'short', hour12: false }).formatToParts(d);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  const wd = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  return !['Sat', 'Sun'].includes(wd) && hour >= 9 && hour < 19;
}

/**
 * 06 · Start a project: the brief is a shared file. A real form underneath (works without JS):
 * tiles are checkboxes · the timeline and budget are radios. The client adds the knob drag,
 * the live sentence and the team's reactions, and posts with fetch.
 */
export function brief(ctx: Ctx, opts: { theme: ContactTheme; sent: boolean; error?: boolean }): Safe {
  const { t, lang } = ctx;
  const c = HOME[lang];
  const open = studioOpen(ctx.now);
  const tick = html`<i class="ck" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3.5 8.5 L6.5 11.5 L12.5 4.5"></path></svg></i>`;

  const form = html`<form class="fb" data-fb method="post" action="/api/brief"${opts.sent ? html` hidden` : ''}>
<input type="hidden" name="lang" value="${lang}">
<label class="hp" aria-hidden="true">Company<input type="text" name="company" tabindex="-1" autocomplete="off"></label>
<fieldset class="blk" data-blk="type" data-tm="" data-yn="${t('sen')}">
<div class="bhd"><legend class="blab"><span class="mono">01</span>${t('Ne yapıyoruz')}</legend><span class="bh mono" data-typehint>${t('İstediğin kadar seç')}</span></div>
<div class="tiles">${c.types.map(
    (ty, i) => html`<label class="tile t${i}" data-tile="${i}"><input class="sr" type="checkbox" name="types" value="${BRIEF_TYPES[i]}"><svg class="gl" viewBox="0 0 36 36" aria-hidden="true">${raw(GLYPHS[i] ?? '')}</svg><b>${ty.n}</b>${tick}</label>`,
  )}</div>
</fieldset>
<fieldset class="blk" data-blk="time" data-tm="" data-yn="${t('sen')}">
<div class="bhd"><legend class="blab"><span class="mono">02</span>${t('Ne zaman yayına çıksın')}</legend><span class="bh mono" data-timehint>${t('Sürükle ya da dokun')}</span></div>
<div class="tl none" data-tl>
<span class="trk" aria-hidden="true"><i class="fill"></i></span>
<span class="knob" data-knob aria-hidden="true"></span>
${c.times.map(
  (ti, i) => html`<label class="stp s${i}" data-stp="${i}"><input class="sr" type="radio" name="time" value="${BRIEF_TIMES[i]}"><i aria-hidden="true"></i><span class="mono">${ti.n}</span></label>`,
)}
</div>
</fieldset>
<fieldset class="blk" data-blk="budget" data-tm="" data-yn="${t('sen')}">
<div class="bhd"><legend class="blab"><span class="mono">03</span>${t('Kabaca bütçe')}</legend><span class="bh mono">${t('Kesin olması gerekmiyor')}</span></div>
<div class="chips">${c.budgets.map(
    (b, i) => html`<label class="chip" data-chip="${i}"><input class="sr" type="radio" name="budget" value="${BRIEF_BUDGETS[i]}">${b.n}</label>`,
  )}</div>
</fieldset>
<fieldset class="blk" data-blk="you" data-tm="" data-yn="${t('sen')}">
<div class="bhd"><legend class="blab"><span class="mono">04</span>${t('Senin hakkında')}</legend><span class="bh mono">${t('Sana dönebilmemiz için')}</span></div>
<div class="ins">
<input class="inp" data-in="name" type="text" name="name" maxlength="60" autocomplete="name" placeholder="${t('Adın')}" aria-label="${t('Adın')}">
<input class="inp" data-in="mail" type="email" name="email" required maxlength="200" autocomplete="email" placeholder="${t('sen@sirket.com')}" aria-label="${t('E-posta')}">
<input class="inp full" data-in="msg" type="text" name="message" maxlength="2000" placeholder="${t('Bilmemiz gereken başka bir şey')}" aria-label="${t('Bilmemiz gereken başka bir şey')}">
</div>
</fieldset>
<div class="sum">
<div><span class="sl mono">${t('Şimdiye kadarki brief')}</span><p class="empty" data-sum>${t('Dosyayı doldurmaya başla. Brief’i sen yazdıkça biz yazacağız.')}</p></div>
<button type="submit" class="send" data-send><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 L15 5 M7 5 H15 V13"></path></svg><span data-sendtxt>${t('Gönder')}</span></button>
</div>
<p class="fnote mono${opts.error ? ' err' : ''}" data-note role="status">${opts.error ? t('Gönderemedik. E-posta adresini kontrol edip tekrar dene.') : t('Genelde bir gün içinde döneriz')}</p>
</form>`;

  const thread = html`<div class="thread" data-thread${opts.sent ? '' : html` hidden`}>
<div class="bpin"><span class="sl mono">${t('Senin brief’in')}</span><p data-pinsum>${t('Brief’in bize ulaştı.')}</p><div class="ptags" data-ptags></div></div>
<div class="msgs" data-msgs>
<div class="msg" data-msg="0"${opts.sent ? '' : html` hidden`}><span class="av c-design" aria-hidden="true">D</span><span class="mbub"><b>design</b><span data-hi>${t('Selam. Brief için teşekkürler.')}</span></span></div>
<div class="msg" data-msg="1"${opts.sent ? '' : html` hidden`}><span class="av c-code" aria-hidden="true">C</span><span class="mbub"><b>code</b>${t('Bugün okuyup bir gün içinde dönüyoruz.')}</span></div>
<div class="msg" data-msg="2"${opts.sent ? '' : html` hidden`}><span class="av c-motion" aria-hidden="true">M</span><span class="mbub"><b>motion</b>${t('Bu arada sırada ne var bir bak.')}</span></div>
<div class="msg" data-typing hidden><span class="av c-design" data-typav aria-hidden="true">D</span><span class="mbub"><span class="dots" aria-label="${t('yazıyor')}"><i></i><i></i><i></i></span></span></div>
</div>
<div class="nextup${opts.sent ? ' on' : ''}" data-nextup><span class="mono">${t('Sırada ne var')}</span>
<div class="nxr"><i>1</i><span>${t('Brief’ini okuyoruz')}</span><span class="mono">${t('Bugün')}</span></div>
<div class="nxr"><i>2</i><span>${t('Kısa bir tanışma görüşmesi')}</span><span class="mono">${t('Bu hafta')}</span></div>
<div class="nxr"><i>3</i><span>${t('İlk eskizler dosyanda')}</span><span class="mono">${t('Gelecek hafta')}</span></div>
</div>
<div class="tfoot"><a class="again" data-again href="#contact">${t('Yeni bir brief başlat')}</a><span class="mono">${t('Brief’in bize ulaştı')}</span></div>
</div>`;

  return html`<section class="ctc ct-${opts.theme}" data-sec="ctc" id="contact" data-host="design">
<span class="rest" data-rest="design" data-rest-at="0.48 0.27" data-rest-at-m="0.82 0.06"></span>
<div class="wrap">
<div class="ctop mono"><span class="k"><span>(06)</span><span>${t('Proje başlat')}</span></span><span class="clock"><i class="${open ? '' : 'off'}" data-cdot></i><span>${t('İstanbul')}</span><b data-clock>${istanbulTime(ctx.now)}</b><span data-copen>· ${open ? t('stüdyo açık') : t('mesai dışı · sabah hepsini okuyoruz')}</span></span></div>
<div class="cl">
<h2 class="ch">${lang === 'tr' ? html`<span class="ln">Yeni bir</span><span class="ln">${sbox(t('dosya'), t)}</span><span class="ln">açalım<span class="pd">.</span></span>` : html`<span class="ln">Let’s open</span><span class="ln">a ${sbox('new file', t)}<span class="pd">.</span></span>`}</h2>
<p class="cp">${t('Ne yaptığını anlat. Bütün ekip her brief’i okur ve dosyana katılır. Genelde bir gün içinde döneriz.')}</p>
<div class="info">
<div class="row"><span class="mono">${t('E-posta')}</span><a class="mail" href="mailto:hello@lostcomma.co">hello@lostcomma.co</a><button type="button" class="copy mono" data-copy>${t('Kopyala')}</button></div>
<div class="row"><span class="mono">${t('Stüdyo')}</span><span class="val">${t('İstanbul · her yerden ekiplerle çalışıyoruz')}</span><span></span></div>
<div class="row"><span class="mono">${t('Başka yerler')}</span><span class="soc"><a href="#contact">Instagram</a><a href="#contact">LinkedIn</a><a href="#contact">Behance</a></span><span></span></div>
</div>
</div>
<div class="file" data-file>
<div class="fh"><span class="fname"><i class="fi" aria-hidden="true"></i><b data-fname>${t('İsimsiz brief')}</b><span class="st mono${opts.sent ? ' sent' : ''}" data-st>${opts.sent ? t('Gönderildi · az önce') : t('Taslak')}</span></span><span class="avs" aria-hidden="true"><span class="av c-design" data-av2="design">D</span><span class="av c-code" data-av2="code">C</span><span class="av c-motion" data-av2="motion">M</span><span class="av c-you" data-youinit>${t('S')}</span></span></div>
${form}
${thread}
</div>
</div>
</section>`;
}

function sbox(word: string, t: Ctx['t']): Safe {
  return html`<span class="sbox"><span class="stx">${word}</span><i class="hh hA" aria-hidden="true"></i><i class="hh hB" aria-hidden="true"></i><i class="hh hC" aria-hidden="true"></i><i class="hh hD" aria-hidden="true"></i><span class="sz mono" aria-hidden="true">${t('Metin')} · 132</span></span>`;
}

