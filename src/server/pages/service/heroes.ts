import { HERO, type HeroCopy } from '../../content/services';
import { html, raw, type Safe } from '../../html';
import { msg } from '../../msg';
import type { Ctx } from '../../page';
import { contrast, PALETTE } from '../../../shared/contrast';
import { cssCurve, PRESETS, plotPath, X, Y } from '../../../shared/curve';
import { ACTIONS, easyCount, zoneAt, zoneOf } from '../../../shared/thumb';

/**
 * The four signature heroes and the mock under each hood. Every one renders its first state on the
 * server so the page reads without JS · src/client/service/*.ts brings them to life.
 */

/* ======================= Websites · a frame you can resize ======================= */

export const WIDTHS = [
  { n: msg('Telefon'), w: 390 },
  { n: msg('Tablet'), w: 768 },
  { n: msg('Dizüstü'), w: 1024 },
  { n: msg('Masaüstü'), w: 1280 },
] as const;

/** A small client site (a ceramics studio) built with container queries · it reflows as the frame changes width. */
function kil(ctx: Ctx): Safe {
  const { t } = ctx;
  const cards = [
    [msg('Sabah kasesi'), '₺ 680'],
    [msg('Uzun fincan'), '₺ 540'],
    [msg('Geniş tabak'), '₺ 720'],
    [msg('Demlik'), '₺ 960'],
  ] as const;
  return html`<div class="site" aria-hidden="true">
<div class="s-nav"><span class="s-logo">kil</span><span class="s-links"><span>${t('Mağaza')}</span><span>${t('Atölyeler')}</span><span>${t('Günlük')}</span><span>${t('Ziyaret')}</span></span><span class="s-bag">${t('Sepet · 0')}</span><span class="s-menu">${t('Menü')}</span></div>
<div class="s-hero"><div><p class="s-h1">${t('Yavaş sabahlar için kaseler.')}</p><p class="s-p">${t('Kadıköy’de elde çekildi. İki kez pişti. Her gün kullanılmak için yapıldı.')}</p><span class="s-btn">${t('Kaseleri incele')}</span></div><div class="s-img"><i></i><i></i><i></i><i></i><em>${t('Yeni sır')}</em></div></div>
<div class="s-sec"><b>${t('Bu hafta')}</b><span>${t('Hepsini gör')}</span></div>
<div class="s-grid">${cards.map(([n, p], i) => html`<div class="s-card"><span class="s-pic p${i + 1}"><i></i></span><b>${t(n)}</b><span>${p}</span></div>`)}</div>
<div class="s-bar"><span>${t('Sepet · 0 ürün')}</span><span>${t('Aç')} →</span></div>
</div>`;
}

export function webHero(ctx: Ctx): Safe {
  const { t } = ctx;
  const start = WIDTHS[WIDTHS.length - 1]!.w;
  return html`<div class="rz" data-rz>
<div class="rhead">
<div class="presets mono" role="group" aria-label="${t('Ekran genişliği')}">${WIDTHS.map(
    (p) => html`<button type="button" class="pre${p.w === start ? ' on' : ''}" data-w="${p.w}" aria-pressed="${String(p.w === start)}">${t(p.n)} · ${p.w}</button>`,
  )}</div>
<p class="wlab mono"><span>${t('Genişlik')}</span><b data-wv>${start}</b><span>px</span></p>
</div>
<div class="ruler mono" aria-hidden="true"><span class="fill" data-fill></span>${WIDTHS.map((p) => html`<span class="bp" data-bp="${p.w}"><span>${t(p.n)} ${p.w}</span><i></i></span>`)}</div>
<div class="frame" data-frame>
<div class="fchrome" aria-hidden="true"><i></i><i></i><i></i><span class="furl">kil.studio · ${t('Kadıköy’de bir seramik atölyesi')}</span></div>
<div class="view" data-view>${kil(ctx)}</div>
<div class="handle" data-handle role="slider" tabindex="0" aria-label="${t('Önizlemenin genişliği')}" aria-orientation="horizontal" aria-valuemin="340" aria-valuemax="1360" aria-valuenow="${start}" aria-valuetext="${start} px" data-rest="code" data-rest-at="0.5 1.2 -6 0"><i></i></div>
<span class="dims mono" data-dims aria-hidden="true">${start} px</span>
</div>
</div>`;
}

