/**
 * Sample content from the design board: the projects on the Work page · the team · the Notes list.
 * Used for development · tests · staging until the panel (phase 11) holds the real content.
 * Square-bracket placeholders ([Name]) are waiting for real values from Batuhan.
 * No commas in any text: the brand rule covers database content too (checked by a test).
 */
import type { Localized } from './schema';

type Crew = 'design' | 'code' | 'motion';
type Discipline = 'web' | 'app' | 'identity' | 'motion';

export interface SamplePerson {
  crew: Crew;
  name: string;
  keys: string[];
  text: Record<'tr' | 'en', { role: string; usually: string; rightNow: string; keysDo: string; hello: string }>;
}

export interface SampleProject {
  no: number;
  discipline: Discipline;
  year: number;
  status: 'live' | 'nda';
  boardSlot?: number;
  art?: string;
  text: Record<'tr' | 'en', { slug: string; name: string; kind: string; summary?: string; client?: string }>;
}

export interface SampleNote {
  author: Crew;
  date: string;
  tags: string[];
  text: Partial<Record<'tr' | 'en', { slug: string; title: string; excerpt: string; body?: string }>>;
}

export interface SampleContent {
  people: SamplePerson[];
  projects: SampleProject[];
  notes: SampleNote[];
}

export const SAMPLE_PEOPLE: SamplePerson[] = [
  {
    crew: 'design',
    name: '[Name]',
    keys: ['⌘', 'D'],
    text: {
      en: { role: 'Design lead', usually: 'Drawing boxes and then deleting most of them.', rightNow: 'Choosing between two almost identical greys.', keysDo: 'duplicate', hello: 'hi there. nice cursor' },
      tr: { role: 'Tasarım lideri', usually: 'Kutular çizip sonra çoğunu silmek.', rightNow: 'Neredeyse aynı iki gri arasında seçim yapmak.', keysDo: 'çoğalt', hello: 'selam. güzel imleç' },
    },
  },
  {
    crew: 'code',
    name: '[Name]',
    keys: ['⌘', '⇧', 'P'],
    text: {
      en: { role: 'Engineering lead', usually: 'Making the boxes work on a phone from 2019.', rightNow: 'Deleting more code than writing.', keysDo: 'everything', hello: 'hello. you found me' },
      tr: { role: 'Yazılım lideri', usually: 'Kutuları 2019’dan kalma bir telefonda çalıştırmak.', rightNow: 'Yazdığından çok kod silmek.', keysDo: 'her şey', hello: 'merhaba. beni buldun' },
    },
  },
  {
    crew: 'motion',
    name: '[Name]',
    keys: ['Space'],
    text: {
      en: { role: 'Motion lead', usually: 'Tuning a curve until nobody notices it.', rightNow: 'Making a loader feel like a tide.', keysDo: 'play', hello: 'heyyy' },
      tr: { role: 'Hareket lideri', usually: 'Bir eğriyi kimse fark etmeyene kadar ayarlamak.', rightNow: 'Bir yükleniyor animasyonunu gelgit gibi hissettirmek.', keysDo: 'oynat', hello: 'heyyy' },
    },
  },
];

const p = (
  no: number,
  discipline: Discipline,
  year: number,
  en: SampleProject['text']['en'],
  tr: SampleProject['text']['tr'],
  extra: Partial<Pick<SampleProject, 'boardSlot' | 'art' | 'status'>> = {},
): SampleProject => ({ no, discipline, year, status: 'live', ...extra, text: { en, tr } });

