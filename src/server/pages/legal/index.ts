import { LEGAL, LEGAL_UPDATED, type Block, type LegalDoc, type LegalKey } from '../../content/legal';
import { longDate } from '../../../shared/dates';
import { html, type Safe } from '../../html';
import { msg } from '../../msg';
import type { Ctx, CrewName, Page } from '../../page';
import { href } from '../../routes';
import type { ThemeId } from '../../themes';

/**
 * Gizlilik · KVKK · Çerezler. Calm reading pages: the text in sections with a contents list beside
 * it · "in short" in the hero · and each page's own interaction:
 *   privacy · your record: what we counted about this visit today · delete it · do not count me
 *   kvkk    · use your right: tick what you want and the application email writes itself
 *   cookies · in your browser now: what of ours is stored right now · delete one by one
 * Copy: src/server/content/legal.ts · the browser side: src/client/legal.ts
 */

export const LEGAL_EMAIL = 'hello@lostcomma.co';

/** {controller} · {address} · {email} · {mail} from the panel (placeholders until filled). */
function fill(ctx: Ctx, s: string): string {
  const { t, lang, settings } = ctx;
  const v: Record<string, string> = {
    controller: settings.text('legal.controller', lang) ?? t('[VERİ SORUMLUSU]'),
    address: settings.text('legal.address', lang) ?? settings.text('studio.address', lang) ?? t('[ADRES]'),
    email: settings.text('legal.email', lang) ?? LEGAL_EMAIL,
    mail: settings.text('legal.mail', lang) ?? t('[E-POSTA SERVİSİ]'),
  };
  // A separator never starts a line: it stays with the word before it.
  return s.replace(/\{(\w+)\}/g, (m, k: string) => v[k] ?? m).replace(/ · /g, '\u00a0· ');
}

/** The email in a sentence becomes a link. */
function prose(ctx: Ctx, s: string): Safe {
  const text = fill(ctx, s);
  const email = ctx.settings.text('legal.email', ctx.lang) ?? LEGAL_EMAIL;
  const at = text.indexOf(email);
  if (at < 0) return html`${text}`;
  return html`${text.slice(0, at)}<a href="mailto:${email}">${email}</a>${text.slice(at + email.length)}`;
}

function block(ctx: Ctx, b: Block): Safe {
  if (typeof b === 'string') return html`<p>${prose(ctx, b)}</p>`;
  if ('list' in b) return html`<ul>${b.list.map((x) => html`<li>${prose(ctx, x)}</li>`)}</ul>`;
  return html`<div class="ltab"><table><thead><tr>${b.table.head.map((h) => html`<th scope="col">${h}</th>`)}</tr></thead><tbody>${b.table.rows.map(
    ([a, b2, c]) => html`<tr><td><code>${a}</code></td><td>${b2}</td><td>${c}</td></tr>`,
  )}</tbody></table></div>`;
}

const OTHERS: { id: LegalKey; label: string }[] = [
  { id: 'privacy', label: msg('Gizlilik') },
  { id: 'kvkk', label: msg('KVKK aydınlatma metni') },
  { id: 'cookies', label: msg('Çerezler') },
];

/* ---------------- each page's own interaction (filled in by src/client/legal.ts) ---------------- */

function receipt(ctx: Ctx): Safe {
  const { t } = ctx;
  return html`<aside class="rcpt" data-rcpt aria-labelledby="rcpt-h" data-rest="code" data-rest-at="1 0.12 10 0" data-rest-at-m="0.88 1 0 14">
<h2 class="rh mono" id="rcpt-h"><span>${t('Senin kaydın')}</span><span>${t('Bugün')}</span></h2>
<div class="rbody" data-rbody aria-live="polite"><p class="rnote">${t('JS kapalıyken seni hiç saymıyoruz. Bugün hakkında bir kaydımız yok.')}</p></div>
<p class="rfoot mono">${t('Yarın bu kod da silinir')}</p>
<div class="racts" data-racts hidden><button type="button" class="lbtn" data-forget>${t('Bu kaydı sil')}</button><button type="button" class="lbtn ghost" data-nocount aria-pressed="false">${t('Beni sayma')}</button></div>
</aside>`;
}

const RIGHTS = [
  { k: 'learn', label: msg('Hakkımda hangi verileri tuttuğunuzu öğrenmek istiyorum') },
  { k: 'why', label: msg('Neden ve nasıl kullandığınızı öğrenmek istiyorum') },
  { k: 'who', label: msg('Kimlere aktardığınızı öğrenmek istiyorum') },
  { k: 'fix', label: msg('Yanlış ya da eksik olanların düzeltilmesini istiyorum') },
  { k: 'delete', label: msg('Verilerimin silinmesini istiyorum') },
  { k: 'object', label: msg('İşlenmesine itiraz ediyorum') },
] as const;

function letter(ctx: Ctx): Safe {
  const { t } = ctx;
  const email = ctx.settings.text('legal.email', ctx.lang) ?? LEGAL_EMAIL;
  return html`<aside class="ltr" data-letter data-to="${email}" aria-labelledby="ltr-h" data-rest="design" data-rest-at="1 0.1 10 0" data-rest-at-m="0.88 1 0 14">
<h2 class="rh mono" id="ltr-h"><span>${t('Hakkını kullan')}</span><span>KVKK m. 11</span></h2>
<fieldset class="lpick"><legend class="sr">${t('Ne istiyorsun')}</legend>${RIGHTS.map(
    (r) => html`<label class="lchk"><input type="checkbox" name="right" value="${r.k}"><span>${t(r.label)}</span></label>`,
  )}</fieldset>
<label class="lname"><span class="mono">${t('Adın soyadın')}</span><input type="text" data-lname autocomplete="name" maxlength="80"></label>
<p class="lhint">${t('Hiçbir şey bize gönderilmez. Düğme e-posta programını hazır bir başvuruyla açar.')}</p>
<a class="lbtn" data-mail href="mailto:${email}?subject=${encodeURIComponent(ctx.lang === 'tr' ? 'KVKK başvurusu' : 'KVKK application')}">${t('Başvuruyu e-postada aç')}</a>
</aside>`;
}

