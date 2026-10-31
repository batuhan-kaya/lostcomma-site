/**
 * Sample content from the design board: the projects on the Work page · the team · the Notes list.
 * Used for development · tests · staging until the panel (phase 11) holds the real content.
 * Square-bracket placeholders ([Name]) are waiting for real values from Batuhan.
 * No commas in any text: the brand rule covers database content too (checked by a test).
 */
import type { Localized } from './schema';
import { NOTE_BODIES } from './sample-notes';
import type { StoryInput } from './story';

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
  story?: StoryInput;
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

const both = (en: string, tr: string) => ({ en, tr });

/** The full case study from the design board: every section of the case page. */
const SAILING_STORY: StoryInput = {
  theme: 'navy',
  weeks: 14,
  liveSince: '2026-04-03',
  team: ['design', 'code', 'motion'],
  scope: both('Website · App · Identity refresh', 'Web sitesi · Uygulama · Kimlik yenileme'),
  tags: [both('Website', 'Web sitesi'), both('App', 'Uygulama'), both('Identity', 'Kimlik')],
  bubbles: [
    { who: 'motion', text: both('the sail really sways', 'yelken gerçekten sallanıyor') },
    { who: 'code', text: both('fourteen weeks. two apps', 'on dört hafta. iki uygulama') },
  ],
  history: {
    heading: both('From a napkin\nto the water.', 'Peçeteden\nsuya.'),
    intro: both('Every project has a version history. This is ours for the club. Drag back in time or let it play.', 'Her projenin bir sürüm geçmişi var. Bu da kulübün geçmişi. Zamanda geri sürükle ya da oynat.'),
    mock: 'sail',
    versions: [
      { v: 'v0.1', date: '2026-01-12', who: 'design', title: both('First sketch', 'İlk eskiz'), summary: both('Pen on paper. One big sunset and a booking button you cannot miss.', 'Kâğıt ve kalem. Kocaman bir gün batımı ve gözden kaçmayacak bir rezervasyon düğmesi.'), comment: both('napkin first. pixels later', 'önce peçete. sonra piksel') },
      { v: 'v0.3', date: '2026-01-26', who: 'design', title: both('Wireframes', 'Tel çerçeveler'), summary: both('Grey boxes for every page. Members tested them on their phones in the clubhouse.', 'Her sayfa için gri kutular. Üyeler onları kulüp binasında telefonlarında denedi.'), comment: both('boxes before beauty', 'önce kutular. sonra güzellik') },
      { v: 'v0.6', date: '2026-02-18', who: 'motion', title: both('Look and motion', 'Görünüm ve hareket'), summary: both('Colour from the evening light on the Marmara. The sail sways at the speed of the real wind.', 'Renkler Marmara’daki akşam ışığından. Yelken gerçek rüzgârın hızında sallanıyor.'), comment: both('the sunset was the brief', 'brief gün batımıydı') },
      { v: 'v0.9', date: '2026-03-20', who: 'code', title: both('Built', 'Kodlandı'), summary: both('Twelve components and one booking engine. Every page loads before the kettle boils.', 'On iki bileşen ve tek bir rezervasyon motoru. Her sayfa çaydanlık kaynamadan açılıyor.'), comment: both('every component has a test', 'her bileşenin bir testi var') },
      { v: 'v1.0', date: '2026-04-03', who: 'design', title: both('Launched', 'Yayında'), summary: both('Live the week before the Spring cup. The phone at the club rang a little less that week.', 'Bahar kupasından bir hafta önce yayında. O hafta kulüpte telefon biraz daha az çaldı.'), comment: both('we are live. go sailing', 'yayındayız. hadi denize') },
      { v: 'v1.2', date: '2026-06-09', who: 'code', title: both('Booking app', 'Rezervasyon uygulaması'), summary: both('The same engine in your pocket. Pick a boat and a time and you are done.', 'Aynı motor cebinde. Bir tekne ve bir saat seç ve bitti.'), comment: both('three taps. we counted', 'üç dokunuş. saydık') },
    ],
  },
  brief: {
    heading: both('Fewer phone calls.\nMore sailing.', 'Daha az telefon.\nDaha çok yelken.'),
    before: both('Every booking happened on the phone. The race calendar lived in a PDF that nobody could find. New members did not know where to start.', 'Her rezervasyon telefonla yapılıyordu. Yarış takvimi kimsenin bulamadığı bir PDF’teydi. Yeni üyeler nereden başlayacağını bilmiyordu.'),
    after: both('Members book a boat in three taps. The calendar updates itself from the race office. The site explains the club to people who have never held a rope.', 'Üyeler üç dokunuşta tekne ayırıyor. Takvim yarış ofisinden kendini güncelliyor. Site kulübü hiç halat tutmamış insanlara anlatıyor.'),
    quote: { text: both('[A sentence from the club about working with the team. Short and true.]', '[Kulüpten ekiple çalışmak üzerine bir cümle. Kısa ve doğru.]'), cite: both('[Name] · Club secretary', '[İsim] · Kulüp sekreteri') },
  },
  details: {
    tiles: [
      {
        kind: 'palette',
        kick: both('Colour · click to copy', 'Renk · kopyalamak için tıkla'),
        title: both('Evening on the Marmara', 'Marmara’da akşam'),
        swatches: [
          { name: both('Dawn', 'Şafak'), hex: '#F7CDA6', ink: '#0F1F3A' },
          { name: both('Flare', 'Parıltı'), hex: '#EBA99B', ink: '#0F1F3A' },
          { name: both('Dusk', 'Alacakaranlık'), hex: '#C7869A', ink: '#0F1F3A' },
          { name: both('Deep', 'Derin'), hex: '#1C3564', ink: '#F6EFE6' },
          { name: both('Sail', 'Yelken'), hex: '#FFFFFF', ink: '#0F1F3A' },
        ],
      },
      { kind: 'type', kick: both('Type · hover it', 'Yazı · üstüne gel'), title: both('Wide and loud', 'Geniş ve gür'), spec: [both('Anybody · 50 to 150', 'Anybody · 50 ile 150'), both('Geist', 'Geist')] },
      { kind: 'wind', kick: both('Live wind', 'Canlı rüzgâr'), title: both('Real wind at the pier', 'İskelede gerçek rüzgâr'), value: '14', unit: both('kn · NE', 'kn · KD') },
      { kind: 'steps', kick: both('Booking', 'Rezervasyon'), title: both('Three taps', 'Üç dokunuş'), steps: [both('Boat', 'Tekne'), both('Time', 'Saat'), both('Done', 'Tamam')] },
      { kind: 'tide', kick: both('Loading', 'Yükleniyor'), title: both('The tide loader', 'Gelgit yükleyicisi'), word: both('Waiting', 'Bekliyor'), note: both('feels like the sea', 'deniz gibi hissettiriyor') },
    ],
  },
  results: {
    kick: both('After one season', 'Bir sezon sonra'),
    numbers: [
      { value: both('[X]%', '%[X]'), label: both('of all bookings now happen online', 'rezervasyon artık çevrim içi yapılıyor') },
      { value: both('[X]', '[X]'), label: both('fewer phone calls at the club every week', 'kulüpte her hafta daha az telefon') },
      { value: both('[X]', '[X]'), label: both('new members in the first season', 'ilk sezonda yeni üye') },
    ],
    stack: ['TypeScript', 'Fastify', 'PostgreSQL', 'SwiftUI', 'Jetpack Compose', 'Caddy'],
  },
  credits: {
    rows: [
      { who: 'design', name: both('[Name]', '[İsim]'), did: both('Identity refresh and every screen', 'Kimlik yenileme ve her ekran'), count: both('214 edits', '214 düzenleme') },
      { who: 'code', name: both('[Name]', '[İsim]'), did: both('Website and booking engine and both apps', 'Web sitesi ve rezervasyon motoru ve iki uygulama'), count: both('388 commits', '388 commit') },
      { who: 'motion', name: both('[Name]', '[İsim]'), did: both('Sail and wind and tide', 'Yelken ve rüzgâr ve gelgit'), count: both('41 curves', '41 eğri') },
      { who: 'client', label: both('the club', 'kulüp'), name: both('[Names]', '[İsimler]'), did: both('Opinions on every shade of blue', 'Mavinin her tonu hakkında fikirler'), count: both('∞ coffees', '∞ kahve') },
    ],
  },
};