/** Newest first. The homepage board shows the seven with a boardSlot (the eighth frame is the Lab). */
export const SAMPLE_PROJECTS: SampleProject[] = [
  p(16, 'web', 2026, { slug: 'climate-data-platform', name: 'Climate data platform', kind: 'Web app' }, { slug: 'iklim-veri-platformu', name: 'İklim veri platformu', kind: 'Web uygulaması' }),
  p(15, 'app', 2026, { slug: 'museum-audio-guide', name: 'Museum audio guide', kind: 'iOS and Android' }, { slug: 'muze-sesli-rehber', name: 'Müze sesli rehberi', kind: 'iOS ve Android' }),
  p(
    14,
    'web',
    2026,
    {
      slug: 'sailing-club',
      name: 'Sailing club',
      kind: 'Website and app',
      client: 'Sailing club · Istanbul',
      summary: 'A new website and booking app for a sailing club on the Marmara Sea. The members wanted fewer phone calls and more time on the water.',
    },
    {
      slug: 'yelken-kulubu',
      name: 'Yelken kulübü',
      kind: 'Web sitesi ve uygulama',
      client: 'Yelken kulübü · İstanbul',
      summary: 'Marmara’da bir yelken kulübü için yeni web sitesi ve rezervasyon uygulaması. Üyeler daha az telefon ve suda daha çok vakit istedi.',
    },
    { boardSlot: 0, art: 'sail' },
  ),
  p(13, 'motion', 2026, { slug: 'product-launch-film', name: 'Product launch film', kind: 'Film · 40 seconds' }, { slug: 'urun-lansman-filmi', name: 'Ürün lansman filmi', kind: 'Film · 40 saniye' }),
  p(12, 'app', 2026, { slug: 'nda-012', name: 'Private project', kind: 'Under NDA · fintech' }, { slug: 'nda-012', name: 'Gizli proje', kind: 'Gizlilik sözleşmeli · fintech' }, { status: 'nda' }),
  p(11, 'identity', 2026, { slug: 'ceramics-studio', name: 'Ceramics studio', kind: 'Identity and online shop' }, { slug: 'seramik-atolyesi', name: 'Seramik atölyesi', kind: 'Kimlik ve online mağaza' }, { boardSlot: 1, art: 'cera' }),
  p(10, 'identity', 2025, { slug: 'neighbourhood-bakery', name: 'Neighbourhood bakery', kind: 'Identity and packaging' }, { slug: 'mahalle-firini', name: 'Mahalle fırını', kind: 'Kimlik ve ambalaj' }),
  p(9, 'motion', 2025, { slug: 'music-festival', name: 'Music festival', kind: 'Identity and motion' }, { slug: 'muzik-festivali', name: 'Müzik festivali', kind: 'Kimlik ve hareket' }, { boardSlot: 2, art: 'fest' }),
  p(8, 'app', 2025, { slug: 'fintech-app', name: 'Fintech app', kind: 'iOS and Android' }, { slug: 'fintech-uygulamasi', name: 'Fintech uygulaması', kind: 'iOS ve Android' }, { boardSlot: 3, art: 'fin' }),
  p(7, 'app', 2025, { slug: 'nda-007', name: 'Private project', kind: 'Under NDA · hardware' }, { slug: 'nda-007', name: 'Gizli proje', kind: 'Gizlilik sözleşmeli · donanım' }, { status: 'nda' }),
  p(6, 'web', 2025, { slug: 'coffee-roaster', name: 'Coffee roaster', kind: 'Packaging and website' }, { slug: 'kahve-kavurucusu', name: 'Kahve kavurucusu', kind: 'Ambalaj ve web sitesi' }, { boardSlot: 4, art: 'cof' }),
  p(5, 'app', 2024, { slug: 'ferry-timetable', name: 'Ferry timetable', kind: 'iOS app' }, { slug: 'vapur-saatleri', name: 'Vapur saatleri', kind: 'iOS uygulaması' }),
  p(4, 'web', 2024, { slug: 'architecture-office', name: 'Architecture office', kind: 'Website' }, { slug: 'mimarlik-ofisi', name: 'Mimarlık ofisi', kind: 'Web sitesi' }, { boardSlot: 5, art: 'arc' }),
  p(3, 'motion', 2024, { slug: 'radio-idents', name: 'Radio idents', kind: 'Motion · 12 idents' }, { slug: 'radyo-jenerikleri', name: 'Radyo jenerikleri', kind: 'Hareket · 12 jenerik' }),
  p(2, 'identity', 2024, { slug: 'bookshop', name: 'Bookshop', kind: 'Identity and online shop' }, { slug: 'kitapci', name: 'Kitapçı', kind: 'Kimlik ve online mağaza' }, { boardSlot: 6, art: 'book' }),
  p(1, 'web', 2024, { slug: 'lost-comma', name: 'Lost Comma', kind: 'This website' }, { slug: 'lost-comma', name: 'Lost Comma', kind: 'Bu web sitesi' }),
];

const n = (author: Crew, date: string, tags: string[], text: SampleNote['text']): SampleNote => ({ author, date, tags, text });

