import { STUDIO, type SettingRow, type StudioCopy } from '../../content/studio';
import { listPeople, listProjects, type Person } from '../../data/content';
import { html, raw, type Safe } from '../../html';
import { msg } from '../../msg';
import { picture } from '../../media/picture';
import type { Ctx, Page } from '../../page';
import { href } from '../../routes';
import { ferry, istanbul, studioOpen } from '../../../shared/istanbul';
import { boatTransform, ROUTE_D } from '../../../shared/map';
import { MEET_START, meetLevel } from '../../../shared/studio';

/**
 * Studio · "We are the cursors." The title is made of selections · one per teammate. Then the
 * three of them (from the database) and a fourth empty chair · our values as a settings window
 * whose display switches really change the page · a few numbers · a drawn Istanbul with the
 * studio and a ferry that crosses on Istanbul time. Calm paper all the way down.
 */
export interface StudioData {
  people: Person[];
  projects: number;
  since: number;
}

const lines = (s: string): Safe => html`${s.split('\n').map((l, i) => html`${i ? html`<br>` : ''}${l}`)}`;
const ARROW = raw('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 2 L3 19.5 L7.8 15.2 L11 22 L14.2 20.6 L11.1 13.9 L17.6 13.7 Z"></path></svg>');

function hero(ctx: Ctx, copy: StudioCopy, d: StudioData): Safe {
  const { t } = ctx;
  const open = studioOpen(ctx.now);
  return html`<section class="sthero" data-sec="hero" id="top"><div class="wrap">
<p class="kick mono"><i class="fi" aria-hidden="true"></i><span>${t('Stüdyo')}</span><span aria-hidden="true">·</span><span class="url">lostcomma.co${ctx.path}</span></p>
<h1 class="ttl">${copy.title.map(
    (line) =>
      html`<span class="ln">${line.map((w, i) =>
        w.who
          ? html`${i && w.w !== '.' ? ' ' : ''}<span class="w${w.w === '.' ? ' dot' : ''}" data-w="${w.who}" data-rest="${w.who}" data-rest-at="1 1 ${w.w === '.' ? 10 : 4} -4">${w.w}<span class="sel c-${w.who}" aria-hidden="true"><i></i><i></i><em>${w.who}</em></span></span>`
          : html`${i ? ' ' : ''}<span class="w">${w.w}</span>`,
      )}</span> `,
  )}</h1>
<div class="hrow">
<p class="lede">${copy.lede} <b>${copy.bold}</b> ${copy.after}</p>
<p class="hmeta mono"><span>${t('İstanbul · şimdi')}</span><time class="clk" data-clock>${istanbul(ctx.now).hm}</time><span class="opn${open ? ' is' : ''}" data-open><i aria-hidden="true"></i><span data-opent>${open ? t('Stüdyo açık') : t('Stüdyo kapalı')}</span></span></p>
</div>
<p class="hfoot mono"><span>${t('{y} yılından beri · Kadıköy', { y: d.since })}</span><span aria-hidden="true">${t('Tanışmak için kaydır ↓')}</span></p>
</div></section>`;
}

function card(ctx: Ctx, m: Person, i: number): Safe {
  const { t, lang } = ctx;
  return html`<li class="card c-${m.crew}" data-who="${m.crew}">
<span class="bigc${m.portrait ? ' ph' : ''}" aria-hidden="true">${m.portrait ? picture(m.portrait, { lang, sizes: '(max-width: 640px) 90vw, 320px', alt: '' }) : ''}${ARROW}<span class="t">${m.crew}</span></span>
<h3 class="nm">${m.name}</h3>
<p class="role mono">${m.role}</p>
<dl class="facts">
<div><dt class="mono">${t('Genelde')}</dt><dd>${m.usually}</dd></div>
<div><dt class="mono">${t('Şu sıralar')}</dt><dd>${m.rightNow}</dd></div>
<div><dt class="mono">${t('Sevdiği kısayol')}</dt><dd class="kbd">${m.keys.map((k) => html`<kbd>${k}</kbd>`)}<span>${m.keysDo}</span></dd></div>
</dl>
<p class="hello" data-hello role="status"></p>
<button type="button" class="hi" data-hi="${m.crew}"${i === 0 ? html` data-rest="host" data-rest-at="0.9 0.2 6 0"` : ''}>${t('{name} ile selamlaş', { name: m.crew })}</button>
</li>`;
}

