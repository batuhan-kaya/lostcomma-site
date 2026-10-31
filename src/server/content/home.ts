/**
 * Homepage content per language. Long structured copy lives here instead of the t() catalog
 * because the Turkish and English sentences are built differently (the manifesto edits,
 * the brief sentence). UI labels stay in t(). Rendered text is still checked for commas by e2e.
 */
import type { Lang } from '../i18n';

export type Who = 'design' | 'code' | 'motion';

/** A manifesto segment: plain text or a tracked change (struck text replaced by a suggestion). */
export type Seg = string | { who: Who; del: string; ins: string };

export interface Service {
  name: string;
  lab: string;
  size: string;
  desc: string;
  dl: string;
  code: string;
  say: string;
}

/** The Lab frame at the end of the board (projects come from the database). */
export interface LabFrame {
  name: string;
  what: string;
}

export interface Step {
  name: string;
  time: string;
  text: string;
  get: string;
}

export interface Choice {
  n: string;
  /** Phrase used in the brief sentence. */
  p: string;
  who: Who;
  say: string;
}

export interface HomeContent {
  /** Variable word in the headline. The first one is rendered by the server. */
  words: string[];
  manifesto: Seg[];
  comments: { who: Who; text: string }[];
  services: Service[];
  lab: LabFrame;
  notes: string[];
  steps: Step[];
  types: Choice[];
  times: Choice[];
  budgets: { n: string; say: string }[];
  /** What each teammate is doing, shown in the header popovers. */
  doing: Record<Who, string>;
}

const CODE = {
  web: '.website {\n  width: 1440px;\n  height: 900px;\n  --load: 0.8s;\n}',
  app: '.app {\n  width: 390px;\n  height: 844px;\n  --fps: 120;\n}',
  id: '.identity {\n  width: 1080px;\n  height: 1080px;\n  --colours: 4;\n}',
  mo: '.motion {\n  width: 1920px;\n  height: 820px;\n  --duration: 12s;\n}',
};

const en: HomeContent = {
  words: ['remember', 'screenshot', 'fall for', 'talk about', 'come back to'],
  manifesto: [
    'We are a ',
    { who: 'design', del: 'full-service digital agency', ins: 'small design and engineering studio' },
    ' in Istanbul. We ',
    { who: 'code', del: 'leverage cutting-edge solutions to craft seamless digital experiences', ins: 'make websites and apps and identities' },
    ' that ',
    { who: 'motion', del: 'drive engagement', ins: 'people actually enjoy' },
    '. We work ',
    { who: 'design', del: 'for', ins: 'with' },
    ' our clients. ',
    { who: 'code', del: 'Synergy.', ins: 'Live and in the open.' },
  ],
  comments: [
    { who: 'design', text: 'Small is the point.' },
    { who: 'code', text: 'Nobody has ever leveraged anything.' },
    { who: 'motion', text: 'Engagement is a metric. Enjoyment is a feeling.' },
    { who: 'design', text: 'One word. Big difference.' },
    { who: 'code', text: 'Deleting this felt great.' },
  ],
  services: [
    { name: 'Websites', lab: 'Website', size: '1440 × 900', desc: 'Marketing sites and web apps that load fast and feel alive. Built so your team can edit them after we leave.', dl: 'Strategy · design · development · CMS', code: CODE.web, say: 'nice and wide' },
    { name: 'Apps', lab: 'App', size: '390 × 844', desc: 'iOS and Android apps with a native feel and real performance. Interfaces people open every day.', dl: 'Product design · prototypes · development', code: CODE.app, say: 'squish' },
    { name: 'Identity', lab: 'Identity', size: '1080 × 1080', desc: 'Names and marks and type and voice. Systems that hold up from a favicon to a billboard.', dl: 'Logo · type · colour · guidelines', code: CODE.id, say: 'perfect square' },
    { name: 'Motion', lab: 'Motion', size: '1920 × 820', desc: 'Interface motion and brand films. The small details that make people smile without knowing why.', dl: 'UI motion · brand films · micro interactions', code: CODE.mo, say: 'cinematic' },
  ],
  lab: { name: 'Type that breathes', what: 'Experiment · ongoing' },
  notes: ['Still my favourite.', 'Look at that type.', 'Can we do this one again?', 'Pixel perfect. Finally.'],
  steps: [
    { name: 'Listen', time: '1 to 2 weeks', text: 'We ask a lot of questions and then a few more. Workshops and research until the problem is sharper than the brief.', get: 'Brief · research · direction' },
    { name: 'Sketch', time: 'About a week', text: 'Ideas on paper first. Cheap to make and easy to throw away. Only the good ones survive the week.', get: 'Concepts · moodboards · flows' },
    { name: 'Prototype', time: '1 to 3 weeks', text: 'Clickable early. You feel the product long before we build it. A lot like this section.', get: 'Prototypes · key screens · motion tests' },
    { name: 'Build', time: '3 to 8 weeks', text: 'Design and code side by side with no handoff walls. Everything tested on real devices.', get: 'Design system · code · QA' },
    { name: 'Launch', time: 'Launch and after', text: 'We ship it and stay close. Small fixes and big updates. The work keeps breathing long after day one.', get: 'Launch · analytics · care' },
  ],
  types: [
    { n: 'Website', p: 'a website', who: 'design', say: 'we love websites' },
    { n: 'App', p: 'an app', who: 'code', say: 'native feel. promise' },
    { n: 'Identity', p: 'a new identity', who: 'design', say: 'our favourite kind of work' },
    { n: 'Motion', p: 'some motion', who: 'motion', say: 'my time to shine' },
  ],
  times: [
    { n: 'ASAP', p: 'as soon as possible', who: 'code', say: 'we will make it work' },
    { n: '1 month', p: 'within a month', who: 'motion', say: 'tight but doable' },
    { n: '3 months', p: 'in about three months', who: 'motion', say: 'the sweet spot' },
    { n: '6 months', p: 'in about six months', who: 'design', say: 'room to play' },
    { n: 'No rush', p: 'whenever it is ready', who: 'motion', say: 'the best kind' },
  ],
  budgets: [
    { n: 'Under €5k', say: 'we can start small' },
    { n: '€5–15k', say: 'good starting point' },
    { n: '€15–40k', say: 'lots of room to explore' },
    { n: '€40k+', say: 'dream project' },
    { n: 'Not sure yet', say: 'totally fine. we will help' },
  ],
  doing: { design: 'Looking around the file', code: 'Reading the codebase', motion: 'Tweaking an easing curve' },
};