export function webHood(ctx: Ctx): Safe {
  const { t } = ctx;
  const pages = [msg('Ana sayfa'), msg('Mağaza'), msg('Atölyeler'), msg('Günlük'), msg('Ziyaret')];
  return html`<div class="ed" data-ed role="group" aria-label="${t('Ekibinin kullanacağı editör')}">
<div class="edb"><b>kil · ${t('editör')}</b><span class="mono" data-saved><i aria-hidden="true"></i>${t('Kaydedildi')}</span></div>
<div class="edm">
<div class="eds" aria-hidden="true"><span class="mono">${t('Sayfalar')}</span>${pages.map((p, i) => html`<span${i === 0 ? html` class="on"` : ''}>${t(p)}</span>`)}<span class="mono">${t('Ayarlar')}</span><span>${t('Ekip ve roller')}</span><span>${t('Medya')}</span></div>
<div class="edf">
<div class="eft"><b>${t('Ana sayfa')}</b><span class="ltabs mono" role="group" aria-label="${t('İçerik dili')}"><button type="button" class="ltab${ctx.lang === 'en' ? ' on' : ''}" data-edl="en" aria-pressed="${String(ctx.lang === 'en')}">EN</button><button type="button" class="ltab${ctx.lang === 'tr' ? ' on' : ''}" data-edl="tr" aria-pressed="${String(ctx.lang === 'tr')}">TR</button></span></div>
<label class="fld"><span class="mono"><span>${t('Başlık')}</span><span data-edlang>${ctx.lang === 'tr' ? 'Türkçe' : 'English'}</span></span><input class="inp" type="text" data-edh maxlength="80"></label>
<label class="fld"><span class="mono"><span>${t('Giriş')}</span><span>${t('en fazla 160')}</span></span><textarea class="inp" data-edp maxlength="160" rows="3"></textarea></label>
<div class="fld"><span class="mono"><span>${t('Kapak görseli')}</span><span>${t('bir dosya bırak')}</span></span><div class="upl"><i aria-hidden="true"></i><span><em>${t('Boyutlandı')}</em><em>WebP</em><em>${t('Konum silindi')}</em></span></div></div>
<div class="efoot"><span class="mono">${t('İçerik şemasından üretilen form')}</span><button type="button" class="pub" data-pub>${t('Yayınla')}</button></div>
</div>
</div>
</div>`;
}

/* ======================= Apps · the thumb zone ======================= */