function team(ctx: Ctx, copy: StudioCopy, d: StudioData): Safe {
  const { t, lang } = ctx;
  return html`<section class="team" data-sec="team" data-host="design"><div class="wrap">
<div class="thd"><div><p class="kick mono"><i class="fi" aria-hidden="true"></i>${t('Ekip · bir kartın üstüne gel')}</p><h2 class="h2">${lines(copy.team.h)}</h2></div><p>${copy.team.p}</p></div>
<ul class="cards">${d.people.map((m, i) => card(ctx, m, i))}
<li class="card c4 c-you"><span class="bigc" aria-hidden="true">${ARROW}<span class="t">${t('sen?')}</span></span><h3 class="nm">${t('Dördüncü bir imleç')}</h3><p class="role mono">${t('Şu an ekip almıyoruz')}</p><p class="c4p">${t('Şu an kimseyi aramıyoruz. Webde güzel şeyler yapıyorsan yine de tanışmak isteriz.')}</p><a class="hi" href="${href(lang, 'start')}">${t('Yine de selam ver')} <span aria-hidden="true">↗</span></a></li>
</ul>
</div></section>`;
}

const CAT_ICON = {
  v: raw('<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14s-5.5-3.2-5.5-7A3 3 0 0 1 8 5a3 3 0 0 1 5.5 2c0 3.8-5.5 7-5.5 7z"></path></svg>'),
  d: raw('<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5"></circle><path d="M8 2.5v11"></path></svg>'),
  o: raw('<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6h8v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z"></path><path d="M11 7h1.5a1.5 1.5 0 0 1 0 3H11"></path></svg>'),
};

function row(ctx: Ctx, r: SettingRow): Safe {
  const on = r.kind === 'bounce';
  const locked = r.kind === 'locked';
  return html`<div class="row" data-row="${r.key}"><span><b id="r-${r.key}">${r.t}${locked ? html` <span class="mono">${ctx.t('kilitli')}</span>` : ''}</b><span class="d" id="d-${r.key}">${r.d}</span></span><button type="button" role="switch" class="sw${on ? ' on' : ''}${locked ? ' lock' : ''}" data-sw="${r.key}" data-kind="${r.kind}" aria-checked="${String(on)}" aria-labelledby="r-${r.key}" aria-describedby="d-${r.key}"${locked ? html` aria-disabled="true"` : ''}></button></div>`;
}