const p = (
  no: number,
  discipline: Discipline,
  year: number,
  en: SampleProject['text']['en'],
  tr: SampleProject['text']['tr'],
  extra: Partial<Pick<SampleProject, 'boardSlot' | 'art' | 'status' | 'story'>> = {},
): SampleProject => ({ no, discipline, year, status: 'live', ...extra, text: { en, tr } });

/** Newest first. The homepage board shows the seven with a boardSlot (the eighth frame is the Lab). */
export const SAMPLE_PROJECTS: SampleProject[] = [
  p(16, 'web', 2026, { slug: 'climate-data-platform', name: 'Climate data platform', kind: 'Web app', summary: 'A data platform that turns climate records into charts people can read on a phone.' }, { slug: 'iklim-veri-platformu', name: 'İklim veri platformu', kind: 'Web uygulaması', summary: 'İklim kayıtlarını telefonda okunabilen grafiklere çeviren bir veri platformu.' }, { art: 'clim', story: { team: ['design', 'code'], scope: { en: 'Web app · Data design', tr: 'Web uygulaması · Veri tasarımı' } } }),
  p(15, 'app', 2026, { slug: 'museum-audio-guide', name: 'Museum audio guide', kind: 'iOS and Android', summary: 'An audio guide that knows which room you are in and lets the works speak.' }, { slug: 'muze-sesli-rehber', name: 'Müze sesli rehberi', kind: 'iOS ve Android', summary: 'Hangi salonda olduğunu bilen ve eserleri konuşturan bir sesli rehber.' }, { art: 'musm', story: { team: ['design', 'code'], scope: { en: 'iOS · Android', tr: 'iOS · Android' } } }),
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
    { boardSlot: 0, art: 'sail', story: SAILING_STORY },
  ),
  p(13, 'motion', 2026, { slug: 'product-launch-film', name: 'Product launch film', kind: 'Film · 40 seconds', summary: 'Forty seconds that explain a product before the coffee gets cold.' }, { slug: 'urun-lansman-filmi', name: 'Ürün lansman filmi', kind: 'Film · 40 saniye', summary: 'Bir ürünü kahve soğumadan anlatan kırk saniye.' }, { art: 'film', story: { team: ['motion', 'design'], scope: { en: 'Film · Sound design', tr: 'Film · Ses tasarımı' } } }),
  p(12, 'app', 2026, { slug: 'nda-012', name: 'Private project', kind: 'Under NDA · fintech' }, { slug: 'nda-012', name: 'Gizli proje', kind: 'Gizlilik sözleşmeli · fintech' }, { status: 'nda' }),
  p(11, 'identity', 2026, { slug: 'ceramics-studio', name: 'Ceramics studio', kind: 'Identity and online shop', summary: 'A soft identity and a small online shop for a ceramics studio in Kadıköy.' }, { slug: 'seramik-atolyesi', name: 'Seramik atölyesi', kind: 'Kimlik ve online mağaza', summary: 'Kadıköy’de bir seramik atölyesi için yumuşak bir kimlik ve küçük bir online mağaza.' }, { boardSlot: 1, art: 'cera', story: { team: ['design', 'code'], scope: { en: 'Identity · Online shop', tr: 'Kimlik · Online mağaza' } } }),
  p(10, 'identity', 2025, { slug: 'neighbourhood-bakery', name: 'Neighbourhood bakery', kind: 'Identity and packaging', summary: 'A warm identity and paper bags for the bakery on the corner.' }, { slug: 'mahalle-firini', name: 'Mahalle fırını', kind: 'Kimlik ve ambalaj', summary: 'Köşedeki fırın için sıcak bir kimlik ve kâğıt poşetler.' }, { art: 'bake', story: { team: ['design'], scope: { en: 'Identity · Packaging', tr: 'Kimlik · Ambalaj' } } }),
  p(9, 'motion', 2025, { slug: 'music-festival', name: 'Music festival', kind: 'Identity and motion', summary: 'A loud identity and stage visuals for three nights of music.' }, { slug: 'muzik-festivali', name: 'Müzik festivali', kind: 'Kimlik ve hareket', summary: 'Üç gecelik müzik için gür bir kimlik ve sahne görselleri.' }, { boardSlot: 2, art: 'fest', story: { team: ['design', 'motion'], scope: { en: 'Identity · Motion · Stage', tr: 'Kimlik · Hareket · Sahne' } } }),
  p(8, 'app', 2025, { slug: 'fintech-app', name: 'Fintech app', kind: 'iOS and Android', summary: 'A money app that puts the balance first and hides nothing in small print.' }, { slug: 'fintech-uygulamasi', name: 'Fintech uygulaması', kind: 'iOS ve Android', summary: 'Bakiyeyi öne koyan ve küçük puntoda hiçbir şey saklamayan bir para uygulaması.' }, { boardSlot: 3, art: 'fin', story: { team: ['design', 'code'], scope: { en: 'iOS · Android', tr: 'iOS · Android' } } }),
  p(7, 'app', 2025, { slug: 'nda-007', name: 'Private project', kind: 'Under NDA · hardware' }, { slug: 'nda-007', name: 'Gizli proje', kind: 'Gizlilik sözleşmeli · donanım' }, { status: 'nda' }),
  p(6, 'web', 2025, { slug: 'coffee-roaster', name: 'Coffee roaster', kind: 'Packaging and website', summary: 'Packaging and a website for a roaster who names every bag by number.' }, { slug: 'kahve-kavurucusu', name: 'Kahve kavurucusu', kind: 'Ambalaj ve web sitesi', summary: 'Her paketi numarayla adlandıran bir kavurucu için ambalaj ve web sitesi.' }, { boardSlot: 4, art: 'cof', story: { team: ['design', 'code'], scope: { en: 'Packaging · Website', tr: 'Ambalaj · Web sitesi' } } }),
  p(5, 'app', 2024, { slug: 'ferry-timetable', name: 'Ferry timetable', kind: 'iOS app', summary: 'Ferry times for Istanbul that still work on a pier without signal.' }, { slug: 'vapur-saatleri', name: 'Vapur saatleri', kind: 'iOS uygulaması', summary: 'İskelede çekmeyen telefonda bile çalışan İstanbul vapur saatleri.' }, { art: 'fer', story: { team: ['design', 'code'], scope: { en: 'iOS app', tr: 'iOS uygulaması' } } }),
  p(4, 'web', 2024, { slug: 'architecture-office', name: 'Architecture office', kind: 'Website', summary: 'A quiet website for an architecture office that lets the plans do the talking.' }, { slug: 'mimarlik-ofisi', name: 'Mimarlık ofisi', kind: 'Web sitesi', summary: 'Konuşmayı planlara bırakan bir mimarlık ofisi için sakin bir web sitesi.' }, { boardSlot: 5, art: 'arc', story: { team: ['design', 'code'], scope: { en: 'Website', tr: 'Web sitesi' } } }),
  p(3, 'motion', 2024, { slug: 'radio-idents', name: 'Radio idents', kind: 'Motion · 12 idents', summary: 'Twelve short idents for a radio station that never stops.' }, { slug: 'radyo-jenerikleri', name: 'Radyo jenerikleri', kind: 'Hareket · 12 jenerik', summary: 'Hiç susmayan bir radyo için on iki kısa jenerik.' }, { art: 'rad', story: { team: ['motion'], scope: { en: 'Motion · Sound', tr: 'Hareket · Ses' } } }),
  p(2, 'identity', 2024, { slug: 'bookshop', name: 'Bookshop', kind: 'Identity and online shop', summary: 'An identity and online shop for a bookshop that tells you to read slowly.' }, { slug: 'kitapci', name: 'Kitapçı', kind: 'Kimlik ve online mağaza', summary: 'Yavaş okumanı söyleyen bir kitapçı için kimlik ve online mağaza.' }, { boardSlot: 6, art: 'book', story: { team: ['design', 'code'], scope: { en: 'Identity · Online shop', tr: 'Kimlik · Online mağaza' } } }),
  p(1, 'web', 2024, { slug: 'lost-comma', name: 'Lost Comma', kind: 'This website', summary: 'This website. Three cursors and one lost comma.' }, { slug: 'lost-comma', name: 'Lost Comma', kind: 'Bu web sitesi', summary: 'Bu web sitesi. Üç imleç ve kayıp bir virgül.' }, { art: 'lc', story: { team: ['design', 'code', 'motion'], scope: { en: 'Website · Identity', tr: 'Web sitesi · Kimlik' } } }),
];

