/**
 * Services copy per language: the overview (tools · combos · questions) and the four detail pages.
 * Long structured copy lives here like the homepage copy. Short UI labels stay in t().
 * No commas anywhere (checked by test/services.test.ts). Prices wait for Batuhan: [FİYAT] · [PRICE].
 */
import type { Lang } from '../i18n';

export const SERVICE_KEYS = ['web', 'app', 'identity', 'motion'] as const;
export type ServiceKey = (typeof SERVICE_KEYS)[number];

/** The address of each detail page. */
export const SERVICE_SLUGS: Record<ServiceKey, Record<Lang, string>> = {
  web: { tr: 'web-siteleri', en: 'websites' },
  app: { tr: 'uygulamalar', en: 'apps' },
  identity: { tr: 'kimlik', en: 'identity' },
  motion: { tr: 'hareket', en: 'motion' },
};

export interface Check {
  t: string;
  d: string;
  /** Ticked when the page opens. */
  on?: boolean;
}

export interface Tier {
  size: string;
  name: string;
  text: string;
  hot?: boolean;
}

export interface ServiceCopy {
  no: string;
  name: string;
  /** The tool name on the overview board (toolbar tooltip · combo pill). */
  tool: string;
  /** The inspector tag and the tile label: "Website tool". */
  tag: string;
  /** Link from the inspector to the detail page. */
  more: string;
  /** Button on the overview tile. */
  see: string;
  lede: string;
  /** The bold sentence at the end of the lede: what to do with the hero. */
  try: string;
  desc: string;
  dl: string[];
  time: string;
  hint: string;
  size: string;
  getText: string;
  checks: Check[];
  /** Verdicts and lengths for few · some · many ticks. */
  verdict: [string, string, string];
  weeks: [string, string, string];
  hood: { h: string; p: string; chips: string[]; budget: [string, string, string][] };
  tiers: [Tier, Tier, Tier];
  related: string;
}

export interface OverviewCopy {
  title: string;
  lede: string;
  try: string;
  after: string;
  toolsH: string;
  toolsP: string;
  combos: { a: ServiceKey; b: ServiceKey; is: string }[];
  faq: { q: string; a: string }[];
}

