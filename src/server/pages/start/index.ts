import { ABOUT_KEYS, START, type About } from '../../content/start';
import { bookingByToken, takenBetween, ticketNo, type Booking } from '../../data/bookings';
import { html, type Safe } from '../../html';
import type { Lang, T } from '../../i18n';
import { footer, nextBand } from '../../layout/chrome';
import { firstName, istTime } from '../../mail/messages';
import { msg } from '../../msg';
import type { Ctx, Page } from '../../page';
import { href } from '../../routes';
import { bookingDays, cityOf, istDay, istInstant, localHm, slotKey, slotMinutes } from '../../../shared/booking';
import { dayLabel, dayParts } from '../../../shared/dates';
import { istanbul, studioOpen } from '../../../shared/istanbul';

/**
 * Start · office hours. Two clocks (the studio's and yours) · ten working days · a ruler where our
 * working day meets yours · only the slots that fit both · a real booking that sends a calendar
 * invitation. Without JS it is a form: days are links · slots are radio buttons · Istanbul time.
 */
export interface StartData {
  days: string[];
  day: string;
  /** Booked instants (ms). */
  taken: number[];
  ticket: Booking | null;
  state: 'taken' | 'error' | 'slow' | null;
}

export function ticketHtml(lang: Lang, t: T, b: Booking): Safe {
  const copy = START[lang];
  const about = (b.about as About[]).map((k) => copy.about[k] ?? k).join(' · ');
  const yours = b.tz !== 'Europe/Istanbul' ? html`${t('Senin saatinle {time} ({city})', { time: localHm(b.startsAt, b.tz), city: cityOf(b.tz) })}. ` : '';
  return html`<div class="ticket" role="status" tabindex="-1" data-ticket>
<div class="tl"><span class="mono">${t('Ayrıldı · görüşürüz {name}', { name: firstName(b.name) })}</span><b>${dayLabel(istDay(b.startsAt), lang)}<br>${istTime(b.startsAt)} ${t('İstanbul')}</b><p>${yours}${t('Takvim davetini e-postana gönderiyoruz. Konuşacağın kişi projeni yapacak ekipten biri olacak.')}</p><a class="ics mono" href="/api/booking/${b.token}.ics" download="lost-comma.ics">${t('Takvime ekle')} <span aria-hidden="true">↓</span></a></div>
<div class="tr2"><span class="mono">${t('Bilet')}</span><b>${ticketNo(b.no)}</b><span class="mono">${about || t('Merhaba')}</span><a class="again mono" href="${href(lang, 'start')}#book">${t('Başka bir görüşme ayır')}</a></div>
</div>`;
}

function hero(ctx: Ctx): Safe {
  const { t } = ctx;
  const copy = START[ctx.lang];
  const now = istanbul(ctx.now);
  const open = studioOpen(ctx.now);
  return html`<section class="shero" data-sec="hero" id="top"><div class="wrap">
<p class="kick mono"><i class="fi" aria-hidden="true"></i><span>${t('Başla')}</span><span aria-hidden="true">·</span><span class="url">lostcomma.co${ctx.path}</span></p>
<div class="sh">
<div class="shl">
<h1 class="ttl" data-rest="design" data-rest-at="end 14 -14">${t('Konuşalım.')}</h1>
<p class="lede" data-rest="motion" data-rest-at="end 12 -4">${copy.lede[0]}<b>${copy.lede[1]}</b>${copy.lede[2]}</p>
</div>
<div class="clocks">
<div class="clk ist"><span class="mono">${t('Stüdyo · İstanbul')}</span><b data-ist>${now.hm}</b><span class="st mono${open ? ' on' : ''}" data-open><i aria-hidden="true"></i><span>${open ? t('Şu an açığız') : t('Şu an kapalıyız')}</span></span></div>
<div class="diff mono" data-diff hidden><span data-difft></span><b data-overt></b></div>
<div class="clk yz" data-yclk hidden><span class="mono">${t('Sen')} · <span data-zone></span></span><b data-yout></b><span class="city" data-city data-rest="code" data-rest-at="end 12 -4"></span></div>
</div>
</div>
</div></section>`;
}

