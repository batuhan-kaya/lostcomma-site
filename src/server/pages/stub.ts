import { html } from '../html';
import { msg } from '../msg';
import type { Page } from '../page';

/**
 * Phase 0 placeholders. Each one is replaced by the real page in its own phase (docs/PLAN.md).
 * They already carry the real theme · title · description · next band and header section.
 */
function stub(def: Omit<Page, 'body'> & { kick: string; heading: string; phase: number; plan: string[] }): Page {
  const { kick, heading, phase, plan, ...page } = def;
  return {
    scripts: ['stub'],
    ...page,
    body: (ctx) => html`<section class="stub" data-sec="hero">
<div class="wrap">
<p class="kick mono" data-rest="motion" data-rest-at="end 14 -2"><i class="fi" aria-hidden="true"></i><span>${ctx.t(kick)}</span><span aria-hidden="true">·</span><span class="url">lostcomma.co${ctx.path}</span></p>
<h1 class="h1" data-rest="design" data-rest-at="end 6 -10">${ctx.t(heading)}</h1>
<p class="lede" data-rest="code" data-rest-at="end 12 -4">${ctx.t('Bu sayfa {n}. aşamada kodlanacak.', { n: phase })}</p>
</div>
</section>
<section class="plan" data-sec="plan">
<div class="wrap">
<h2 class="kick mono">${ctx.t('Bu sayfaya gelecekler')}</h2>
<ol class="plist">${plan.map(
      (item, i) => html`<li><span class="mono">${String(i + 1).padStart(2, '0')}</span><span${i === 0 ? html` data-rest="host" data-rest-at="end 14 -6"` : ''}>${ctx.t(item)}</span></li>`,
    )}</ol>
</div>
</section>`,
  };
}

export const work = stub({
  id: 'work',
  plan: [msg('Katmanlar paneli ve proje önizlemesi'), msg('Görünürlük gözleriyle filtre'), msg('Kilitli NDA katmanları')],
  host: 'design',
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
  plan: [msg('Bir araç seç ve çiz'), msg('Araç kartları ve kombinasyonlar'), msg('Sık sorulanlar')],
  host: 'design',
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
  plan: [msg('Kurgu zaman çizelgesi'), msg('Haftalık ritüeller'), msg('Yayından sonrası')],
  host: 'motion',
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
  plan: [msg('Seçimlerden oluşan başlık'), msg('Ayarlar penceresi'), msg('Vapurlu İstanbul haritası')],
  host: 'design',
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
  plan: [msg('Bul ve vurgula'), msg('Blame sütunlu not listesi'), msg('Bülten ve konular')],
  host: 'code',
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
  plan: [msg('İmleçlere tepki veren virgül alanı'), msg('Altı canlı örnek'), msg('Mezun olan deneyler')],
  host: 'motion',
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
  plan: [msg('İki saat dilimli ofis saatleri'), msg('Randevu formu'), msg('Bilet şeklinde onay')],
  host: 'design',
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
  plan: [msg('Duvar takvimi ve notlar'), msg('Üç durum kartı'), msg('Geçmiş aylar')],
  host: 'design',
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
  plan: [msg('Araç klavyesi'), msg('Kayıp virgül tuşu'), msg('Kategorilere göre liste')],
  host: 'code',
  theme: 'milk',
  kick: msg('Araçlar'),
  heading: msg('Araçlar.'),
  phase: 10,
  title: (t) => t('Araçlar'),
  description: (t) => t('Masamızda ve kodumuzda kullandığımız araçlar.'),
  next: { to: 'lab', kick: msg('Bunlarla ne yapıyoruz'), big: msg('Lab'), tone: 'lab' },
});
