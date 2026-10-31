/**
 * Studio copy per language: the title made of selections · the settings window · the toasts it
 * answers with. People (names · roles · shortcuts) come from the database. No commas anywhere.
 */
import type { Lang } from '../i18n';

export type Crew = 'design' | 'code' | 'motion';

/** One word of the title. A word with `who` gets that teammate's selection box. */
export interface TitleWord {
  w: string;
  who?: Crew;
}

export interface SettingRow {
  key: string;
  t: string;
  d: string;
  /** locked rows refuse to move · toggles bounce back · the rest really switch. */
  kind: 'bounce' | 'locked' | 'switch';
  /** What the window says when you touch it ([on · off] for real switches). */
  toast: string[];
}

export interface StudioCopy {
  title: TitleWord[][];
  lede: string;
  bold: string;
  after: string;
  team: { h: string; p: string };
  values: SettingRow[];
  display: SettingRow[];
  office: {
    meet: { t: string; d: string; levels: [string, string, string, string]; warn: string };
    drink: { t: string; d: string; options: { v: string; n: string; toast: string }[] };
    dog: SettingRow;
  };
}

const en: StudioCopy = {
  title: [[{ w: 'We' }, { w: 'are' }], [{ w: 'the', who: 'design' }, { w: 'cursors', who: 'code' }, { w: '.', who: 'motion' }]],
  lede: 'Lost Comma is a small design and engineering studio in Istanbul.',
  bold: 'The cursors you keep meeting on this site are us.',
  after: 'They are a little shy so be kind.',
  team: {
    h: 'Three people.\nThree cursors.',
    p: 'Small on purpose. The people you meet on the first call are the people who design and build and animate your project.',
  },
  values: [
    { key: 'open', kind: 'bounce', t: 'Work in the open', d: 'You can open our working file at any time. Unfinished work included.', toast: ['We tried closed doors once. Never again.'] },
    { key: 'demo', kind: 'bounce', t: 'Friday demos', d: 'Thirty minutes every week. We show and you tell.', toast: ['Fridays are sacred. Back on.'] },
    { key: 'dark', kind: 'locked', t: 'Dark patterns', d: 'Fake timers and hidden checkboxes and guilt buttons.', toast: ['Not available in this studio.'] },
    { key: 'comma', kind: 'locked', t: 'Commas', d: 'We lost one in 2024. Still looking.', toast: ['We lost it. That is the whole point.'] },
  ],
  display: [
    { key: 'still', kind: 'switch', t: 'Reduce motion', d: 'Stops every animation and keeps the cursors still.', toast: ['Motion reduced. The cursors are holding still.', 'Motion is back.'] },
    { key: 'big', kind: 'switch', t: 'Bigger text', d: 'Makes the reading text on this page a quarter bigger.', toast: ['Reading text is bigger now.', 'Back to normal size.'] },
    { key: 'hc', kind: 'switch', t: 'High contrast', d: 'Darkens the grey text and turns the soft colours to black and white.', toast: ['High contrast on.', 'Soft colours are back.'] },
  ],
  office: {
    meet: { t: 'Meetings', d: 'How many we would like in a normal week.', levels: ['As few as possible', 'A few', 'Quite a lot', 'Every day'], warn: 'Are you sure? We will be slower.' },
    drink: {
      t: 'Drink at the desk',
      d: 'We will have it ready when you visit.',
      options: [
        { v: 'cay', n: 'Çay in a tulip glass', toast: 'Good choice. The kettle is on.' },
        { v: 'kahve', n: 'Turkish coffee', toast: 'We will read your cup after.' },
        { v: 'filter', n: 'Filter coffee', toast: 'We have a very serious grinder.' },
        { v: 'su', n: 'Just water', toast: 'Fair enough.' },
      ],
    },
    dog: { key: 'dog', kind: 'locked', t: 'Studio dog', d: 'Not yet. We are working on it.', toast: ['Soon. We promise.'] },
  },
};

const tr: StudioCopy = {
  title: [[{ w: 'İmleçler', who: 'design' }], [{ w: 'biziz', who: 'code' }, { w: '.', who: 'motion' }]],
  lede: 'Lost Comma İstanbul’da küçük bir tasarım ve yazılım stüdyosu.',
  bold: 'Bu sitede karşılaştığın imleçler biziz.',
  after: 'Biraz utangaçlar o yüzden nazik ol.',
  team: {
    h: 'Üç kişi.\nÜç imleç.',
    p: 'Bilerek küçüğüz. İlk görüşmede tanıştığın insanlar projeni tasarlayan ve kuran ve canlandıran insanlar.',
  },
  values: [
    { key: 'open', kind: 'bounce', t: 'Açıkta çalış', d: 'Çalışma dosyamızı istediğin an açabilirsin. Bitmemiş işler dahil.', toast: ['Bir kez kapalı kapı denedik. Bir daha asla.'] },
    { key: 'demo', kind: 'bounce', t: 'Cuma demoları', d: 'Her hafta otuz dakika. Biz gösteririz sen söylersin.', toast: ['Cumalar kutsal. Yeniden açık.'] },
    { key: 'dark', kind: 'locked', t: 'Karanlık desenler', d: 'Sahte sayaçlar ve gizli onay kutuları ve suçluluk düğmeleri.', toast: ['Bu stüdyoda yok.'] },
    { key: 'comma', kind: 'locked', t: 'Virgüller', d: '2024’te bir tane kaybettik. Hâlâ arıyoruz.', toast: ['Kaybettik. Bütün mesele bu.'] },
  ],
  display: [
    { key: 'still', kind: 'switch', t: 'Hareketi azalt', d: 'Bütün animasyonları durdurur ve imleçleri yerinde tutar.', toast: ['Hareket azaldı. İmleçler kıpırdamıyor.', 'Hareket geri geldi.'] },
    { key: 'big', kind: 'switch', t: 'Daha büyük yazı', d: 'Bu sayfadaki okuma metnini dörtte bir büyütür.', toast: ['Okuma metni artık daha büyük.', 'Normal boyuta döndü.'] },
    { key: 'hc', kind: 'switch', t: 'Yüksek kontrast', d: 'Gri yazıları koyulaştırır ve yumuşak renkleri siyah beyaza çevirir.', toast: ['Yüksek kontrast açık.', 'Yumuşak renkler geri geldi.'] },
  ],
  office: {
    meet: { t: 'Toplantılar', d: 'Normal bir haftada kaç tane isteriz.', levels: ['Olabildiğince az', 'Birkaç tane', 'Epey', 'Her gün'], warn: 'Emin misin? Yavaşlarız.' },
    drink: {
      t: 'Masadaki içecek',
      d: 'Geldiğinde hazır olur.',
      options: [
        { v: 'cay', n: 'İnce belli bardakta çay', toast: 'İyi seçim. Çaydanlık ocakta.' },
        { v: 'kahve', n: 'Türk kahvesi', toast: 'Sonra fincanına bakarız.' },
        { v: 'filter', n: 'Filtre kahve', toast: 'Çok ciddi bir öğütücümüz var.' },
        { v: 'su', n: 'Sadece su', toast: 'Olur.' },
      ],
    },
    dog: { key: 'dog', kind: 'locked', t: 'Stüdyo köpeği', d: 'Henüz yok. Üzerinde çalışıyoruz.', toast: ['Yakında. Söz.'] },
  },
};

export const STUDIO: Record<Lang, StudioCopy> = { tr, en };