export function appHero(ctx: Ctx, copy: HeroCopy): Safe {
  const { t } = ctx;
  const names = [msg('Bilet al'), msg('⇅'), msg('Saatler'), msg('Harita'), msg('Biletler')];
  const deps = [
    ['08:40', msg('Sıradaki'), msg('9 dk sonra')],
    ['09:00', msg('İskele 2'), msg('29 dk')],
    ['09:20', msg('İskele 2'), msg('49 dk')],
    ['09:40', msg('İskele 1'), msg('1 sa 9 dk')],
    ['10:00', msg('İskele 2'), msg('1 sa 29 dk')],
  ] as const;
  const nB = easyCount('b', 'r');
  const nA = easyCount('a', 'r');
  const z = zoneAt(292, 640, 'r');
  const seg = (k: string, label: string, opts: [string, string, boolean][]) =>
    html`<div class="sgrp"><span class="mono" aria-hidden="true">${label}</span><span class="segs" role="group" aria-label="${label}">${opts.map(
      ([v, l, on]) => html`<button type="button" class="sb${on ? ' on' : ''}" data-${k}="${v}" aria-pressed="${String(on)}">${l}</button>`,
    )}</span></div>`;
  return html`<div class="tz" data-tz>
<div class="tzc">
${seg('lay', t('Düzen'), [['b', t('Önce'), true], ['a', t('Sonra'), false]])}
${seg('hand', t('El'), [['l', t('Sol'), false], ['r', t('Sağ'), true]])}
${seg('plat', t('Platform'), [['ios', 'iOS', true], ['and', 'Android', false]])}
<button type="button" class="tgl on" data-zone aria-pressed="true"><span class="mono">${t('Başparmak alanını göster')}</span><i class="swt" aria-hidden="true"></i></button>
<div class="score"><b><span data-easy>${nB}</span><small>/5</small></b><span>${t('eylem başparmağın dinlendiği yerde')}</span></div>
<div class="cmpx mono"><span class="on" data-cmp="b">${t('Önce · {n}/5', { n: nB })}</span><span data-cmp="a">${t('Sonra · {n}/5', { n: nA })}</span></div>
<div class="reach ${z}" data-reach aria-live="polite"><i aria-hidden="true"></i><b>${copy.reach[z][0]}</b><span>${copy.reach[z][1]}</span></div>
</div>
<div class="stage">
<div class="phone ios lay-b hand-r zon" data-phone data-rest="code" data-rest-at="0.18 0.9">
<div class="scr" data-scr aria-hidden="true">
<div class="sbar"><span>08:31</span><i class="isl"></i><span class="sig"><i></i><i></i></span></div>
<div class="atop"><span class="mono">${t('Vapur · 20 dakikada bir')}</span><b>${t('Kadıköy’den')}<br>${t('Karaköy’e')}</b></div>
<div class="deps">${deps.map(([h, a, b], i) => html`<div class="dep"><b>${h}</b>${i === 0 ? html`<em>${t(a)}</em>` : html`<span>${t(a)}</span>`}<span>${t(b)}</span></div>`)}</div>
${ACTIONS.map((a, i) => html`<span class="act a${i}${a.pri ? ' pri' : ''} ${zoneOf(i, 'b', 'r')}" data-act="${i}">${t(names[i]!)}</span>`)}
<span class="toast" data-toast></span>
</div>
<i class="zone on" data-zonebg aria-hidden="true"></i>
<button type="button" class="thumb" data-thumb aria-label="${t('Başparmak')}" aria-describedby="thumb-help"></button>
<span class="sr" id="thumb-help">${t('Ok tuşlarıyla ekranda gezdir. Enter altındaki eyleme dokunur.')}</span>
<span class="sr" aria-live="polite" data-tapsr></span>
</div>
<p class="legend mono" aria-hidden="true"><span class="easy"><i></i>${t('Kolay')}</span><span class="ok"><i></i>${t('Uzanmak')}</span><span class="hard"><i></i>${t('Zor')}</span></p>
</div>
</div>`;
}

export function appHood(ctx: Ctx, copy: HeroCopy): Safe {
  const { t } = ctx;
  return html`<div class="rt" data-rt role="group" aria-label="${t('Trendeki bir sürüm')}">
<div class="rth"><b>${t('Vapur')} · 2.4.0</b><span class="mono" data-rtwhen aria-live="polite">${t('Yola çıkmaya hazır')}</span></div>
<ol class="rts">${copy.train.map(
    (s, i) => html`<li class="st" data-st="${i}"><i aria-hidden="true"></i><span><b>${s.t}</b><small>${s.d}</small>${i === copy.train.length - 1 ? html`<span class="roll" aria-hidden="true"><i data-roll></i></span>` : ''}</span><span class="mono"${i === copy.train.length - 1 ? html` data-rollv` : ''}>${s.m}</span></li>`,
  )}</ol>
<div class="rtf"><span class="mono">${t('İki haftada bir · aynı gün')}</span><button type="button" class="ship" data-ship>${t('Yola çıkar')}</button></div>
</div>`;
}

/* ======================= Identity · favicon to billboard ======================= */