/** Some notes exist in one language only: the Notes page shows them with a language badge. */
export const SAMPLE_NOTES: SampleNote[] = [
  n('code', '2026-10-24', ['motion', 'code'], {
    en: { slug: 'how-our-cursors-move', title: 'How our cursors move', excerpt: 'A thirty line spring and why we slowed it down.' },
    tr: { slug: 'imleclerimiz-nasil-hareket-ediyor', title: 'İmleçlerimiz nasıl hareket ediyor', excerpt: 'Otuz satırlık bir yay ve onu neden yavaşlattık.' },
  }),
  n('design', '2026-10-10', ['type', 'performance'], {
    en: { slug: 'variable-fonts-on-a-budget', title: 'Variable fonts on a budget', excerpt: 'Anybody ships at 38 kb. Here is how we subset it for Turkish.' },
  }),
  n('code', '2026-09-28', ['i18n', 'code'], {
    tr: { slug: 'turkce-buyuk-harf-sorunu', title: 'Türkçe büyük harf sorunu', excerpt: 'Neden METIN yazıyor ve lang niteliği neden önemli.' },
  }),
  n('code', '2026-09-12', ['tooling'], {
    en: { slug: 'a-boring-stack-on-purpose', title: 'A boring stack on purpose', excerpt: 'Fastify and Postgres and a build script we can read in one sitting.' },
    tr: { slug: 'bilerek-sikici-bir-altyapi', title: 'Bilerek sıkıcı bir altyapı', excerpt: 'Fastify ve Postgres ve tek oturuşta okunabilen bir derleme betiği.' },
  }),
  n('motion', '2026-08-30', ['motion'], {
    en: { slug: 'easing-curves-we-actually-use', title: 'Easing curves we actually use', excerpt: 'Four curves. That is the whole library.' },
  }),
  n('code', '2026-08-14', ['code', 'tooling'], {
    en: { slug: 'forms-from-a-schema', title: 'Forms from a schema', excerpt: 'Our editor writes its own forms. We just describe the content.' },
    tr: { slug: 'semadan-formlar', title: 'Şemadan formlar', excerpt: 'Editörümüz formlarını kendi yazıyor. Biz sadece içeriği tarif ediyoruz.' },
  }),
  n('design', '2026-07-29', ['design'], {
    en: { slug: 'designing-at-real-widths', title: 'Designing at real widths', excerpt: 'Why our first mockup is a link and not a picture.' },
  }),
  n('code', '2026-07-11', ['tooling'], {
    en: { slug: 'share-images-without-a-design-tool', title: 'Share images without a design tool', excerpt: 'opentype and sharp and one template for every page.' },
    tr: { slug: 'tasarim-araci-olmadan-paylasim-gorselleri', title: 'Tasarım aracı olmadan paylaşım görselleri', excerpt: 'opentype ve sharp ve her sayfa için tek bir şablon.' },
  }),
  n('motion', '2026-06-20', ['motion', 'a11y'], {
    tr: { slug: 'hareketi-azaltmak-kapatmak-degil', title: 'Hareketi azaltmak kapatmak değil', excerpt: 'Reduced motion için daha iyi bir varsayılan.' },
  }),
  n('design', '2026-06-02', ['studio'], {
    en: { slug: 'what-a-sailing-club-taught-us', title: 'What a sailing club taught us', excerpt: 'Fewer phone calls was the whole brief.' },
    tr: { slug: 'bir-yelken-kulubunun-bize-ogrettikleri', title: 'Bir yelken kulübünün bize öğrettikleri', excerpt: 'Bütün brief daha az telefondu.' },
  }),
  n('code', '2026-05-18', ['i18n', 'tooling'], {
    en: { slug: 'two-languages-and-one-build', title: 'Two languages and one build', excerpt: 'Turkish source and English at build time.' },
    tr: { slug: 'iki-dil-ve-tek-derleme', title: 'İki dil ve tek derleme', excerpt: 'Kaynak Türkçe ve İngilizce derleme sırasında.' },
  }),
  n('design', '2026-04-30', ['studio'], {
    en: { slug: 'our-friday-demo-template', title: 'Our Friday demo template', excerpt: 'Thirty minutes and a recording. Here is the script.' },
  }),
];

export const SAMPLE: SampleContent = { people: SAMPLE_PEOPLE, projects: SAMPLE_PROJECTS, notes: SAMPLE_NOTES };

/** Alt text for the generated demo cover (SEED=demo). */
export const DEMO_ALT: Localized = {
  en: 'Demo image: an evening sea with two sails',
  tr: 'Deneme görseli: akşam denizinde iki yelken',
};