const tr: HomeContent = {
  words: ['Akılda kalan', 'Konuşulan', 'Paylaşılan', 'Âşık olunan', 'Tekrar açılan'],
  manifesto: [
    'İstanbul’da ',
    { who: 'design', del: 'tam hizmet veren bir dijital ajansız', ins: 'küçük bir tasarım ve yazılım stüdyosuyuz' },
    '. ',
    { who: 'code', del: 'Son teknoloji çözümlerle kusursuz dijital deneyimler kurguluyoruz', ins: 'Web siteleri ve uygulamalar ve kimlikler yapıyoruz' },
    ' ve bunlar ',
    { who: 'motion', del: 'etkileşimi artırıyor', ins: 'insanların gerçekten hoşuna gidiyor' },
    '. ',
    { who: 'design', del: 'Müşterilerimiz için', ins: 'Müşterilerimizle birlikte' },
    ' çalışıyoruz. ',
    { who: 'code', del: 'Sinerji.', ins: 'Canlı ve herkesin önünde.' },
  ],
  comments: [
    { who: 'design', text: 'Küçük olmak işin özü.' },
    { who: 'code', text: 'Kusursuz deneyim diye bir şey yok.' },
    { who: 'motion', text: 'Etkileşim bir metrik. Keyif bir his.' },
    { who: 'design', text: 'Tek kelime. Koca fark.' },
    { who: 'code', text: 'Bunu silmek çok iyi geldi.' },
  ],
  services: [
    { name: 'Web siteleri', lab: 'Web sitesi', size: '1440 × 900', desc: 'Hızlı açılan ve canlı hissettiren tanıtım siteleri ve web uygulamaları. Biz gittikten sonra ekibin düzenleyebilsin diye kuruluyor.', dl: 'Strateji · tasarım · geliştirme · CMS', code: CODE.web, say: 'geniş ve ferah' },
    { name: 'Uygulamalar', lab: 'Uygulama', size: '390 × 844', desc: 'Doğal hissettiren ve gerçekten hızlı iOS ve Android uygulamaları. İnsanların her gün açtığı arayüzler.', dl: 'Ürün tasarımı · prototip · geliştirme', code: CODE.app, say: 'sıkış' },
    { name: 'Kimlik', lab: 'Kimlik', size: '1080 × 1080', desc: 'İsimler ve işaretler ve yazı ve ses tonu. Favicon’dan reklam panosuna kadar ayakta duran sistemler.', dl: 'Logo · yazı · renk · kılavuz', code: CODE.id, say: 'tam kare' },
    { name: 'Hareket', lab: 'Hareket', size: '1920 × 820', desc: 'Arayüz hareketleri ve marka filmleri. İnsanları nedenini bilmeden gülümseten küçük detaylar.', dl: 'Arayüz hareketi · marka filmi · mikro etkileşim', code: CODE.mo, say: 'sinematik' },
  ],
  lab: { name: 'Nefes alan yazı', what: 'Deney · sürüyor' },
  notes: ['Hâlâ en sevdiğim.', 'Şu yazıya bak.', 'Bunu bir daha yapalım mı?', 'Piksel piksel. Sonunda.'],
  steps: [
    { name: 'Dinle', time: '1 ila 2 hafta', text: 'Çok soru sorarız ve sonra birkaç tane daha. Problem brief’ten daha net olana kadar atölyeler ve araştırma.', get: 'Brief · araştırma · yön' },
    { name: 'Eskiz', time: 'Yaklaşık bir hafta', text: 'Önce kâğıtta fikirler. Yapması ucuz ve atması kolay. Haftayı sadece iyileri çıkarır.', get: 'Konseptler · moodboard · akışlar' },
    { name: 'Prototip', time: '1 ila 3 hafta', text: 'Erkenden tıklanabilir. Ürünü biz kurmadan çok önce hissedersin. Tıpkı bu bölüm gibi.', get: 'Prototipler · ana ekranlar · hareket testleri' },
    { name: 'Geliştirme', time: '3 ila 8 hafta', text: 'Tasarım ve kod yan yana. Devir teslim duvarı yok. Her şey gerçek cihazlarda test edilir.', get: 'Tasarım sistemi · kod · test' },
    { name: 'Yayın', time: 'Yayın ve sonrası', text: 'Yayına alır ve yakında dururuz. Küçük düzeltmeler ve büyük güncellemeler. İş ilk günden sonra da nefes almaya devam eder.', get: 'Yayın · analitik · bakım' },
  ],
  types: [
    { n: 'Web sitesi', p: 'bir web sitesi', who: 'design', say: 'web sitelerine bayılırız' },
    { n: 'Uygulama', p: 'bir uygulama', who: 'code', say: 'doğal his. söz' },
    { n: 'Kimlik', p: 'yeni bir kimlik', who: 'design', say: 'en sevdiğimiz iş türü' },
    { n: 'Hareket', p: 'biraz hareket', who: 'motion', say: 'parlama zamanım' },
  ],
  times: [
    { n: 'Hemen', p: 'en kısa sürede', who: 'code', say: 'hallederiz' },
    { n: '1 ay', p: 'bir ay içinde', who: 'motion', say: 'sıkı ama olur' },
    { n: '3 ay', p: 'yaklaşık üç ayda', who: 'motion', say: 'tam kıvamında' },
    { n: '6 ay', p: 'yaklaşık altı ayda', who: 'design', say: 'oynamaya yer var' },
    { n: 'Acele yok', p: 'hazır olduğunda', who: 'motion', say: 'en güzeli' },
  ],
  budgets: [
    { n: '5 bin € altı', say: 'küçük başlayabiliriz' },
    { n: '5–15 bin €', say: 'iyi bir başlangıç' },
    { n: '15–40 bin €', say: 'keşfetmeye bol yer' },
    { n: '40 bin € üstü', say: 'hayal projesi' },
    { n: 'Henüz bilmiyorum', say: 'hiç sorun değil. yardım ederiz' },
  ],
  doing: { design: 'Dosyaya göz atıyor', code: 'Kodu okuyor', motion: 'Bir yumuşatma eğrisiyle uğraşıyor' },
};

export const HOME: Record<Lang, HomeContent> = { tr, en };

/** Stable ids posted by the brief form (never shown). */
export const BRIEF_TYPES = ['website', 'app', 'identity', 'motion'] as const;
export const BRIEF_TIMES = ['asap', '1m', '3m', '6m', 'norush'] as const;
export const BRIEF_BUDGETS = ['b5', 'b15', 'b40', 'b40plus', 'unsure'] as const;