function days(ctx: Ctx, d: StartData): Safe {
  const { t, lang } = ctx;
  const full = (day: string) => slotMinutes().every((m) => d.taken.includes(istInstant(day, m).getTime()));
  return html`<div class="days" role="group" aria-label="${t('Gün')}">${d.days.map((day) => {
    const p = dayParts(day, lang);
    const on = day === d.day;
    return html`<a class="day${on ? ' on' : ''}${full(day) ? ' full' : ''}" href="?day=${day}#book" data-day="${day}"${on ? html` aria-current="date"` : ''}><span class="mono" aria-hidden="true">${p.dowShort}</span><b aria-hidden="true">${p.d}</b><span class="mono" aria-hidden="true">${p.monthShort}</span><span class="sr">${dayLabel(day, lang)}</span></a>`;
  })}</div>
<div class="ovl" data-ovl aria-hidden="true">
<div class="orow"><span class="mono">${t('İstanbul')}</span><div class="otrack"><span class="oband ist mono">${t('Stüdyo 10:00 ile 18:00')}</span></div></div>
<div class="orow yrow" data-yrow hidden><span class="mono" data-ycity></span><div class="otrack"><span class="oband usr mono" data-yband></span><i class="ohit" data-hit></i></div></div>
<div class="oticks mono">${[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => html`<span>${String(h).padStart(2, '0')}</span>`)}</div>
<p class="onote mono"><span>${t('Cetveldeki saatler İstanbul saati')}</span><b data-overt2></b></p>
</div>`;
}

function slots(ctx: Ctx, d: StartData): Safe {
  const { t } = ctx;
  return html`<div class="slots" role="radiogroup" aria-label="${t('Saat')}">${d.days.map(
    (day) => html`<div class="sday" data-sday="${day}"${day === d.day ? '' : html` hidden`}>${slotMinutes().map((m) => {
      const at = istInstant(day, m);
      const taken = d.taken.includes(at.getTime());
      return html`<label class="slot${taken ? ' taken' : ''}" data-m="${m}"><input type="radio" name="slot" value="${slotKey(day, m)}"${taken ? ' disabled' : ''}><b>${istTime(at)}</b><span class="mono" data-yt>${taken ? t('dolu') : t('İstanbul')}</span></label>`;
    })}</div>`,
  )}</div>
<p class="noslots" data-noslots hidden>${t('Bu gün çalışma saatlerimiz örtüşmüyor. Başka bir gün seç ya da bize yaz ve birlikte bir saat bulalım.')}</p>`;
}

function form(ctx: Ctx): Safe {
  const { t } = ctx;
  const copy = START[ctx.lang];
  return html`<div class="fm">
<label class="fld"><span class="mono">${t('Adın')}</span><input class="inp" name="name" required maxlength="60" autocomplete="name"></label>
<label class="fld"><span class="mono">${t('E-posta')}</span><input class="inp" type="email" name="email" required maxlength="200" autocomplete="email" spellcheck="false"></label>
<fieldset class="about"><legend class="mono">${t('Konu')}</legend>${ABOUT_KEYS.map(
    (k) => html`<label class="chip"><input type="checkbox" name="about" value="${k}"><span>${copy.about[k]}</span></label>`,
  )}</fieldset>
<label class="fld note"><span class="mono">${t('Bir iki cümleyle anlat · isteğe bağlı')}</span><textarea class="inp" name="note" maxlength="600" rows="3"></textarea></label>
<div class="sum"><p data-sum aria-live="polite">${t('Önce bir gün ve bir saat seç.')}</p><button type="submit" class="go" data-go>${t('Yirmi dakika ayır')} <span aria-hidden="true">↗</span></button></div>
</div>`;
}

function book(ctx: Ctx, d: StartData): Safe {
  const { t, lang } = ctx;
  const message = d.state === 'taken' ? t('Biri o saati senden hemen önce aldı. Başka bir saat seç.') : d.state === 'slow' ? t('Kısa sürede çok fazla deneme oldu. Biraz sonra tekrar dene ya da bize yaz.') : d.state === 'error' ? t('Bir şey eksik kaldı. Gün ve saat ve adın ve e-postan gerekli.') : null;
  if (d.ticket) {
    return html`<section class="book" data-sec="book" id="book" data-host="design"><div class="wrap"><div class="booked">${ticketHtml(lang, t, d.ticket)}</div></div></section>`;
  }
  return html`<section class="book" data-sec="book" id="book" data-host="design"><div class="wrap">
<form class="panel" method="post" action="/api/booking" data-book>
<input type="hidden" name="lang" value="${lang}"><input type="hidden" name="tz" value="Europe/Istanbul" data-tz>
<div class="hp" aria-hidden="true"><label>Company <input name="company" tabindex="-1" autocomplete="off"></label></div>
${message ? html`<p class="bmsg" role="alert" data-bmsg>${message}</p>` : html`<p class="bmsg" role="alert" data-bmsg hidden></p>`}
<div class="pst"><div class="sl"><span class="n" aria-hidden="true">1</span><h2>${t('Bir gün seç')}</h2><span class="mono">${t('Sadece hafta içi')}</span></div><div>${days(ctx, d)}</div></div>
<div class="pst"><div class="sl"><span class="n" aria-hidden="true">2</span><h2>${t('Bir saat seç')}</h2><span class="mono">${t('Yirmi dakika · görüntülü')}</span></div><div>${slots(ctx, d)}</div></div>
<div class="pst"><div class="sl"><span class="n" aria-hidden="true">3</span><h2>${t('Sen kimsin')}</h2><span class="mono">${t('Her birini okuyoruz')}</span></div><div>${form(ctx)}</div></div>
</form>
</div></section>`;
}

