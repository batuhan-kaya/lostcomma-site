import { PROCESS, type ProcessCopy } from '../../content/process';
import { html, raw, type Safe } from '../../html';
import { footer, nextBand } from '../../layout/chrome';
import { msg } from '../../msg';
import type { Ctx, Page } from '../../page';
import { href } from '../../routes';
import { workday } from '../../../shared/istanbul';
import { MILESTONES, PHASE_WHO, START, TRACKS, WEEKS, clipOn, pad2, phaseOf, weekDay, type Who } from '../../../shared/timeline';

/**
 * Process · "Ten weeks." The hero is an edit suite: a monitor shows what you would see that week ·
 * the inspector says what happens · four tracks (you · design · motion · code) run under a playhead
 * you can drag or play. Below the hero the page calms down on paper: the weekly rhythm (today is
 * marked) · six house rules · life after launch.
 */

const INITIAL: Record<Who, string> = { you: 'Y', design: 'D', motion: 'M', code: 'C' };
const lines = (s: string): Safe => html`${s.split('\n').map((l, i) => html`${i ? html`<br>` : ''}${l}`)}`;

/** "W05 · D3 · Design" in the page language. */
export function timecode(ctx: Ctx, copy: ProcessCopy, p: number): string {
  const { week, day } = weekDay(p);
  return `${ctx.t('H{w} · G{d}', { w: pad2(week), d: day })} · ${copy.phases[phaseOf(p)]!.n}`;
}

export function avatars(who: readonly Who[]): Safe {
  return html`${who.map((w) => html`<span class="av c-${w}">${INITIAL[w]}</span>`)}`;
}

/** What the monitor shows in each phase. Drawn with CSS · sized in container units. */
function scenes(ctx: Ctx, on: number): Safe {
  const { t } = ctx;
  const ph = (i: number, inner: Safe) => html`<div class="ph p${i}${i === on ? ' on' : ''}" data-ph="${i}">${inner}</div>`;
  return html`${ph(
    0,
    html`<span class="note n1">${t('Kimin için?')}</span><span class="note n2">${t('Başarı neye benziyor?')}</span><span class="note n3">${t('Gerçek teslim tarihi ne?')}</span><span class="note n4">${t('Kim karar veriyor?')}</span><i class="doc"><b class="mono">brief.pdf</b></i>`,
  )}
${ph(
  1,
  html`<i class="ln l1"></i><i class="ln l2"></i><i class="ln l3"></i><i class="ln l4"></i><span class="nd h">${t('Ana sayfa')}</span><span class="nd d1">${t('Mağaza')}</span><span class="nd d2">${t('Atölyeler')}</span><span class="nd d3">${t('Günlük')}</span><span class="nd d4">${t('Ziyaret')}</span>${[
    msg('Kaseler'),
    msg('Fincanlar'),
    msg('Tabaklar'),
    msg('Tarihler'),
    msg('Yazılar'),
    msg('Harita'),
  ].map((s, i) => html`<span class="sm s${i + 1}">${t(s)}</span>`)}`,
)}
${ph(2, html`<span class="tl aa">Aa</span><i class="tl t1"></i><i class="tl t2"></i><i class="tl t3"></i><i class="tl t4"></i><i class="tl t5"></i><i class="tl t6"></i><em class="mood">${t('sıcak · el yapımı · yavaş')}</em>`)}
${ph(3, html`<i class="dk"></i><i class="dh"></i><i class="db"></i><i class="mp"></i><i class="cv"></i><span class="cl mono">${t('yavaş bitir · 600 ms')}</span>`)}
${ph(4, html`<span class="code">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => html`<i class="c${i}"></i>`)}</span><i class="prev"></i><span class="term mono">${t('✓ derleme geçti · önizleme güncellendi')}</span>`)}
${ph(
  5,
  html`<i class="phn"></i><span class="lst">${[msg('Sadece klavye'), msg('Ekran okuyucu'), msg('Yavaş 3G'), msg('İki dil')].map((s, i) => html`<span class="li${i + 1}">${t(s)}</span>`)}</span><i class="bug"></i>`,
)}
${ph(6, html`<i class="lv"></i><span class="pill mono">${t('Yayında')}</span><i class="gr"></i>${[1, 2, 3, 4, 5, 6].map((i) => html`<i class="cf f${i}"></i>`)}`)}`;
}