const MARK = raw(
  '<svg class="mk" viewBox="0 0 100 100" aria-hidden="true"><circle class="loaf" cx="50" cy="50" r="46"></circle><path class="sc s1" d="M33 64 L60 37"></path><path class="sc s2" d="M49 72 L72 49"></path><path class="sc s3" d="M27 50 L48 29"></path></svg>',
);
export const START_SIZE = 2;

export function identityHero(ctx: Ctx, copy: HeroCopy): Safe {
  const { t } = ctx;
  const z = copy.sizes[START_SIZE]!;
  const clr = html`<i class="clr" data-l="${t('boşluk alanı')}"></i>`;
  const scenes = [
    html`<div class="tabs"><span class="tab"><i></i>${t('Gelen kutusu')}</span><span class="tab on">${MARK} fırın · Moda</span><span class="tab"><i></i>${t('Haritalar')}</span></div><span class="urlb"></span><div class="loupe">${MARK}<b class="mono">16 × 16 · ${t('tek çizik')}</b></div>`,
    html`<div class="home">${[msg('Notlar'), msg('Haritalar'), '', msg('Vapur'), msg('Müzik'), msg('Fotoğraflar'), msg('Banka'), msg('Saat')].map((n) =>
      n ? html`<span class="ic"><i></i>${t(n)}</span>` : html`<span class="ic me"><i>${MARK}</i>fırın</span>`,
    )}</div>`,
    html`<div class="card"><span class="lk2">${MARK}<span class="wm">fırın</span>${clr}</span><span class="mono"><b>${t('Mahalle fırını · 1974’ten beri')}</b>Moda Caddesi 74 · Kadıköy</span></div>`,
    html`<div class="post"><span class="wm">fırın</span><p>${t('Yedide')}<br>${t('fırından')}<br>${t('çıkar.')}</p>${MARK}<span class="tagl mono">Moda · ${t('1974’ten beri')}</span></div>`,
    html`<div class="poster"><i class="pat"></i><span class="lk2">${MARK}${clr}</span><span class="wm">fırın</span><span class="tagl mono">${t('1974’ten beri ekmek · Moda')}</span></div>`,
    html`<div class="bill"><span class="wm">fırın</span>${MARK}</div><i class="pole p1"></i><i class="pole p2"></i><i class="walker w1"></i><i class="walker w2"></i>`,
  ];
  const kinds = ['s-fav', 's-app', 's-card', 's-post', 's-poster', 's-bill'];
  return html`<div class="idc">
<span class="sz" data-sz>${z.sz}</span>
<span class="szk mono"><span data-med>${z.n}</span><span aria-hidden="true">·</span><span data-real>${z.real}</span></span>
<div class="ver"><b data-ver>${z.ver}</b><span class="mono" data-vno>${z.vno}</span></div>
<p class="rule" data-rule aria-live="polite">${z.rule}</p>
<div class="tgs">
<button type="button" class="tgl" data-cs aria-pressed="false"><span class="mono">${t('Boşluk alanını göster')}</span><i class="swt" aria-hidden="true"></i></button>
<button type="button" class="tgl" data-mono aria-pressed="false"><span class="mono">${t('Tek renk sürüm')}</span><i class="swt" aria-hidden="true"></i></button>
</div>
</div>
<div class="stg v${z.v}" data-stg role="img" aria-label="${t('Fırın logosu · {cap}', { cap: z.cap })}">
${scenes.map((s, i) => html`<div class="scn ${kinds[i]}${i === START_SIZE ? ' on' : ''}" data-scn="${i}">${s}</div>`)}
<span class="scap mono" data-cap aria-hidden="true">${z.cap}</span>
</div>
<div class="scale" data-rest="design" data-rest-at="0.4 -0.2">
<input class="rng" type="range" min="0" max="100" step="1" value="${START_SIZE * 20}" data-rng aria-label="${t('Boyut')}" aria-valuetext="${z.n} · ${z.sz}">
<div class="stops">${copy.sizes.map(
    (x, i) => html`<button type="button" class="stop${i === START_SIZE ? ' on' : ''}" data-stop="${i}" aria-pressed="${String(i === START_SIZE)}"><b>${x.n}</b><span class="mono">${x.sz}</span></button>`,
  )}</div>
</div>`;
}