const en: { overview: OverviewCopy; services: Record<ServiceKey, ServiceCopy> } = {
  overview: {
    title: 'Pick a tool.',
    lede: 'We make four kinds of things and each one has its own tool.',
    try: 'Pick one and draw on the board.',
    after: 'That is roughly what we do all day.',
    toolsH: 'Four tools.\nOne studio.',
    toolsP: 'Every project uses at least two of these. The same people hold every tool so nothing gets lost between them.',
    combos: [
      { a: 'identity', b: 'web', is: 'a launch.' },
      { a: 'web', b: 'app', is: 'one login everywhere.' },
      { a: 'identity', b: 'motion', is: 'a brand that moves.' },
      { a: 'app', b: 'motion', is: 'an app people show their friends.' },
    ],
    faq: [
      { q: 'Can you take over a site someone else built?', a: 'Yes. We start with a one week audit and tell you honestly if a rebuild is cheaper than a repair.' },
      { q: 'Who owns the code and the files?', a: 'You do. All of it from the first commit. No lock in and no licence fees to us.' },
      { q: 'Do you work with other agencies?', a: 'Often. We are happy as the design team or the build team or both.' },
      { q: 'Can we start small?', a: 'Yes. A two week sprint is a good way to find out if we work well together.' },
      { q: 'What do you need from us?', a: 'One person who can decide. An hour a week for the demo. Honest feedback even when it hurts a little.' },
      { q: 'What happens after launch?', a: 'Most clients keep us on a small monthly plan for care and new features. Some just call when they need us. Both are fine.' },
    ],
  },
  services: {
    web: {
      no: '01',
      name: 'Websites',
      tool: 'Website',
      tag: 'Website tool',
      more: 'Everything about websites',
      see: 'See websites',
      lede: 'Fast and accessible and easy for your team to edit. And right at every width.',
      try: 'Grab the handle and see for yourself.',
      desc: 'Marketing sites and web apps that load fast and feel alive. Built so your team can edit them after we leave.',
      dl: ['Strategy', 'Design', 'Development', 'CMS', 'Hosting'],
      time: '6 to 12 weeks',
      hint: 'Website tool · drag out a frame',
      size: '1440 × 900',
      getText: 'Every website we make can include all of these. Most need eight or nine. Tick the ones that matter and we will tell you what kind of project it sounds like.',
      checks: [
        { t: 'Strategy workshop', d: 'Half a day with your team. We leave with goals and a sitemap.', on: true },
        { t: 'Content plan', d: 'What every page says and who writes it. We can write it too.' },
        { t: 'Design system', d: 'Type and colour and components. Designed once and used everywhere.', on: true },
        { t: 'Every page designed', d: 'In the browser at real widths. No surprises at launch.', on: true },
        { t: 'Built by hand', d: 'TypeScript on the server. No page builders and no plugins to update.', on: true },
        { t: 'An editor for your team', d: 'Forms generated from your content. Roles and two factor login.', on: true },
        { t: 'Two languages or more', d: 'Turkish and English from day one. Real translations not a plugin.' },
        { t: 'Search and social', d: 'Clean addresses and share cards for every page in every language.' },
        { t: 'Fast by budget', d: 'A weight limit for every page. The build fails if we pass it.', on: true },
        { t: 'Accessible', d: 'Keyboard and screen reader tested. WCAG AA as a minimum.', on: true },
        { t: 'Hosting and backups', d: 'On a server you own or on ours. Watched day and night.' },
        { t: 'Training and care', d: 'A session with your team at launch. A care plan after.' },
      ],
      verdict: ['sounds like a landing page', 'sounds like a marketing site', 'sounds like a full platform'],
      weeks: ['About 3 to 4 weeks', 'About 8 to 12 weeks', 'About 12 to 16 weeks'],
      hood: {
        h: 'Boring stack.\nOn purpose.',
        p: 'We build with tools that will still be here in ten years. Every site ships with an editor that is generated from your content so it never drifts out of date.',
        chips: ['Node 22', 'TypeScript', 'Fastify', 'PostgreSQL', 'Drizzle', 'sharp', 'Docker', 'Caddy', 'Playwright', 'axe'],
        budget: [
          ['Page weight', '250', 'kb max'],
          ['JavaScript', '90', 'kb max'],
          ['Largest paint', '1.5', 's max'],
          ['Accessibility', 'AA', 'or better'],
        ],
      },
      tiers: [
        { size: 'Small · 3 to 4 weeks', name: 'Landing page', text: 'One page that does one job very well.' },
        { size: 'Medium · 8 to 12 weeks', name: 'Marketing site', text: 'Five to fifteen pages and an editor your team will actually use.', hot: true },
        { size: 'Large · 12 weeks and up', name: 'Web app', text: 'Accounts and dashboards and real data behind them.' },
      ],
      related: 'Websites we made',
    },
    app: {
      no: '02',
      name: 'Apps',
      tool: 'App',
      tag: 'App tool',
      more: 'Everything about apps',
      see: 'See apps',
      lede: 'Native on iOS and Android and quick on a five year old phone. Designed for the hand that holds it.',
      try: 'Drag the thumb and see what it can reach.',
      desc: 'iOS and Android apps with a native feel and real performance. Interfaces people open every day.',
      dl: ['Product design', 'Prototypes', 'iOS', 'Android', 'Launch'],
      time: '10 to 20 weeks',
      hint: 'App tool · click to place a phone',
      size: '390 × 844',
      getText: 'Every app we make can include all of these. A first version needs about seven. Tick the ones that matter and we will tell you what kind of project it sounds like.',
      checks: [
        { t: 'Product workshop', d: 'Half a day with your team. We leave with one sentence the app has to live up to.', on: true },
        { t: 'Research with real people', d: 'Five conversations before a single pixel. Cheaper than a wrong feature.' },
        { t: 'Flows and wireframes', d: 'Every path through the app on paper first. The boring part that saves months.', on: true },
        { t: 'One design system', d: 'One set of parts that feels at home on iOS and on Android.', on: true },
        { t: 'Clickable prototype', d: 'Tested in real hands on real phones before we write the code.', on: true },
        { t: 'Native build', d: 'SwiftUI and Jetpack Compose. No web page pretending to be an app.', on: true },
        { t: 'Works offline', d: 'On the ferry and in the metro. It syncs when the signal comes back.' },
        { t: 'Notifications that earn it', d: 'Few and useful. People can tune them from the first day.' },
        { t: 'Accessible', d: 'Large text and VoiceOver and TalkBack tested on every screen.', on: true },
        { t: 'Honest analytics', d: 'What we need to make the app better and nothing more.' },
        { t: 'Store release', d: 'Screenshots and listings and the review process. We handle all of it.', on: true },
        { t: 'Care and updates', d: 'A new iOS and Android every year. We keep the app working with them.' },
      ],
      verdict: ['sounds like a prototype', 'sounds like a first version', 'sounds like a full product'],
      weeks: ['About 4 to 6 weeks', 'About 10 to 14 weeks', 'About 16 weeks and up'],
      hood: {
        h: 'Native on both.\nOne system.',
        p: 'SwiftUI on iPhone and Jetpack Compose on Android with one design system and one API behind them. A new version ships every two weeks on the same train.',
        chips: ['Swift', 'SwiftUI', 'Kotlin', 'Jetpack Compose', 'TypeScript API', 'PostgreSQL', 'Fastlane', 'XCTest', 'Espresso'],
        budget: [
          ['Cold start', '1.0', 's max'],
          ['Scrolling', '120', 'fps where the screen can'],
          ['Crash free', '99.8', '% of people'],
          ['Download', '40', 'MB max'],
        ],
      },
      tiers: [
        { size: 'Small · 4 to 6 weeks', name: 'Prototype', text: 'A clickable app tested with real people before a line of code.' },
        { size: 'Medium · 10 to 14 weeks', name: 'First version', text: 'One platform or both. The core of the app done properly and in the stores.', hot: true },
        { size: 'Large · 16 weeks and up', name: 'Full product', text: 'Accounts and payments and an API behind it. A team that stays on.' },
      ],
      related: 'Apps we made',
    },
    identity: {
      no: '03',
      name: 'Identity',
      tool: 'Identity pen',
      tag: 'Pen tool',
      more: 'Everything about identity',
      see: 'See identity',
      lede: 'Names and marks and type and voice. Systems that hold up from a favicon to a billboard.',
      try: 'Drag the scale and watch the mark change its shape.',
      desc: 'Names and marks and type and voice. Systems that hold up from a favicon to a billboard.',
      dl: ['Naming', 'Logo', 'Type', 'Colour', 'Guidelines'],
      time: '4 to 8 weeks',
      hint: 'Pen tool · draw a mark',
      size: '1080 × 1080',
      getText: 'Every identity we make can include all of these. A new one needs about seven. Tick the ones that matter and we will tell you what kind of project it sounds like.',
      checks: [
        { t: 'Positioning workshop', d: 'Who you are for and what you will never be. Half a day.', on: true },
        { t: 'Naming', d: 'Names that are free to use and easy to say in Turkish and English.' },
        { t: 'Logo and mark', d: 'One idea drawn many times until it is simple.', on: true },
        { t: 'A logo for every size', d: 'Versions that stay clear from sixteen pixels to six metres.', on: true },
        { t: 'Type system', d: 'One or two families with the licences sorted.', on: true },
        { t: 'Colour system', d: 'Pairs tested for contrast. Tokens for your developers.', on: true },
        { t: 'Voice and tone', d: 'How you sound when you write. With examples for real messages.' },
        { t: 'Icon set', d: 'Drawn on the same grid as the logo.' },
        { t: 'Motion principles', d: 'How the brand moves. Handed over as curves and examples.' },
        { t: 'Templates', d: 'Social posts and slides and documents your team can edit.' },
        { t: 'Guidelines site', d: 'Rules and downloads in one place. Always up to date.', on: true },
        { t: 'Print and signage', d: 'Packaging and shop fronts and the bag you carry home.' },
      ],
      verdict: ['sounds like a refresh', 'sounds like a new identity', 'sounds like a full brand system'],
      weeks: ['About 3 to 5 weeks', 'About 6 to 10 weeks', 'About 10 weeks and up'],
      hood: {
        h: 'Rules that\nlive online.',
        p: 'Every identity ships with a small website of rules and downloads. Colours arrive as tokens your developers can use the same afternoon. Every pair is tested for contrast before you see it.',
        chips: ['Glyphs', 'Variable fonts', 'SVG', 'Design tokens', 'WCAG contrast', 'Print profiles', 'Guidelines site'],
        budget: [
          ['Logo files', '48', 'in every format'],
          ['Colour pairs', 'AA', 'tested or better'],
          ['Type', '2', 'families licensed'],
          ['Templates', '12', 'ready to edit'],
        ],
      },
      tiers: [
        { size: 'Small · 3 to 5 weeks', name: 'Refresh', text: 'Tidy the mark and the colours and give them rules.' },
        { size: 'Medium · 6 to 10 weeks', name: 'New identity', text: 'A mark and type and colour and voice. With a guidelines site.', hot: true },
        { size: 'Large · 10 weeks and up', name: 'Brand system', text: 'Everything above plus icons and motion and templates for the whole team.' },
      ],
      related: 'Identities we made',
    },
    motion: {
      no: '04',
      name: 'Motion',
      tool: 'Motion path',
      tag: 'Path tool',
      more: 'Everything about motion',
      see: 'See motion',
      lede: 'Interface motion and brand films. The small details that make people smile without knowing why.',
      try: 'Bend the curve and feel the difference.',
      desc: 'Interface motion and brand films. The small details that make people smile without knowing why.',
      dl: ['UI motion', 'Brand films', 'Micro interactions', 'Rive'],
      time: '2 to 8 weeks',
      hint: 'Path tool · draw a path and watch it move',
      size: '1920 × 820',
      getText: 'Motion can be one button that feels right or a film that opens your launch. Tick the ones that matter and we will tell you what kind of project it sounds like.',
      checks: [
        { t: 'Motion principles', d: 'How your product moves and why. Four curves and three speeds.', on: true },
        { t: 'Micro interactions', d: 'Buttons and toggles and the small things people touch every day.', on: true },
        { t: 'Page transitions', d: 'Moving between screens without losing your place.', on: true },
        { t: 'Loading and empty states', d: 'Waiting that feels shorter and screens that are never blank.' },
        { t: 'Logo animation', d: 'Your mark in two seconds. For openings and endings.' },
        { t: 'Brand film', d: 'Thirty to sixty seconds that explain what you do.' },
        { t: 'Social loops', d: 'Short loops that work without sound.' },
        { t: 'Storyboards', d: 'Every frame on paper before anything moves.' },
        { t: 'Sound', d: 'Music and sound design that fit the brand.' },
        { t: 'Reduced motion versions', d: 'Calm versions for people who turn motion down.', on: true },
        { t: 'Handoff to developers', d: 'Curves and timings as code. Rive or Lottie files when they help.', on: true },
        { t: 'Every format', d: 'Web and social and stage and the screen in your shop.' },
      ],
      verdict: ['sounds like micro interactions', 'sounds like a brand film', 'sounds like a motion system'],
      weeks: ['About 2 to 4 weeks', 'About 4 to 8 weeks', 'About 8 weeks and up'],
      hood: {
        h: 'Made to ship.\nNot just to show.',
        p: 'Motion we design goes into products and onto screens. Every curve arrives as code. Every film comes in every format and in a calm version for people who turn motion down.',
        chips: ['After Effects', 'Rive', 'Lottie', 'CSS', 'Web Animations', 'Blender', 'DaVinci Resolve'],
        budget: [
          ['Interface motion', '150–400', 'ms'],
          ['Frame rate', '60', 'fps or more'],
          ['Loops', '1', 'MB max as WebM'],
          ['Reduced motion', 'Always', 'shipped'],
        ],
      },
      tiers: [
        { size: 'Small · 2 to 4 weeks', name: 'Micro interactions', text: 'The moments in your product that people touch every day.' },
        { size: 'Medium · 4 to 8 weeks', name: 'Brand film', text: 'Thirty to sixty seconds that explain what you do. Cut for every screen.', hot: true },
        { size: 'Large · 8 weeks and up', name: 'Motion system', text: 'Principles and a library your designers and developers share.' },
      ],
      related: 'Motion we made',
    },
  },
};

