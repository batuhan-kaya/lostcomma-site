/**
 * Lab copy per language: the six experiments (each one is code in src/client/lab/) and where they
 * went. Short UI copy stays in t(). No commas anywhere.
 */
import type { Lang } from '../i18n';

export const EXP_KEYS = ['breathe', 'rain', 'dots', 'carets', 'dither', 'chain'] as const;
export type ExpKey = (typeof EXP_KEYS)[number];

export type ExpGroup = 'type' | 'motion' | 'pixels';
export type ExpFate = 'graduated' | 'lab' | 'retired';

/** What each experiment is made of and what its one control does (the same in both languages). */
export const EXPS: Record<ExpKey, { no: string; group: ExpGroup; fate: ExpFate; control: { min: number; max: number; step: number; value: number } | null }> = {
  breathe: { no: 'EXP-001', group: 'type', fate: 'lab', control: null },
  rain: { no: 'EXP-002', group: 'motion', fate: 'lab', control: { min: 20, max: 260, step: 10, value: 120 } },
  dots: { no: 'EXP-003', group: 'motion', fate: 'graduated', control: { min: 0, max: 1.6, step: 0.05, value: 0.8 } },
  carets: { no: 'EXP-004', group: 'type', fate: 'retired', control: { min: 40, max: 200, step: 5, value: 96 } },
  dither: { no: 'EXP-005', group: 'pixels', fate: 'lab', control: { min: 2, max: 6, step: 1, value: 3 } },
  chain: { no: 'EXP-006', group: 'motion', fate: 'graduated', control: { min: 0.02, max: 0.3, step: 0.01, value: 0.12 } },
};

/** The order of the log: graduated first · then the lab · then the retired. */
export const LOG_ORDER: ExpKey[] = ['chain', 'dots', 'breathe', 'dither', 'rain', 'carets'];

export interface ExpCopy {
  /** Title on the tile and in the log. */
  t: string;
  /** Material · technique. */
  tag: string;
  /** The control's label (the word field for breathe). */
  control: string;
  /** Where it went (the log). */
  fate: string;
  /** What a screen reader hears about the live drawing. */
  alt: string;
}

export interface LabCopy {
  lede: string;
  exps: Record<ExpKey, ExpCopy>;
  /** The word that breathes until you type your own (nine letters at most). */
  word: string;
}

const en: LabCopy = {
  lede: 'Small experiments in code and type and motion. Some end up in client work. Most just make us happy. Everything here runs live in your browser.',
  word: 'breathe',
  exps: {
    breathe: { t: 'Type that breathes', tag: 'Type · variable font', control: 'Word', fate: 'Waiting for a client brave enough for a moving wordmark.', alt: 'A word that grows wider and bolder as it breathes and follows your pointer.' },
    rain: { t: 'Comma rain', tag: 'Motion · canvas', control: 'Density', fate: 'We keep losing commas. This is where they go.', alt: 'Commas fall like rain and your pointer holds them off like an umbrella.' },
    dots: { t: 'Magnetic dots', tag: 'Motion · canvas', control: 'Pull', fate: 'Its comma version became the field at the top of this page.', alt: 'A grid of dots that leans toward your pointer.' },
    carets: { t: 'Caret orchestra', tag: 'Type · canvas', control: 'Tempo', fate: 'Too hypnotic for a client. Perfect for us.', alt: 'A row of text carets that rise and fall in time.' },
    dither: { t: 'Dither sun', tag: 'Pixels · canvas', control: 'Levels', fate: 'Waiting for the right poster.', alt: 'A sun made of a few flat tones and a pattern of dots that follows your pointer.' },
    chain: { t: 'Spring chain', tag: 'Motion · physics', control: 'Stiffness', fate: 'Now moves the cursors on this very site.', alt: 'A chain of springs that trails after your pointer.' },
  },
};

const tr: LabCopy = {
  lede: 'Kod ve yazı ve hareketle küçük deneyler. Bazıları müşteri işlerine giriyor. Çoğu sadece bizi mutlu ediyor. Buradaki her şey tarayıcında canlı çalışıyor.',
  word: 'nefes',
  exps: {
    breathe: { t: 'Nefes alan yazı', tag: 'Tipografi · değişken font', control: 'Kelime', fate: 'Hareket eden bir logo isteyecek cesur bir müşteri bekliyor.', alt: 'Nefes aldıkça genişleyen ve kalınlaşan ve imlecini takip eden bir kelime.' },
    rain: { t: 'Virgül yağmuru', tag: 'Hareket · canvas', control: 'Yoğunluk', fate: 'Virgülleri kaybetmeye devam ediyoruz. Hepsi buraya geliyor.', alt: 'Yağmur gibi yağan virgüller ve onları şemsiye gibi tutan imlecin.' },
    dots: { t: 'Mıknatıslı noktalar', tag: 'Hareket · canvas', control: 'Çekim', fate: 'Virgüllü hâli bu sayfanın en üstündeki alan oldu.', alt: 'İmlecine doğru eğilen bir nokta ızgarası.' },
    carets: { t: 'İmleç orkestrası', tag: 'Tipografi · canvas', control: 'Tempo', fate: 'Bir müşteri için fazla hipnotik. Bizim için tam kıvamında.', alt: 'Aynı ritimle yükselip alçalan bir sıra metin imleci.' },
    dither: { t: 'Noktalı güneş', tag: 'Piksel · canvas', control: 'Ton', fate: 'Doğru afişi bekliyor.', alt: 'Birkaç düz tondan ve imlecini takip eden bir nokta deseninden oluşan bir güneş.' },
    chain: { t: 'Yay zinciri', tag: 'Hareket · fizik', control: 'Sertlik', fate: 'Bu sitedeki imleçleri artık o hareket ettiriyor.', alt: 'İmlecinin peşinden giden bir yay zinciri.' },
  },
};

export const LAB: Record<Lang, LabCopy> = { tr, en };