function jar(ctx: Ctx): Safe {
  const { t } = ctx;
  const items = [
    { k: 'lang', kind: 'cookie', label: msg('Dil seçimin') },
    { k: 'lc-comma', kind: 'local', label: msg('Virgülü buldun') },
    { k: 'lc-saved-notes', kind: 'local', label: msg('Kaydettiğin notlar') },
    { k: 'lc-stats-off', kind: 'local', label: msg('Beni sayma tercihin') },
  ];
  return html`<aside class="jar" data-jar aria-labelledby="jar-h" data-rest="code" data-rest-at="1 0.12 10 0" data-rest-at-m="0.88 1 0 14">
<h2 class="rh mono" id="jar-h"><span>${t('Şu an tarayıcında')}</span><span data-jcount></span></h2>
<ul class="jlist">${items.map(
    (i) => html`<li data-item="${i.k}" data-kind="${i.kind}"><code>${i.k}</code><span>${t(i.label)}</span><em class="mono" data-state>${t('bakılıyor')}</em><button type="button" class="lx" data-del hidden aria-label="${t('{k} silinsin', { k: i.k })}">${t('Sil')}</button></li>`,
  )}</ul>
<p class="rfoot mono">${t('Başka bir şey yok. Bakmak için tarayıcının geliştirici araçlarını açabilirsin.')}</p>
</aside>`;
}

/* ---------------- the page ---------------- */

function body(ctx: Ctx, key: LegalKey): Safe {
  const { t, lang } = ctx;
  const doc: LegalDoc = LEGAL[lang][key];
  const side = key === 'privacy' ? receipt(ctx) : key === 'kvkk' ? letter(ctx) : jar(ctx);
  const updated = longDate(new Date(`${LEGAL_UPDATED}T12:00:00Z`), lang);
  return html`<section class="lhero" data-sec="hero" id="top"><div class="wrap">
<p class="kick mono" data-rest="motion" data-rest-at="end 14 -2"><i class="fi" aria-hidden="true"></i><span>${doc.kick}</span><span aria-hidden="true">·</span><span class="url">lostcomma.co${ctx.path}</span></p>
<h1 class="ttl" data-rest="${key === 'kvkk' ? 'code' : 'design'}" data-rest-at="end 12 -12">${doc.title}</h1>
<div class="lrow">
<div class="lintro">
<p class="lede">${prose(ctx, doc.lede)}</p>
<div class="short"><h2 class="mono">${t('Kısaca')}</h2><ul>${doc.short.map((s) => html`<li>${prose(ctx, s)}</li>`)}</ul></div>
<p class="upd mono">${t('Son güncelleme')} · <time datetime="${LEGAL_UPDATED}">${updated}</time></p>
</div>
${side}
</div>
</div></section>
<section class="ldoc" data-sec="doc"><div class="wrap">
<nav class="toc" aria-labelledby="toc-h"><h2 class="mono" id="toc-h">${t('İçindekiler')}</h2><ol>${doc.sections.map((s, i) => html`<li><a href="#${s.id}" data-toc><span class="mono">${String(i + 1).padStart(2, '0')}</span>${s.h}</a></li>`)}</ol>
<h2 class="mono">${t('Diğer metinler')}</h2><ul>${OTHERS.filter((o) => o.id !== key).map((o) => html`<li><a href="${href(lang, o.id)}">${t(o.label)} <span aria-hidden="true">→</span></a></li>`)}</ul></nav>
<article class="ltext">${doc.sections.map(
    (s, i) => html`<section class="lsec" id="${s.id}" aria-labelledby="h-${s.id}"><h2 id="h-${s.id}"${i === 0 ? html` data-rest="host" data-rest-at="end 16 -6"` : ''}><span class="mono">${String(i + 1).padStart(2, '0')}</span>${s.h}</h2>${s.body.map((b) => block(ctx, b))}</section>`,
  )}</article>
</div></section>`;
}

function legalPage(key: LegalKey, o: { theme: ThemeId; host: CrewName; title: string; description: string }): Page {
  return {
    id: key,
    theme: o.theme,
    host: o.host,
    scripts: ['legal'],
    styles: ['legal'],
    title: (t) => t(o.title),
    description: (t) => t(o.description),
    body: (ctx) => body(ctx, key),
    next: { to: 'start', kick: msg('Bir sorun varsa'), big: msg('Konuşalım'), tone: 'lime' },
  };
}

export const privacyPage = legalPage('privacy', { theme: 'paper', host: 'code', title: msg('Gizlilik'), description: msg('Ne topladığımız · neden topladığımız ve ne zaman sildiğimiz. Çerez yok · reklam yok.') });
export const kvkkPage = legalPage('kvkk', { theme: 'milk', host: 'design', title: msg('KVKK aydınlatma metni'), description: msg('Kişisel verilerini nasıl işlediğimiz ve haklarını nasıl kullanacağın.') });
export const cookiesPage = legalPage('cookies', { theme: 'paper', host: 'motion', title: msg('Çerezler'), description: msg('Reklam ve takip çerezi yok. Tarayıcında tuttuklarımızı görüp silebilirsin.') });