const tr: typeof en = {
  overview: {
    title: 'Bir araç seç.',
    lede: 'Dört tür şey yapıyoruz ve her birinin kendi aracı var.',
    try: 'Birini seç ve panoya çiz.',
    after: 'Aşağı yukarı bütün gün yaptığımız şey bu.',
    toolsH: 'Dört araç.\nTek stüdyo.',
    toolsP: 'Her proje bunlardan en az ikisini kullanır. Her aracı aynı insanlar tutar ki aralarda hiçbir şey kaybolmasın.',
    combos: [
      { a: 'identity', b: 'web', is: 'bir lansman.' },
      { a: 'web', b: 'app', is: 'her yerde tek giriş.' },
      { a: 'identity', b: 'motion', is: 'hareket eden bir marka.' },
      { a: 'app', b: 'motion', is: 'arkadaşlarına gösterilen bir uygulama.' },
    ],
    faq: [
      { q: 'Başkasının yaptığı bir siteyi devralır mısınız?', a: 'Evet. Bir haftalık bir incelemeyle başlıyoruz ve yeniden yapmak onarmaktan ucuzsa bunu dürüstçe söylüyoruz.' },
      { q: 'Kodun ve dosyaların sahibi kim?', a: 'Sizsiniz. İlk commit’ten itibaren hepsi. Bize bağımlılık yok ve lisans ücreti yok.' },
      { q: 'Başka ajanslarla çalışıyor musunuz?', a: 'Sık sık. Tasarım ekibi de olabiliriz yazılım ekibi de ya da ikisi birden.' },
      { q: 'Küçük başlayabilir miyiz?', a: 'Evet. İki haftalık bir sprint birlikte iyi çalışıp çalışmadığımızı anlamanın iyi bir yolu.' },
      { q: 'Sizden ne istiyoruz?', a: 'Karar verebilen bir kişi. Demo için haftada bir saat. Biraz acıtsa bile dürüst geri bildirim.' },
      { q: 'Yayından sonra ne oluyor?', a: 'Çoğu müşteri bakım ve yeni özellikler için bizi küçük bir aylık planla tutuyor. Bazıları sadece ihtiyaç olunca arıyor. İkisi de olur.' },
    ],
  },
  services: {
    web: {
      no: '01',
      name: 'Web siteleri',
      tool: 'Web sitesi',
      tag: 'Web sitesi aracı',
      more: 'Web siteleri hakkında her şey',
      see: 'Web sitelerini gör',
      lede: 'Hızlı ve erişilebilir ve ekibinin kolayca düzenleyebileceği. Üstelik her genişlikte doğru.',
      try: 'Tutamacı tut ve kendin gör.',
      desc: 'Hızlı açılan ve canlı hissettiren tanıtım siteleri ve web uygulamaları. Biz gittikten sonra ekibin düzenleyebilsin diye kuruluyor.',
      dl: ['Strateji', 'Tasarım', 'Geliştirme', 'CMS', 'Barındırma'],
      time: '6 ile 12 hafta',
      hint: 'Web sitesi aracı · bir çerçeve sürükle',
      size: '1440 × 900',
      getText: 'Yaptığımız her web sitesi bunların hepsini içerebilir. Çoğuna sekiz dokuzu yeter. Önemli olanları işaretle ve sana nasıl bir proje olduğunu söyleyelim.',
      checks: [
        { t: 'Strateji atölyesi', d: 'Ekibinle yarım gün. Hedefler ve bir site haritasıyla çıkıyoruz.', on: true },
        { t: 'İçerik planı', d: 'Her sayfanın ne söylediği ve kimin yazdığı. İstersen biz de yazarız.' },
        { t: 'Tasarım sistemi', d: 'Yazı ve renk ve bileşenler. Bir kez tasarlanır ve her yerde kullanılır.', on: true },
        { t: 'Her sayfa tasarlanmış', d: 'Tarayıcıda ve gerçek genişliklerde. Yayında sürpriz yok.', on: true },
        { t: 'Elle kodlanmış', d: 'Sunucuda TypeScript. Sayfa oluşturucu yok ve güncellenecek eklenti yok.', on: true },
        { t: 'Ekibin için bir editör', d: 'İçeriğinden üretilen formlar. Roller ve iki adımlı giriş.', on: true },
        { t: 'İki dil ya da fazlası', d: 'İlk günden Türkçe ve İngilizce. Eklenti değil gerçek çeviri.' },
        { t: 'Arama ve sosyal medya', d: 'Her dilde her sayfa için temiz adresler ve paylaşım kartları.' },
        { t: 'Bütçeyle hızlı', d: 'Her sayfa için bir ağırlık sınırı. Aşarsak derleme durur.', on: true },
        { t: 'Erişilebilir', d: 'Klavye ve ekran okuyucuyla test edilir. En az WCAG AA.', on: true },
        { t: 'Barındırma ve yedek', d: 'Senin sunucunda ya da bizimkinde. Gece gündüz izlenir.' },
        { t: 'Eğitim ve bakım', d: 'Yayında ekibinle bir oturum. Sonrasında bir bakım planı.' },
      ],
      verdict: ['tek sayfalık bir siteye benziyor', 'bir tanıtım sitesine benziyor', 'tam bir platforma benziyor'],
      weeks: ['Yaklaşık 3 ile 4 hafta', 'Yaklaşık 8 ile 12 hafta', 'Yaklaşık 12 ile 16 hafta'],
      hood: {
        h: 'Sıkıcı altyapı.\nBilerek.',
        p: 'On yıl sonra da yerinde olacak araçlarla kuruyoruz. Her site içeriğinden üretilen bir editörle gelir ve bu yüzden hiç eskimez.',
        chips: ['Node 22', 'TypeScript', 'Fastify', 'PostgreSQL', 'Drizzle', 'sharp', 'Docker', 'Caddy', 'Playwright', 'axe'],
        budget: [
          ['Sayfa ağırlığı', '250', 'kb en fazla'],
          ['JavaScript', '90', 'kb en fazla'],
          ['En büyük boyama', '1.5', 'sn en fazla'],
          ['Erişilebilirlik', 'AA', 'ya da daha iyisi'],
        ],
      },
      tiers: [
        { size: 'Küçük · 3 ile 4 hafta', name: 'Tek sayfa', text: 'Tek bir işi çok iyi yapan bir sayfa.' },
        { size: 'Orta · 8 ile 12 hafta', name: 'Tanıtım sitesi', text: 'Beş ile on beş sayfa ve ekibinin gerçekten kullanacağı bir editör.', hot: true },
        { size: 'Büyük · 12 hafta ve üstü', name: 'Web uygulaması', text: 'Hesaplar ve paneller ve arkasında gerçek veri.' },
      ],
      related: 'Yaptığımız web siteleri',
    },
    app: {
      no: '02',
      name: 'Uygulamalar',
      tool: 'Uygulama',
      tag: 'Uygulama aracı',
      more: 'Uygulamalar hakkında her şey',
      see: 'Uygulamaları gör',
      lede: 'iOS ve Android’de doğal ve beş yıllık bir telefonda bile hızlı. Onu tutan el için tasarlanmış.',
      try: 'Başparmağı sürükle ve nereye uzandığını gör.',
      desc: 'Doğal hissettiren ve gerçekten hızlı iOS ve Android uygulamaları. İnsanların her gün açtığı arayüzler.',
      dl: ['Ürün tasarımı', 'Prototip', 'iOS', 'Android', 'Yayın'],
      time: '10 ile 20 hafta',
      hint: 'Uygulama aracı · telefon koymak için tıkla',
      size: '390 × 844',
      getText: 'Yaptığımız her uygulama bunların hepsini içerebilir. İlk sürüme yaklaşık yedisi yeter. Önemli olanları işaretle ve sana nasıl bir proje olduğunu söyleyelim.',
      checks: [
        { t: 'Ürün atölyesi', d: 'Ekibinle yarım gün. Uygulamanın hakkını vermesi gereken tek bir cümleyle çıkıyoruz.', on: true },
        { t: 'Gerçek insanlarla araştırma', d: 'Tek bir pikselden önce beş görüşme. Yanlış bir özellikten ucuz.' },
        { t: 'Akışlar ve tel çerçeveler', d: 'Uygulamadaki her yol önce kâğıtta. Aylar kazandıran sıkıcı kısım.', on: true },
        { t: 'Tek tasarım sistemi', d: 'Hem iOS’ta hem Android’de evinde hisseden tek bir parça seti.', on: true },
        { t: 'Tıklanabilir prototip', d: 'Kodu yazmadan önce gerçek telefonlarda gerçek ellerde test edilir.', on: true },
        { t: 'Doğal kodlama', d: 'SwiftUI ve Jetpack Compose. Uygulama taklidi yapan bir web sayfası değil.', on: true },
        { t: 'İnternetsiz çalışır', d: 'Vapurda ve metroda. Çekmeye başlayınca eşitlenir.' },
        { t: 'Hak eden bildirimler', d: 'Az ve işe yarar. İnsanlar ilk günden ayarlayabilir.' },
        { t: 'Erişilebilir', d: 'Büyük yazı ve VoiceOver ve TalkBack her ekranda test edilir.', on: true },
        { t: 'Dürüst analitik', d: 'Uygulamayı iyileştirmek için gereken ve fazlası değil.' },
        { t: 'Mağaza yayını', d: 'Ekran görüntüleri ve sayfalar ve inceleme süreci. Hepsini biz hallederiz.', on: true },
        { t: 'Bakım ve güncelleme', d: 'Her yıl yeni bir iOS ve Android. Uygulamayı onlarla çalışır tutarız.' },
      ],
      verdict: ['bir prototipe benziyor', 'bir ilk sürüme benziyor', 'tam bir ürüne benziyor'],
      weeks: ['Yaklaşık 4 ile 6 hafta', 'Yaklaşık 10 ile 14 hafta', 'Yaklaşık 16 hafta ve üstü'],
      hood: {
        h: 'İkisinde de doğal.\nTek sistem.',
        p: 'iPhone’da SwiftUI ve Android’de Jetpack Compose. Arkalarında tek bir tasarım sistemi ve tek bir API. Her iki haftada bir yeni sürüm aynı trenle çıkar.',
        chips: ['Swift', 'SwiftUI', 'Kotlin', 'Jetpack Compose', 'TypeScript API', 'PostgreSQL', 'Fastlane', 'XCTest', 'Espresso'],
        budget: [
          ['Soğuk açılış', '1.0', 'sn en fazla'],
          ['Kaydırma', '120', 'fps ekran izin verdikçe'],
          ['Çökmesiz', '99.8', '% kullanıcı'],
          ['İndirme', '40', 'MB en fazla'],
        ],
      },
      tiers: [
        { size: 'Küçük · 4 ile 6 hafta', name: 'Prototip', text: 'Tek satır koddan önce gerçek insanlarla test edilen tıklanabilir bir uygulama.' },
        { size: 'Orta · 10 ile 14 hafta', name: 'İlk sürüm', text: 'Bir platform ya da ikisi. Uygulamanın özü düzgünce yapılmış ve mağazalarda.', hot: true },
        { size: 'Büyük · 16 hafta ve üstü', name: 'Tam ürün', text: 'Hesaplar ve ödemeler ve arkasında bir API. Yanında kalan bir ekip.' },
      ],
      related: 'Yaptığımız uygulamalar',
    },
    identity: {
      no: '03',
      name: 'Kimlik',
      tool: 'Kimlik kalemi',
      tag: 'Kalem aracı',
      more: 'Kimlik hakkında her şey',
      see: 'Kimliği gör',
      lede: 'İsimler ve işaretler ve yazı ve ses tonu. Favicon’dan reklam panosuna kadar ayakta duran sistemler.',
      try: 'Ölçeği sürükle ve işaretin nasıl şekil değiştirdiğini izle.',
      desc: 'İsimler ve işaretler ve yazı ve ses tonu. Favicon’dan reklam panosuna kadar ayakta duran sistemler.',
      dl: ['İsim', 'Logo', 'Yazı', 'Renk', 'Kılavuz'],
      time: '4 ile 8 hafta',
      hint: 'Kalem · bir işaret çiz',
      size: '1080 × 1080',
      getText: 'Yaptığımız her kimlik bunların hepsini içerebilir. Yeni bir kimliğe yaklaşık yedisi yeter. Önemli olanları işaretle ve sana nasıl bir proje olduğunu söyleyelim.',
      checks: [
        { t: 'Konumlandırma atölyesi', d: 'Kimin için olduğun ve asla ne olmayacağın. Yarım gün.', on: true },
        { t: 'İsim', d: 'Kullanması serbest ve Türkçede de İngilizcede de kolay söylenen isimler.' },
        { t: 'Logo ve işaret', d: 'Sadeleşene kadar defalarca çizilen tek bir fikir.', on: true },
        { t: 'Her boy için bir logo', d: 'On altı pikselden altı metreye kadar net kalan sürümler.', on: true },
        { t: 'Yazı sistemi', d: 'Lisansları hallolmuş bir ya da iki aile.', on: true },
        { t: 'Renk sistemi', d: 'Kontrastı test edilmiş çiftler. Yazılımcıların için tokenlar.', on: true },
        { t: 'Ses tonu', d: 'Yazarken nasıl konuştuğun. Gerçek mesajlardan örneklerle.' },
        { t: 'İkon seti', d: 'Logoyla aynı ızgarada çizilir.' },
        { t: 'Hareket ilkeleri', d: 'Markanın nasıl hareket ettiği. Eğriler ve örneklerle teslim edilir.' },
        { t: 'Şablonlar', d: 'Ekibinin düzenleyebileceği sosyal medya gönderileri ve sunumlar ve belgeler.' },
        { t: 'Kılavuz sitesi', d: 'Kurallar ve indirmeler tek yerde. Her zaman güncel.', on: true },
        { t: 'Baskı ve tabela', d: 'Ambalaj ve vitrin ve eve götürdüğün poşet.' },
      ],
      verdict: ['bir yenilemeye benziyor', 'yeni bir kimliğe benziyor', 'tam bir marka sistemine benziyor'],
      weeks: ['Yaklaşık 3 ile 5 hafta', 'Yaklaşık 6 ile 10 hafta', 'Yaklaşık 10 hafta ve üstü'],
      hood: {
        h: 'Çevrim içi\nyaşayan kurallar.',
        p: 'Her kimlik kurallar ve indirmelerden oluşan küçük bir web sitesiyle gelir. Renkler yazılımcılarının aynı öğleden sonra kullanabileceği tokenlar olarak gelir. Her çift sen görmeden önce kontrast testinden geçer.',
        chips: ['Glyphs', 'Değişken fontlar', 'SVG', 'Tasarım tokenları', 'WCAG kontrastı', 'Baskı profilleri', 'Kılavuz sitesi'],
        budget: [
          ['Logo dosyası', '48', 'her formatta'],
          ['Renk çifti', 'AA', 'test edilmiş ya da daha iyi'],
          ['Yazı', '2', 'lisanslı aile'],
          ['Şablon', '12', 'düzenlemeye hazır'],
        ],
      },
      tiers: [
        { size: 'Küçük · 3 ile 5 hafta', name: 'Yenileme', text: 'İşareti ve renkleri toparlayıp onlara kurallar vermek.' },
        { size: 'Orta · 6 ile 10 hafta', name: 'Yeni kimlik', text: 'Bir işaret ve yazı ve renk ve ses tonu. Bir kılavuz sitesiyle.', hot: true },
        { size: 'Büyük · 10 hafta ve üstü', name: 'Marka sistemi', text: 'Yukarıdakilerin hepsi ve bütün ekip için ikonlar ve hareket ve şablonlar.' },
      ],
      related: 'Yaptığımız kimlikler',
    },
    motion: {
      no: '04',
      name: 'Hareket',
      tool: 'Hareket yolu',
      tag: 'Yol aracı',
      more: 'Hareket hakkında her şey',
      see: 'Hareketi gör',
      lede: 'Arayüz hareketleri ve marka filmleri. İnsanları nedenini bilmeden gülümseten küçük detaylar.',
      try: 'Eğriyi bük ve farkı hisset.',
      desc: 'Arayüz hareketleri ve marka filmleri. İnsanları nedenini bilmeden gülümseten küçük detaylar.',
      dl: ['Arayüz hareketi', 'Marka filmi', 'Mikro etkileşim', 'Rive'],
      time: '2 ile 8 hafta',
      hint: 'Yol aracı · bir yol çiz ve hareketini izle',
      size: '1920 × 820',
      getText: 'Hareket doğru hissettiren tek bir düğme de olabilir lansmanını açan bir film de. Önemli olanları işaretle ve sana nasıl bir proje olduğunu söyleyelim.',
      checks: [
        { t: 'Hareket ilkeleri', d: 'Ürününün nasıl ve neden hareket ettiği. Dört eğri ve üç hız.', on: true },
        { t: 'Mikro etkileşimler', d: 'Düğmeler ve anahtarlar ve insanların her gün dokunduğu küçük şeyler.', on: true },
        { t: 'Sayfa geçişleri', d: 'Ekranlar arasında yerini kaybetmeden geçmek.', on: true },
        { t: 'Yükleme ve boş ekranlar', d: 'Daha kısa hissettiren beklemeler ve hiç boş kalmayan ekranlar.' },
        { t: 'Logo animasyonu', d: 'İşaretin iki saniyede. Açılışlar ve kapanışlar için.' },
        { t: 'Marka filmi', d: 'Ne yaptığını anlatan otuz ile altmış saniye.' },
        { t: 'Sosyal medya döngüleri', d: 'Sessiz de çalışan kısa döngüler.' },
        { t: 'Hikâye taslakları', d: 'Hiçbir şey kıpırdamadan önce her kare kâğıtta.' },
        { t: 'Ses', d: 'Markaya yakışan müzik ve ses tasarımı.' },
        { t: 'Azaltılmış hareket sürümleri', d: 'Hareketi kısan insanlar için sakin sürümler.', on: true },
        { t: 'Yazılımcılara teslim', d: 'Eğriler ve süreler kod olarak. İşe yarıyorsa Rive ya da Lottie dosyaları.', on: true },
        { t: 'Her format', d: 'Web ve sosyal medya ve sahne ve dükkânındaki ekran.' },
      ],
      verdict: ['mikro etkileşimlere benziyor', 'bir marka filmine benziyor', 'bir hareket sistemine benziyor'],
      weeks: ['Yaklaşık 2 ile 4 hafta', 'Yaklaşık 4 ile 8 hafta', 'Yaklaşık 8 hafta ve üstü'],
      hood: {
        h: 'Yayına çıksın diye.\nSadece göstermek için değil.',
        p: 'Tasarladığımız hareket ürünlere ve ekranlara girer. Her eğri kod olarak gelir. Her film her formatta ve hareketi kısan insanlar için sakin bir sürümle gelir.',
        chips: ['After Effects', 'Rive', 'Lottie', 'CSS', 'Web Animations', 'Blender', 'DaVinci Resolve'],
        budget: [
          ['Arayüz hareketi', '150–400', 'ms'],
          ['Kare hızı', '60', 'fps ya da fazlası'],
          ['Döngüler', '1', 'MB en fazla WebM'],
          ['Azaltılmış hareket', 'Her zaman', 'teslim edilir'],
        ],
      },
      tiers: [
        { size: 'Küçük · 2 ile 4 hafta', name: 'Mikro etkileşimler', text: 'Ürününde insanların her gün dokunduğu anlar.' },
        { size: 'Orta · 4 ile 8 hafta', name: 'Marka filmi', text: 'Ne yaptığını anlatan otuz ile altmış saniye. Her ekran için kesilmiş.', hot: true },
        { size: 'Büyük · 8 hafta ve üstü', name: 'Hareket sistemi', text: 'Tasarımcılarının ve yazılımcılarının paylaştığı ilkeler ve bir kütüphane.' },
      ],
      related: 'Yaptığımız hareket işleri',
    },
  },
};