const ICON = {
  prev: raw('<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 4h2v12H5zM16 4v12L8 10z"></path></svg>'),
  play: raw('<svg viewBox="0 0 20 20" aria-hidden="true"><path class="pi" d="M6 3.5l11 6.5-11 6.5z"></path><path class="pa" d="M5 4h3.5v12H5zM11.5 4H15v12h-3.5z"></path></svg>'),
  next: raw('<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M13 4h2v12h-2zM4 4v12l8-6z"></path></svg>'),
};

function hero(ctx: Ctx, copy: ProcessCopy): Safe {
  const { t } = ctx;
  const p = START;
  const i = phaseOf(p);
  const ph = copy.phases[i]!;
  const tc = timecode(ctx, copy, p);
  return html`<section class="phero" data-sec="hero" id="top"><div class="wrap">
<p class="kick mono"><i class="fi" aria-hidden="true"></i><span>${t('Süreç')}</span><span aria-hidden="true">·</span><span class="url">lostcomma.co${ctx.path}</span></p>
<h1 class="ttl" data-rest="design" data-rest-at="end 16 -14">${copy.title}</h1>
<p class="lede">${copy.lede} <b>${copy.try}</b> ${copy.after}</p>
<div class="ed" data-ed>
<div class="etop">
<div class="mon">
<p class="mlab mono"><span>${t('Program · göreceğin şey')}</span><b data-tc>${tc}</b></p>
<div class="scr" data-scr role="img" aria-label="${ph.w} · ${ph.n}">${scenes(ctx, i)}</div>
</div>
<div class="insp" aria-live="polite" data-rest="motion" data-rest-at="0.82 0.2">
<p class="iw mono"><span>${t('Denetçi')}</span><b data-iw>${ph.w}</b></p>
<p class="iph" data-in>${ph.n}</p>
<dl class="irows">
<div class="ir"><dt class="mono">${t('Ne oluyor')}</dt><dd data-ihap>${ph.hap}</dd></div>
<div class="ir"><dt class="mono">${t('Sen ne yapıyorsun')}</dt><dd data-iyou>${ph.you}</dd></div>
<div class="ir"><dt class="mono">${t('Eline ne geçiyor')}</dt><dd data-iget>${ph.get}</dd></div>
</dl>
<p class="iwho mono"><span>${t('Bunun üstünde')}</span><span class="avs" data-iwho>${avatars(PHASE_WHO[i]!)}</span></p>
</div>
</div>
<div class="tp">
<div class="tpl">
<button type="button" class="tb" data-prev aria-label="${t('Önceki hafta')}">${ICON.prev}</button>
<button type="button" class="tb play" data-play aria-pressed="false" aria-label="${t('On haftayı oynat')}" data-rest="code" data-rest-at="0.5 1.3 0 6">${ICON.play}</button>
<button type="button" class="tb" data-next aria-label="${t('Sonraki hafta')}">${ICON.next}</button>
<span class="tc mono" data-tc2 aria-hidden="true">${tc}</span>
</div>
<p class="tpr mono" aria-hidden="true"><span><i></i>${t('Cuma demosu')}</span><span><i class="fl"></i>${t('Kilometre taşı')}</span><span>${t('1 hafta = 1.4 sn')}</span></p>
</div>
<div class="tl2">
<ul class="tlab mono" aria-hidden="true">${TRACKS.map((tr, k) => html`<li class="c-${tr.who}"><i></i><span>${copy.tracks[k]!.n}</span></li>`)}</ul>
<div class="tarea" data-tl>
<div class="rul mono" data-rul role="slider" tabindex="0" aria-label="${t('Zaman çizelgesi')}" aria-valuemin="0" aria-valuemax="${WEEKS}" aria-valuenow="${p}" aria-valuetext="${tc}">
${Array.from({ length: WEEKS }, (_, k) => html`<span class="wk w${k}${k + 1 === weekDay(p).week ? ' on' : ''}" aria-hidden="true"><span>${t('H{w}', { w: pad2(k + 1) })}</span></span>`)}
${Array.from({ length: WEEKS }, (_, k) => html`<i class="fri f${k}" aria-hidden="true"></i>`)}
${MILESTONES.map((_, k) => html`<span class="ms m${k}${k === MILESTONES.length - 1 ? ' end' : ''}" aria-hidden="true">${copy.milestones[k]}</span>`)}
</div>
${TRACKS.map(
  (tr, k) => html`<div class="trk">${tr.clips.map(
    ([s, l], j) => html`<button type="button" class="clip c-${tr.who} k${k}${j}${clipOn(s, l, p) ? ' on' : ''}" data-at="${s}" data-len="${l}" aria-label="${copy.tracks[k]!.n} · ${copy.tracks[k]!.clips[j]}">${copy.tracks[k]!.clips[j]}</button>`,
  )}</div>`,
)}
<i class="done" data-done aria-hidden="true"></i>
<i class="head" data-head aria-hidden="true"></i>
</div>
</div>
</div>
</div></section>`;
}