export const START_FG = 0;
export const START_BG = 3;

export function ratioText(r: number): string {
  return `${r.toFixed(2)} : 1`;
}

export function identityHood(ctx: Ctx, copy: HeroCopy): Safe {
  const { t } = ctx;
  const r = contrast(PALETTE[START_FG], PALETTE[START_BG]);
  const chips = (k: 'fg' | 'bg', on: number, label: string) =>
    html`<div class="ccg"><span class="mono" id="cc-${k}">${label}</span><div class="chips2" role="group" aria-labelledby="cc-${k}">${PALETTE.map(
      (hex, i) => html`<button type="button" class="cb k${i}${i === on ? ' on' : ''}" data-${k}="${i}" aria-pressed="${String(i === on)}" aria-label="${copy.palette[i]} ${hex}"></button>`,
    )}</div></div>`;
  return html`<div class="cc" data-cc role="group" aria-label="${t('Kontrastıyla renk çiftleri')}">
<div class="cch"><b>fırın · ${t('renk çiftleri')}</b><span class="mono">WCAG 2.2</span></div>
<div class="ccs">${chips('fg', START_FG, t('Yazı'))}${chips('bg', START_BG, t('Zemin'))}</div>
<div class="prev f${START_FG} b${START_BG}" data-prev><b>${copy.preview[0]}</b><span>${copy.preview[1]}</span></div>
<div class="ccr" aria-live="polite"><b data-ratio>${ratioText(r)}</b>${badges(ctx, r)}</div>
</div>`;
}

/** AA and AAA verdicts for a ratio. The client swaps the same markup. */
export function badges(ctx: Ctx, r: number): Safe {
  const { t } = ctx;
  const aa = r >= 4.5 ? ['ok', t('AA ✓ metin')] : r >= 3 ? ['', t('AA sadece büyük yazı')] : ['no', t('AA’dan kalır')];
  const aaa = r >= 7 ? ['ok', 'AAA ✓'] : ['no', t('AAA değil')];
  return html`<span class="bdg mono ${aa[0]}" data-aa>${aa[1]}</span><span class="bdg mono ${aaa[0]}" data-aaa>${aaa[1]}</span>`;
}

/* ======================= Motion · bend the curve ======================= */