export const SERVICES: Record<Lang, typeof en> = { tr, en };

export function serviceBySlug(lang: Lang, slug: string): ServiceKey | null {
  return SERVICE_KEYS.find((k) => SERVICE_SLUGS[k][lang] === slug) ?? null;
}

/* ---------------- hero and mock copy (sentences · short labels stay in t()) ---------------- */

export interface HeroCopy {
  /** Apps: what each zone means · the release train stages. */
  reach: Record<'easy' | 'ok' | 'hard', [name: string, tip: string]>;
  train: { t: string; d: string; m: string }[];
  /** Identity: one mark at six sizes. v is the version of the mark the scene uses. */
  sizes: { n: string; sz: string; real: string; ver: string; vno: string; rule: string; cap: string; v: 1 | 2 | 3 }[];
  palette: string[];
  preview: [string, string];
  /** Motion: our four curves. */
  curves: { n: string; d: string }[];
}

const HERO_EN: HeroCopy = {
  reach: {
    easy: ['Easy reach', 'Where the thumb rests. The main action lives here.'],
    ok: ['A stretch', 'Fine for things people do now and then.'],
    hard: ['Hard to reach', 'Needs the other hand. Keep rare things up here.'],
  },
  train: [
    { t: 'Build', d: 'Both platforms from one commit', m: '318' },
    { t: 'Tests', d: 'Unit and screen tests on twelve phones', m: '214 passed' },
    { t: 'Beta', d: 'TestFlight and the Play internal track', m: '40 people' },
    { t: 'Store review', d: 'Apple and Google take a look', m: '~1 day' },
    { t: 'Rollout', d: 'A few people first and then everyone', m: '' },
  ],
  sizes: [
    { n: 'Favicon', sz: '16 px', real: '4 mm on a screen', ver: 'Monogram', vno: 'v1 · one score', rule: 'At sixteen pixels two scores blur into one. A single thick score still reads as bread.', cap: 'Browser tab · 16 px', v: 1 },
    { n: 'App icon', sz: '60 px', real: '1 cm on a phone', ver: 'Monogram', vno: 'v2 · two scores', rule: 'On a home screen the loaf sits on oven yellow so a thumb finds it in a second.', cap: 'Home screen · 60 px', v: 2 },
    { n: 'Card', sz: '85 mm', real: 'in your hand', ver: 'Lockup', vno: 'v3 · mark and name', rule: 'Mark and name together. The clear space around them is the height of one score.', cap: 'Business card · 85 × 55 mm', v: 3 },
    { n: 'Social', sz: '1080 px', real: 'in a feed', ver: 'Lockup and line', vno: 'v3 · with a tagline', rule: 'The loaf leaves the frame on purpose. Cropped bread is still bread.', cap: 'Social post · 1080 × 1080', v: 3 },
    { n: 'Poster', sz: '594 mm', real: 'A1 on a wall', ver: 'Full · with pattern', vno: 'v3 · scores as a pattern', rule: 'At poster size the scores turn into a pattern. Nothing new to learn.', cap: 'Poster · A1', v: 3 },
    { n: 'Billboard', sz: '6 m', real: 'from across the street', ver: 'Wordmark', vno: 'v4 · the name first', rule: 'From across the street the name does the work. The loaf peeks in from a corner.', cap: 'Billboard · 6 × 3 m', v: 3 },
  ],
  palette: ['Soot', 'Crust', 'Dough', 'Oven', 'Tomato'],
  preview: ['Out of the oven at seven.', 'Sourdough and simit and the good kind of queue.'],
  curves: [
    { n: 'Roll', d: 'For things that change places' },
    { n: 'Pop', d: 'For things you press' },
    { n: 'Settle', d: 'For things that arrive' },
    { n: 'Exit', d: 'For things that leave' },
  ],
};