function week(ctx: Ctx, copy: ProcessCopy): Safe {
  const { t } = ctx;
  const today = workday(ctx.now);
  const who: Who[] = ['design', 'code', 'you', 'code', 'motion'];
  return html`<section class="week" data-sec="week" data-host="motion"><div class="wrap">
<div class="whd"><div><p class="kick mono"><i class="fi" aria-hidden="true"></i>${t('Her hafta')}</p><h2 class="h2">${lines(copy.week.h)}</h2></div><p>${copy.week.p}</p></div>
<ol class="days">${copy.week.days.map(
    (d, i) => html`<li class="day s${i}${today === i ? ' now' : ''}"${i === 4 ? html` data-rest="host" data-rest-at="0.84 0.16"` : ''}><p class="dh mono"><span>${d.d}</span>${today === i ? html`<span class="today">${t('Bugün')}</span>` : d.at ? html`<b>${d.at}</b>` : ''}</p><div class="slot c-${who[i]}"><span class="mono">${d.len}</span><b>${d.t}</b><span>${d.text}</span></div></li>`,
  )}</ol>
<p class="async mono"><i aria-hidden="true"></i><b>${copy.week.daily[0]}</b><span>${copy.week.daily[1]}</span>${today === null ? html`<span class="wkend">${t('Hafta sonu. Pazartesi görüşürüz.')}</span>` : ''}</p>
</div></section>`;
}

function rules(ctx: Ctx, copy: ProcessCopy): Safe {
  const { t } = ctx;
  return html`<section class="rules" data-sec="rules" data-host="motion"><div class="wrap">
<p class="kick mono"><i class="fi" aria-hidden="true"></i>${t('Ev kuralları')}</p>
<h2 class="h2" data-rest="host" data-rest-at="end 18 -10">${t('Uyduğumuz altı kural.')}</h2>
<ol class="rlist">${copy.rules.map((r, i) => html`<li class="rule"><span class="mono" aria-hidden="true">${pad2(i + 1)}</span><b>${r.t}</b><p>${r.p}</p></li>`)}</ol>
</div></section>`;
}

function after(ctx: Ctx, copy: ProcessCopy): Safe {
  const { t } = ctx;
  return html`<section class="after" data-sec="after" data-host="design"><div class="wrap">
<p class="kick mono"><i class="fi" aria-hidden="true"></i>${t('Yayından sonra')}</p>
<h2 class="h2">${t('On birinci hafta')}<br>${t('ve sonrası.')}</h2>
<div class="plans">${copy.plans.map(
    (p, i) => html`<div class="plan${i === 1 ? ' hot' : ''}"${i === 1 ? html` data-rest="host" data-rest-at="0.86 0.1"` : ''}><h3>${p.n}</h3><p>${p.p}</p><ul>${p.items.map((x) => html`<li>${x}</li>`)}</ul><p class="amt">${i < 2 ? t('[FİYAT]') : t('İş başına')} <small class="mono">${p.per}</small></p></div>`,
  )}</div>
<p class="pnote mono"><span>${t('Hiçbiri zorunlu değil. Bir ay sonra plan değiştirmek de serbest.')}</span><a href="${href(ctx.lang, 'start')}">${t('Bir proje konuşalım')} <span aria-hidden="true">↗</span></a></p>
</div></section>`;
}

export const processPage: Page = {
  id: 'process',
  theme: 'night',
  host: 'motion',
  section: 'services',
  scripts: ['process'],
  styles: ['process'],
  title: (t) => t('Süreç'),
  description: (t) => t('Bir projenin ilk görüşmeden yayına kadar nasıl ilerlediği.'),
  body: (ctx) => {
    const copy = PROCESS[ctx.lang];
    return html`${hero(ctx, copy)}
<div class="below th-paper">
${week(ctx, copy)}
${rules(ctx, copy)}
${after(ctx, copy)}
${nextBand(ctx, { to: 'studio', kick: msg('Sonraki sayfa'), big: msg('Stüdyo'), tone: 'ink' })}
</div>`;
  },
  footer: (ctx) => html`<div class="below th-paper">${footer(ctx)}</div>`,
  /** The client needs every phase in the page language and the timecode pattern. */
  data: (ctx) => {
    const copy = PROCESS[ctx.lang];
    return { phases: copy.phases, tracks: copy.tracks.map((x) => x.n) };
  },
};