function ways(ctx: Ctx): Safe {
  const { t, lang } = ctx;
  const w = START[lang].ways;
  return html`<section class="ways" data-sec="ways" data-host="design"><div class="wrap">
<p class="kick mono"><i class="fi" aria-hidden="true"></i>${t('Başka yollar')}</p>
<h2 class="h2">${t('Görüşme insanı değil misin?')}</h2>
<div class="wg">
<div class="way"><span class="mono">${w.email.k}</span><a class="wb" href="mailto:hello@lostcomma.co" data-rest="host" data-rest-at="end 10 -6">hello@<wbr>lostcomma.co</a><span class="d">${w.email.d}</span><button type="button" class="wcopy mono" data-copy="hello@lostcomma.co" hidden>${t('Adresi kopyala')}</button></div>
<details class="way"><summary><span class="mono">${w.brief.k}</span><b>${w.brief.b}</b><span class="d">${w.brief.d}</span><span class="wcopy mono wopen" aria-hidden="true">${t('Soruları gör')}</span></summary><ol class="qs" data-qs>${w.brief.q.map((q) => html`<li>${q}</li>`)}</ol><button type="button" class="wcopy mono" data-copybrief hidden>${t('Soruları kopyala')}</button></details>
<a class="way" href="${href(lang, 'studio')}#city"><span class="mono">${w.visit.k}</span><b>${w.visit.b}</b><span class="d">${w.visit.d}</span><span class="wcopy mono">${t('Haritaya bak')} <span aria-hidden="true">→</span></span></a>
<div class="way"><span class="mono">${w.phone.k}</span><b>${w.phone.b}</b><span class="d">${w.phone.d}</span></div>
</div>
</div></section>`;
}

function then(ctx: Ctx): Safe {
  const { t } = ctx;
  return html`<section class="then" data-sec="then" data-host="design"><div class="wrap">
<p class="kick mono"><i class="fi" aria-hidden="true"></i>${t('Ayırdıktan sonra')}</p>
<ol class="steps">${START[ctx.lang].steps.map((s) => html`<li class="step"><span class="mono">${s.k}</span><b>${s.b}</b><p>${s.p}</p></li>`)}</ol>
</div></section>`;
}

export const startPage: Page<StartData> = {
  id: 'start',
  theme: 'lime',
  host: 'design',
  section: 'start',
  scripts: ['start'],
  styles: ['start'],
  title: (t) => t('Proje başlat'),
  description: (t) => t('Ofis saatlerimizden birini seç ve konuşalım.'),
  load: async (ctx) => {
    const list = bookingDays(ctx.now);
    const day = list.includes(ctx.query.day ?? '') ? ctx.query.day! : list[0]!;
    const taken = await takenBetween(ctx.db, istInstant(list[0]!, 0), istInstant(list[list.length - 1]!, 1440));
    const token = ctx.query.ticket;
    const ticket = token && /^[\w-]{10,40}$/.test(token) ? ((await bookingByToken(ctx.db, token)) ?? null) : null;
    const s = ctx.query.booking;
    return { days: list, day, taken: [...taken], ticket, state: s === 'taken' || s === 'error' || s === 'slow' ? s : null };
  },
  data: (_ctx, d) => ({ taken: d.taken }),
  body: (ctx, d) => html`${hero(ctx)}
<div class="below th-paper">
${book(ctx, d)}
${ways(ctx)}
${then(ctx)}
${nextBand(ctx, { to: 'work', kick: msg('Hâlâ karar veremedin mi?'), big: msg('İşlere bak'), tone: 'ink' })}
</div>`,
  footer: (ctx) => html`<div class="below th-paper">${footer(ctx)}</div>`,
};