const HERO_TR: HeroCopy = {
  reach: {
    easy: ['Kolay erişim', 'Başparmağın dinlendiği yer. Ana eylem burada yaşar.'],
    ok: ['Biraz uzanmak', 'Arada bir yapılan şeyler için uygun.'],
    hard: ['Zor erişim', 'Öbür el gerekir. Nadir şeyleri burada tut.'],
  },
  train: [
    { t: 'Derleme', d: 'Tek commit’ten iki platform', m: '318' },
    { t: 'Testler', d: 'On iki telefonda birim ve ekran testleri', m: '214 geçti' },
    { t: 'Beta', d: 'TestFlight ve Play iç test kanalı', m: '40 kişi' },
    { t: 'Mağaza incelemesi', d: 'Apple ve Google bir göz atar', m: '~1 gün' },
    { t: 'Yayılım', d: 'Önce birkaç kişi sonra herkes', m: '' },
  ],
  sizes: [
    { n: 'Favicon', sz: '16 px', real: 'ekranda 4 mm', ver: 'Monogram', vno: 'v1 · tek çizik', rule: 'On altı pikselde iki çizik birbirine karışır. Tek ve kalın bir çizik hâlâ ekmek gibi okunur.', cap: 'Tarayıcı sekmesi · 16 px', v: 1 },
    { n: 'Uygulama ikonu', sz: '60 px', real: 'telefonda 1 cm', ver: 'Monogram', vno: 'v2 · iki çizik', rule: 'Ana ekranda somun fırın sarısının üstünde durur ki başparmak onu bir saniyede bulsun.', cap: 'Ana ekran · 60 px', v: 2 },
    { n: 'Kartvizit', sz: '85 mm', real: 'elinde', ver: 'İşaret ve isim', vno: 'v3 · işaret ve isim', rule: 'İşaret ve isim bir arada. Etraflarındaki boşluk bir çizik yüksekliğinde.', cap: 'Kartvizit · 85 × 55 mm', v: 3 },
    { n: 'Sosyal medya', sz: '1080 px', real: 'akışta', ver: 'İşaret ve slogan', vno: 'v3 · sloganla', rule: 'Somun kareden bilerek taşar. Kesilmiş ekmek de ekmektir.', cap: 'Sosyal medya gönderisi · 1080 × 1080', v: 3 },
    { n: 'Afiş', sz: '594 mm', real: 'duvarda A1', ver: 'Tam · desenli', vno: 'v3 · desen olan çizikler', rule: 'Afiş boyunda çizikler bir desene dönüşür. Öğrenilecek yeni bir şey yok.', cap: 'Afiş · A1', v: 3 },
    { n: 'Reklam panosu', sz: '6 m', real: 'karşı kaldırımdan', ver: 'İsim', vno: 'v4 · önce isim', rule: 'Karşı kaldırımdan bakınca işi isim yapar. Somun bir köşeden göz kırpar.', cap: 'Reklam panosu · 6 × 3 m', v: 3 },
  ],
  palette: ['İs', 'Kabuk', 'Hamur', 'Fırın', 'Domates'],
  preview: ['Yedide fırından çıkar.', 'Ekşi maya ve simit ve iyisinden bir kuyruk.'],
  curves: [
    { n: 'Kay', d: 'Yer değiştiren şeyler için' },
    { n: 'Zıpla', d: 'Basılan şeyler için' },
    { n: 'Yerleş', d: 'Gelen şeyler için' },
    { n: 'Çık', d: 'Giden şeyler için' },
  ],
};

export const HERO: Record<Lang, HeroCopy> = { tr: HERO_TR, en: HERO_EN };

/** The demo editor on the Websites page edits both languages whatever the page language is. */
export const EDITOR_SAMPLE: Record<Lang, { h: string; p: string }> = {
  en: { h: 'Bowls for slow mornings.', p: 'Thrown by hand in Kadıköy. Fired twice. Made to be used every single day.' },
  tr: { h: 'Yavaş sabahlar için kaseler.', p: 'Kadıköy’de elde çekildi. İki kez pişti. Her gün kullanılmak için yapıldı.' },
};