function settings(ctx: Ctx, copy: StudioCopy): Safe {
  const { t } = ctx;
  const o = copy.office;
  const cats = [
    ['v', t('Değerler'), t('Değerler'), t('Her projeyle gelen varsayılanlar.'), html`${copy.values.map((r) => row(ctx, r))}`],
    ['d', t('Ekran'), t('Ekran'), t('Bunlar bu sayfayı gerçekten değiştirir. Dene.'), html`${copy.display.map((r) => row(ctx, r))}`],
    [
      'o',
      t('Ofis'),
      t('Ofis'),
      t('Bir stüdyoyu stüdyo yapan küçük şeyler.'),
      html`<div class="row"><span><b id="r-meet">${o.meet.t}</b><span class="d">${o.meet.d}</span></span><span class="mlab"><span class="mono" data-meetv aria-hidden="true">${o.meet.levels[meetLevel(MEET_START)]}</span><input class="rng" type="range" min="0" max="10" step="1" value="${MEET_START}" data-meet aria-labelledby="r-meet" aria-valuetext="${MEET_START} · ${o.meet.levels[meetLevel(MEET_START)]}"></span></div>
<div class="row"><span><b id="r-drink">${o.drink.t}</b><span class="d">${o.drink.d}</span></span><select class="sel2" data-drink aria-labelledby="r-drink">${o.drink.options.map((x) => html`<option value="${x.v}">${x.n}</option>`)}</select></div>
${row(ctx, o.dog)}`,
    ],
  ] as const;
  return html`<section class="set" data-sec="set" data-host="design"><div class="wrap">
<div class="shd"><div><p class="kick mono"><i class="fi" aria-hidden="true"></i>${t('Nasıl çalışıyoruz · anahtarları dene')}</p><h2 class="h2">${t('Stüdyo ayarları.')}</h2></div><p>${t('Değerlerimiz tercihler olarak. Bazıları bu sayfayı değiştirir. Bazıları pazarlığa kapalı.')}</p></div>
<div class="win" data-win>
<div class="wt" aria-hidden="true"><span class="dots"><i></i><i></i><i></i></span><b>${t('Lost Comma · Ayarlar')}</b><span class="srch mono">⌘ F</span></div>
<div class="wb">
<div class="side">
<div role="tablist" aria-label="${t('Ayar bölümleri')}" aria-orientation="vertical" class="tabs">${cats.map(
    ([k, label], i) => html`<button type="button" role="tab" class="cat k-${k}${i === 0 ? ' on' : ''}" id="tab-${k}" data-cat="${k}" aria-controls="pane-${k}" aria-selected="${String(i === 0)}" tabindex="${i === 0 ? '0' : '-1'}"><i>${CAT_ICON[k]}</i>${label}</button>`,
  )}</div>
<span class="ver mono">${t('Sürüm 2026.10')}</span>
</div>
${cats.map(
  ([k, , h, p, rows], i) => html`<div class="pane" role="tabpanel" id="pane-${k}" aria-labelledby="tab-${k}" tabindex="0"${i ? html` hidden` : ''}${i === 0 ? html` data-rest="host" data-rest-at="0.92 0.06"` : ''}><h3>${h}</h3><p>${p}</p>${rows}</div>`,
)}
<p class="toast" data-toast role="status"><i aria-hidden="true"></i><span></span></p>
</div>
</div>
</div></section>`;
}

function numbers(ctx: Ctx, d: StudioData): Safe {
  const { t } = ctx;
  return html`<section class="nums" data-sec="nums" data-host="design"><div class="wrap">
<div class="n"><b>${d.people.length}</b><span>${t('her şeyi yapan insan')}</span></div>
<div class="n"><b>2</b><span>${t('her sitede dil')}</span></div>
<div class="n"><b>${d.projects}</b><span>${t('{y} yılından beri proje', { y: d.since })}</span></div>
<div class="n z" data-rest="host" data-rest-at="0.5 0.1"><b data-commas>0</b><span>${t('bulunan virgül')}</span><span class="you mono" data-yfound hidden>${t('biri sendin')}</span></div>
</div></section>`;
}