/** Each text gets its body from sample-notes.ts by slug. */
const n = (author: Crew, date: string, tags: string[], text: SampleNote['text']): SampleNote => ({
  author,
  date,
  tags,
  text: Object.fromEntries(Object.entries(text).map(([l, x]) => [l, { ...x, body: NOTE_BODIES[x.slug] ?? '' }])),
});

/** Some notes exist in one language only: the Notes page shows them with a language badge. */
export const SAMPLE_NOTES: SampleNote[] = [
  n('code', '2026-10-24', ['motion', 'code'], {
    en: { slug: 'how-our-cursors-move', title: 'How our cursors move', excerpt: 'A thirty line spring and why we slowed it down.' },
    tr: { slug: 'imleclerimiz-nasil-hareket-ediyor', title: 'İmleçlerimiz nasıl hareket ediyor', excerpt: 'Otuz satırlık bir yay ve onu neden yavaşlattık.' },
  }),
  n('design', '2026-10-10', ['type', 'performance'], {
    en: { slug: 'variable-fonts-on-a-budget', title: 'Variable fonts on a budget', excerpt: 'Anybody is 57 kb with both axes. Turkish letters cost 46 kb more and only when a page needs them.' },
  }),
  n('code', '2026-09-28', ['i18n', 'code'], {
    tr: { slug: 'turkce-buyuk-harf-sorunu', title: 'Türkçe büyük harf sorunu', excerpt: 'Neden METIN yazıyor ve lang niteliği neden önemli.' },
  }),
  n('code', '2026-09-12', ['tooling'], {
    en: { slug: 'a-boring-stack-on-purpose', title: 'A boring stack on purpose', excerpt: 'Fastify and Postgres and a build script we can read in one sitting.' },
    tr: { slug: 'bilerek-sikici-bir-altyapi', title: 'Bilerek sıkıcı bir altyapı', excerpt: 'Fastify ve Postgres ve tek oturuşta okunabilen bir derleme betiği.' },
  }),
  n('motion', '2026-08-30', ['motion'], {
    en: { slug: 'easing-curves-we-actually-use', title: 'Easing curves we actually use', excerpt: 'Two named curves do most of the work. Here they are and why.' },
  }),
  n('code', '2026-08-14', ['code', 'tooling'], {
    en: { slug: 'forms-from-a-schema', title: 'Forms from a schema', excerpt: 'One schema checks our case studies. The panel will draw its forms from it.' },
    tr: { slug: 'semadan-formlar', title: 'Şemadan formlar', excerpt: 'Vaka çalışmalarımızı tek bir şema denetliyor. Panel formlarını ondan çizecek.' },
  }),
  n('design', '2026-07-29', ['design'], {
    en: { slug: 'designing-at-real-widths', title: 'Designing at real widths', excerpt: 'Why our first mockup is a link and not a picture.' },
  }),
  n('code', '2026-07-11', ['tooling'], {
    en: { slug: 'share-images-without-a-design-tool', title: 'Share images without a design tool', excerpt: 'fontkit and sharp and one template for every page.' },
    tr: { slug: 'tasarim-araci-olmadan-paylasim-gorselleri', title: 'Tasarım aracı olmadan paylaşım görselleri', excerpt: 'fontkit ve sharp ve her sayfa için tek bir şablon.' },
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
