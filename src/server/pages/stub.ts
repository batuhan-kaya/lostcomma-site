import { html } from '../html';
import { msg } from '../msg';
import type { Page } from '../page';

/**
 * Phase 0 placeholders. Each one is replaced by the real page in its own phase (docs/PLAN.md).
 * They already carry the real theme · title · description · next band and header section.
 */
function stub(def: Omit<Page, 'body'> & { kick: string; heading: string; phase: number }): Page {
  const { kick, heading, phase, ...page } = def;
  return {
    ...page,
    body: (ctx) => html`<section class="stub" data-sec="hero">
<div class="wrap">
<p class="kick mono"><i class="fi" aria-hidden="true"></i><span>${ctx.t(kick)}</span><span aria-hidden="true">·</span><span class="url">lostcomma.co${ctx.path}</span></p>
<h1 class="h1">${ctx.t(heading)}</h1>
<p class="lede">${ctx.t('Bu sayfa {n}. aşamada kodlanacak.', { n: phase })}</p>
</div>
</section>`,
  };
}

export const home = stub({
  id: 'home',
  theme: 'paper',
  kick: msg('Ana sayfa'),
  heading: msg('Akılda kalan web siteleri ve uygulamalar tasarlıyor ve kodluyoruz.'),
  phase: 2,
  title: (t) => t('Yaratıcı yazılım stüdyosu'),
  description: (t) => t('İstanbul’da web siteleri ve uygulamalar tasarlayıp kodlayan bir ekip.'),
  next: { to: 'work', kick: msg('Sonraki sayfa'), big: msg('İşler'), tone: 'ink' },
});

export const work = stub({
  id: 'work',
  section: 'work',
  theme: 'ink',
  kick: msg('İşler'),
  heading: msg('İşler.'),
  phase: 4,
  title: (t) => t('İşler'),
  description: (t) => t('Tasarladığımız ve kodladığımız projeler.'),
  next: { to: 'services', kick: msg('Sonraki sayfa'), big: msg('Hizmetler'), tone: 'paper' },
});

export const services = stub({
  id: 'services',
  section: 'services',
  theme: 'paper',
  kick: msg('Hizmetler'),
  heading: msg('Hizmetler.'),
  phase: 5,
  title: (t) => t('Hizmetler'),
  description: (t) => t('Web siteleri · uygulamalar · kimlik ve hareket.'),
  next: { to: 'process', kick: msg('Sonraki sayfa'), big: msg('Süreç'), tone: 'night' },
});

export const process = stub({
  id: 'process',
  section: 'services',
  theme: 'night',
  kick: msg('Süreç'),
  heading: msg('Süreç.'),
  phase: 6,
  title: (t) => t('Süreç'),
  description: (t) => t('Bir projenin ilk görüşmeden yayına kadar nasıl ilerlediği.'),
  next: { to: 'studio', kick: msg('Sonraki sayfa'), big: msg('Stüdyo'), tone: 'pink' },
});

export const studio = stub({
  id: 'studio',
  section: 'studio',
  theme: 'pink',
  kick: msg('Stüdyo'),
  heading: msg('İmleçler biziz.'),
  phase: 6,
  title: (t) => t('Stüdyo'),
  description: (t) => t('Lost Comma’nın arkasındaki ekip.'),
  next: { to: 'notes', kick: msg('Sonraki sayfa'), big: msg('Notes'), tone: 'milk' },
});

export const notes = stub({
  id: 'notes',
  section: 'notes',
  theme: 'milk',
  kick: msg('Notes'),
  heading: msg('Notes.'),
  phase: 7,
  title: (t) => t('Notes'),
  description: (t) => t('Tasarım ve kod üzerine yazdıklarımız.'),
  next: { to: 'lab', kick: msg('Sonraki sayfa'), big: msg('Lab'), tone: 'lab' },
});

export const lab = stub({
  id: 'lab',
  section: 'lab',
  theme: 'lab',
  kick: msg('Lab'),
  heading: msg('Lab.'),
  phase: 8,
  title: (t) => t('Lab'),
  description: (t) => t('Küçük deneyler ve canlı örnekler.'),
  next: { to: 'start', kick: msg('Tuhaf bir fikrin mi var?'), big: msg('Başlayalım'), tone: 'lime' },
});

export const start = stub({
  id: 'start',
  theme: 'lime',
  kick: msg('Proje başlat'),
  heading: msg('Konuşalım.'),
  phase: 9,
  title: (t) => t('Proje başlat'),
  description: (t) => t('Ofis saatlerimizden birini seç ve konuşalım.'),
  next: { to: 'work', kick: msg('Hâlâ karar veremedin mi?'), big: msg('İşlere bak'), tone: 'ink' },
});

export const now = stub({
  id: 'now',
  theme: 'sun',
  kick: msg('Şimdi'),
  heading: msg('Şimdi.'),
  phase: 10,
  title: (t) => t('Şimdi'),
  description: (t) => t('Bu ay neyle uğraşıyoruz.'),
  next: { to: 'uses', kick: msg('Ne kullanıyoruz'), big: msg('Araçlar'), tone: 'milk' },
});

export const uses = stub({
  id: 'uses',
  theme: 'milk',
  kick: msg('Araçlar'),
  heading: msg('Araçlar.'),
  phase: 10,
  title: (t) => t('Araçlar'),
  description: (t) => t('Masamızda ve kodumuzda kullandığımız araçlar.'),
  next: { to: 'lab', kick: msg('Bunlarla ne yapıyoruz'), big: msg('Lab'), tone: 'lab' },
});
