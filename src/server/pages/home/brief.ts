import { html, type Safe } from '../../html';
import type { Ctx } from '../../page';
import { HOME } from '../../content/home';
import { istanbulTime } from '../../layout/chrome';
import { href } from '../../routes';

export type ContactTheme = 'ink' | 'night' | 'paper' | 'milk' | 'lime' | 'coral' | 'blue';

const EMAIL = 'hello@lostcomma.co';

/** Studio hours: weekdays 09 to 19 in Istanbul. */
export function studioOpen(d: Date): boolean {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', weekday: 'short', hour12: false }).formatToParts(d);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  const wd = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  return !['Sat', 'Sun'].includes(wd) && hour >= 9 && hour < 19;
}

/** Characters a blank is wide (its `size`): the longer of what is in it and its placeholder. */
export const blankSize = (value: string, placeholder: string, min = 0): number => Math.max(min, value.length, placeholder.length) + 1;

/**
 * One blank of the sentence: the input · the selection the design tool draws round the one in
 * use (corners and a size label · the homepage's own "Metin · 146" box) · nothing else.
 */
function blank(o: { key: 'name' | 'what' | 'mail'; input: Safe; label: string; on?: boolean; bad?: boolean }): Safe {
  return html`<span class="bw${o.on ? ' on' : ''}${o.bad ? ' bad' : ''}" data-bw="${o.key}">${o.input}<span class="bsel" aria-hidden="true"><i class="hh hA"></i><i class="hh hB"></i><i class="hh hC"></i><i class="hh hD"></i></span><span class="btag mono" aria-hidden="true" data-btag>${o.label}</span></span>`;
}

/**
 * 06 · Start a project: one sentence with three blanks (name · what · email). A real form
 * underneath (works without JS · posts to /api/brief): the topic is the message. The client sizes
 * the blanks as you type · suggests topics in turn · moves the selection (and the host) to the
 * blank in use · posts with fetch and turns the sentence into the thanks.
 */
export function brief(ctx: Ctx, opts: { theme: ContactTheme; sent: boolean; error?: boolean }): Safe {
  const { t, lang } = ctx;
  const s = HOME[lang].sentence;
  const open = studioOpen(ctx.now);
  const longest = Math.max(...s.ideas.map((i) => i.length));
  const namePh = t('adın');
  const mailPh = t('sen@sirket.com');

  const name = html`<input class="blank" data-in="name" type="text" name="name" maxlength="60" autocomplete="name" placeholder="${namePh}" size="${blankSize('', namePh)}" aria-label="${t('Adın')}">`;
  const what = html`<input class="blank what" data-in="what" type="text" name="message" maxlength="200" autocomplete="off" placeholder="${s.ideas[0] ?? ''}" size="${blankSize('', '', longest)}" aria-label="${t('Ne hakkında konuşmak istiyorsun')}">`;
  const mail = html`<input class="blank" data-in="mail" type="email" name="email" required maxlength="200" autocomplete="email" placeholder="${mailPh}" size="${blankSize('', mailPh)}" aria-label="${t('E-posta adresin')}">`;
  // The host rests after the first line's words (the crew skips it once the thanks replace the form).
  const line = (parts: [string, string], b: Safe, rest = false) =>
    html`<span class="sl"${rest ? html` data-rest="design" data-rest-at="end 20 -8"` : ''}>${parts[0]}${b}${parts[1]}</span>`;

  const form = html`<form class="sf" data-sf method="post" action="/api/brief"${opts.sent ? html` hidden` : ''}>
<input type="hidden" name="lang" value="${lang}">
<label class="hp" aria-hidden="true">Company<input type="text" name="company" tabindex="-1" autocomplete="off"></label>
<p class="sen">
${line(s.name, blank({ key: 'name', input: name, label: `${t('Metin')} · ${t('ad')}`, on: !opts.error }), true)}
${line(s.what, blank({ key: 'what', input: what, label: `${t('Metin')} · ${t('konu')}` }))}
${line(s.mail, blank({ key: 'mail', input: mail, label: opts.error ? t('Bu adres eksik gibi') : `${t('Metin')} · ${t('e-posta')}`, on: opts.error, bad: opts.error }))}
</p>
<div class="sact">
<button type="submit" class="sgo" data-go><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 L15 5 M7 5 H15 V13"></path></svg><span data-gotxt>${t('Gönder')}</span></button>
<div class="sbody">
<p class="ssay"><b>${t('Gerisini sohbette konuşuruz.')}</b> ${t('Bütün ekip okur ve genelde bir gün içinde döneriz.')}</p>
<p class="fnote mono${opts.error ? ' err' : ''}" data-note role="status">${opts.error ? t('Gönderemedik. E-posta adresini kontrol edip tekrar dene.') : ''}</p>
<p class="lnote">${t('Bilgilerini sadece sana dönmek için kullanırız.')} <a href="${href(lang, 'kvkk')}">${t('KVKK aydınlatma metni')}</a></p>
</div>
<div class="salt">
<span class="mono">${t('ya da doğrudan yaz')}</span>
<a class="smail" href="mailto:${EMAIL}">${EMAIL}</a>
<button type="button" class="copy mono" data-copy>${t('Adresi kopyala')}</button>
</div>
</div>
</form>`;

  const done = html`<div class="sdone" data-sdone${opts.sent ? '' : html` hidden`}>
<p class="dh" role="status"><span data-dthanks>${s.thanks}<em>.</em></span> <span data-dwill>${s.plain}</span></p>
<div class="dteam"><span class="avs" aria-hidden="true"><span class="av c-design">D</span><span class="av c-code">C</span><span class="av c-motion">M</span></span><span class="mono" data-rest="design" data-rest-at="end 18 -10">${t('Üçümüz de okuyoruz')}</span></div>
<a class="again" data-again href="#contact">${t('Yeni bir ileti yaz')}</a>
</div>`;

  return html`<section class="ctc ct-${opts.theme}" data-sec="ctc" id="contact" data-host="design" aria-labelledby="ctc-h">
<div class="wrap">
<div class="ctop mono"><h2 class="k" id="ctc-h"><span>(06)</span><span>${t('Proje başlat')}</span></h2><span class="clock"><i class="${open ? '' : 'off'}" data-cdot></i><span>${t('İstanbul')}</span><b data-clock>${istanbulTime(ctx.now)}</b><span data-copen>· ${open ? t('stüdyo açık') : t('mesai dışı · sabah hepsini okuyoruz')}</span></span></div>
${form}
${done}
</div>
</section>`;
}