export function motionHero(ctx: Ctx, copy: HeroCopy): Safe {
  const { t } = ctx;
  const c = PRESETS[0]!.c;
  return html`<div class="ce">
<div class="ceh mono"><span>${t('Eğri')} · <b data-cname>${copy.curves[0]!.n}</b></span><span aria-hidden="true">${t('zaman')} →</span></div>
<div class="plot" data-plot>
<svg viewBox="-20 -10 340 680" aria-hidden="true">
<path class="grid" d="M0 0 V660 M75 0 V660 M150 0 V660 M225 0 V660 M300 0 V660 M0 135 H300 M0 210 H300 M0 285 H300 M0 360 H300 M0 435 H300 M0 510 H300 M0 585 H300"></path>
<rect class="unit" x="0" y="210" width="300" height="300"></rect>
<path class="lin" d="M0 510 L300 210"></path>
<line class="arm" data-arm="0" x1="0" y1="510" x2="${X(c[0])}" y2="${Y(c[1])}"></line>
<line class="arm" data-arm="1" x1="300" y1="210" x2="${X(c[2])}" y2="${Y(c[3])}"></line>
<path class="cv" data-cv d="${plotPath(c)}"></path>
<circle class="end" cx="0" cy="510" r="6"></circle>
<circle class="end" cx="300" cy="210" r="6"></circle>
<circle class="dot" data-dot cx="0" cy="510" r="8"></circle>
<text class="lab" x="6" y="534">${t('başla')}</text>
<text class="lab" x="300" y="194" text-anchor="end">${t('bitir')}</text>
</svg>
<button type="button" class="hdl h0" data-h="0" aria-label="${t('Birinci tutamaç')}" aria-describedby="hdl-help" data-rest="motion" data-rest-at="0.5 0.5 10 12"></button>
<button type="button" class="hdl h1 p2" data-h="1" aria-label="${t('İkinci tutamaç')}" aria-describedby="hdl-help"></button>
<span class="sr" id="hdl-help">${t('Ok tuşlarıyla taşı. Shift ile daha hızlı.')}</span>
</div>
</div>
<div class="pvw">
<div class="cps" role="group" aria-label="${t('Dört eğrimiz')}">${copy.curves.map(
    (x, i) => html`<button type="button" class="pre${i === 0 ? ' on' : ''}" data-pre="${i}" aria-pressed="${String(i === 0)}"><b>${x.n}</b><span>${x.d}</span></button>`,
  )}</div>
<div class="lanes" aria-hidden="true">
<div class="lane"><span class="mono">${t('Seninki')}</span><span class="trk"><span class="obj" data-ball>${t('Kaydedildi ✓')}</span></span></div>
<div class="lane"><span class="mono">${t('Doğrusal')}</span><span class="trk"><span class="obj gr" data-lin>${t('Kaydedildi ✓')}</span></span></div>
<div class="lane"><span class="mono">${t('Bir düğme')}</span><span class="trk"><span class="obj sq" data-pop></span></span></div>
</div>
<div class="ctl">
<label class="dur"><span class="mono">${t('Süre')}</span><input type="range" min="150" max="1200" step="10" value="480" data-dur><b class="mono" data-durv>480 ms</b></label>
<button type="button" class="tgl" data-rm aria-pressed="false"><span class="mono">${t('Azaltılmış hareket')}</span><i class="swt" aria-hidden="true"></i></button>
</div>
<p class="calm" data-calm>${t('Azaltılmış hareket açık. Her şey yerinde belirir. Aynı bilgi · yolculuk yok.')}</p>
<div class="code" data-code data-rest="code" data-rest-at="0.72 1 0 10"><code data-css aria-live="polite">transition: transform <i>480ms</i> <i>${cssCurve(c)}</i>;</code><button type="button" class="cp" data-copy>${t('Kopyala')}</button></div>
</div>`;
}

export function motionHood(ctx: Ctx): Safe {
  const { t } = ctx;
  const tracks = [
    [msg('Virgül · düşer'), 'k0'],
    [msg('lost · kayarak gelir'), 'k1'],
    [msg('comma · kayarak gelir'), 'k2'],
    [msg('İmleç · gelir'), 'k3'],
  ] as const;
  return html`<div class="tlm" data-tlm role="group" aria-label="${t('Zaman çizelgesinde bir logo imzası')}">
<div class="tlh"><b>${t('Logo imzası')} · 2.0 s</b><span class="mono" data-tlt>2.00 s</span></div>
<div class="tlv" data-tlv aria-hidden="true"><span class="w1">lost</span><span class="cm">,</span><span class="w2">comma</span><svg class="cur2" viewBox="0 0 24 24"><path d="M3 2 L3 19.5 L7.8 15.2 L11 22 L14.2 20.6 L11.1 13.9 L17.6 13.7 Z"></path></svg></div>
<div class="trks" aria-hidden="true">${tracks.map(([n, k]) => html`<div class="tr"><span class="mono">${t(n)}</span><span><i class="kb ${k}"></i></span></div>`)}<i class="ph" data-ph></i></div>
<div class="tlf"><button type="button" class="play2" data-tlplay aria-pressed="false">${t('Oynat')}</button><input type="range" min="0" max="1000" step="1" value="1000" data-tlr aria-label="${t('Oynatma kafası')}"></div>
</div>`;
}