function city(ctx: Ctx): Safe {
  const { t, lang } = ctx;
  const open = studioOpen(ctx.now);
  const f = ferry(ctx.now);
  return html`<section class="city" data-sec="city" data-host="design"><div class="wrap">
<div class="chd"><div><p class="kick mono"><i class="fi" aria-hidden="true"></i>${t('Neredeyiz')}</p><h2 class="h2">${t('Anadolu yakasında.')}<br>${t('Vapura on dakika.')}</h2></div>
<p class="open mono"><span>${t('Stüdyo şu an')}</span><b class="opn${open ? ' is' : ''}" data-open><i aria-hidden="true"></i><span data-opent>${open ? t('Açık') : t('Kapalı')}</span></b><span>${t('Pazartesi ile cuma · 10:00 ile 18:00')}</span></p></div>
<div class="map">
<div class="mapf">
<div class="mapc" role="img" aria-label="${t('İstanbul’un çizilmiş bir haritası. Stüdyo Kadıköy’de vapur iskelesinin yanında.')}">
<svg viewBox="0 0 1360 580" aria-hidden="true">
<path class="grid" d="M0 116H1360M0 232H1360M0 348H1360M0 464H1360M272 0V580M544 0V580M816 0V580M1088 0V580"></path>
<path class="water" d="M0 446 C 300 430 520 452 700 438 C 860 426 1080 452 1360 430 V 580 H 0 Z"></path>
<path class="strait" d="M840 -40 C 800 80 910 150 870 250 S 765 360 745 450"></path>
<path class="horn" d="M752 412 C 690 396 630 366 550 320 S 440 284 380 292"></path>
<path class="route" d="${ROUTE_D}"></path>
<g class="boat" data-boat transform="${boatTransform(f.at, f.east)}"><path class="hull" d="M-22 2 H22 L16 11 H-16 Z"></path><rect class="cab" x="-11" y="-7" width="20" height="9" rx="2"></rect><rect class="fun" x="-3" y="-13" width="5" height="6"></rect></g>
</svg>
<span class="mlbl l-eu mono">${t('Avrupa')}</span>
<span class="mlbl l-as mono">${t('Asya')}</span>
<span class="mlbl l-ma mono w">${t('Marmara Denizi')}</span>
<span class="mlbl l-bo mono w">${t('İstanbul Boğazı')}</span>
<span class="mlbl l-gh mono w">${t('Haliç')}</span>
<span class="pin sm p-kk"><span>Karaköy</span><i></i><em></em></span>
<span class="pin p-lc"><span>Lost Comma<small>${t('çaya gel')}</small></span><i></i><em></em></span>
</div>
</div>
<div class="addr" data-rest="host" data-rest-at="0.95 0.2"><b>${ctx.settings.text('studio.address', lang) ?? t('[ADRES]')}</b><span>Kadıköy · 34710 ${t('İstanbul')}</span><span>${t('Vapur iskelesine beş dakika')}</span><a href="${href(lang, 'start')}">${t('Ziyaret ayarla')} <span aria-hidden="true">→</span></a></div>
</div>
<p class="fery mono" data-fery>${ferryLine(ctx, f)}</p>
</div></section>`;
}

/** "Next ferry from Karaköy · 14:20 · roughly every 20 minutes" or the night line. */
export function ferryLine(ctx: Ctx, f: ReturnType<typeof ferry>): string {
  const { t } = ctx;
  return f.running ? `${t('Karaköy’den sonraki vapur · {time}', { time: f.next })} · ${t('aşağı yukarı 20 dakikada bir')}` : t('Vapurlar uyuyor. İlki {time}’de.', { time: f.next });
}

export const studioPage: Page<StudioData> = {
  id: 'studio',
  theme: 'paper',
  host: 'design',
  section: 'studio',
  scripts: ['studio'],
  styles: ['studio'],
  title: (t) => t('Stüdyo'),
  description: (t) => t('Lost Comma’nın arkasındaki ekip.'),
  load: async (ctx) => {
    const [people, projects] = await Promise.all([listPeople(ctx.db, ctx.lang), listProjects(ctx.db, ctx.lang)]);
    const since = Math.min(ctx.now.getFullYear(), ...projects.map((p) => p.year));
    return { people, projects: projects.length, since };
  },
  body: (ctx, d) => {
    const copy = STUDIO[ctx.lang];
    return html`${hero(ctx, copy, d)}
${team(ctx, copy, d)}
${settings(ctx, copy)}
${numbers(ctx, d)}
${city(ctx)}`;
  },
  /** Toasts and labels for the settings window · each teammate's hello. */
  data: (ctx, d) => {
    const copy = STUDIO[ctx.lang];
    const rows = [...copy.values, ...copy.display, copy.office.dog];
    return {
      toasts: Object.fromEntries(rows.map((r) => [r.key, r.toast])),
      meet: copy.office.meet,
      drink: Object.fromEntries(copy.office.drink.options.map((x) => [x.v, x.toast])),
      hello: Object.fromEntries(d.people.map((m) => [m.crew, m.hello])),
    };
  },
  next: { to: 'notes', kick: msg('Sonraki sayfa'), big: msg('Notes'), tone: 'ink' },
};
