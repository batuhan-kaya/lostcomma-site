/**
 * Process copy per language: the ten weeks (phases · tracks · milestones) · the weekly rhythm ·
 * house rules · life after launch. Geometry (where clips sit) lives in src/shared/timeline.ts.
 * No commas anywhere (checked by test/process-studio.test.ts). Prices wait for Batuhan.
 */
import type { Lang } from '../i18n';

export interface PhaseCopy {
  n: string;
  w: string;
  hap: string;
  you: string;
  get: string;
}

export interface ProcessCopy {
  title: string;
  lede: string;
  try: string;
  after: string;
  phases: PhaseCopy[];
  /** Track names and clip labels in the order of TRACKS. */
  tracks: { n: string; clips: string[] }[];
  milestones: string[];
  week: { h: string; p: string; days: { d: string; at: string; len: string; t: string; text: string }[]; daily: [string, string] };
  rules: { t: string; p: string }[];
  plans: { n: string; p: string; items: string[]; per: string }[];
}

const en: ProcessCopy = {
  title: 'Ten weeks.',
  lede: 'A typical website from the first call to launch day.',
  try: 'Drag the playhead or press play.',
  after: 'Everyone works in the same file so you always know where we are.',
  phases: [
    { n: 'Kickoff', w: 'Week 1', hap: 'We meet your team and ask a lot of questions.', you: 'Bring the person who decides.', get: 'A one page brief we both sign.' },
    { n: 'Shape', w: 'Week 2', hap: 'A workshop and a sitemap. What goes where and why.', you: 'Half a day in a room with us.', get: 'A sitemap and a content plan.' },
    { n: 'Look', w: 'Week 3', hap: 'Three directions on one board. We pick one together.', you: 'Tell us what feels like you.', get: 'A moodboard and a type pairing.' },
    { n: 'Design', w: 'Weeks 4 to 5', hap: 'Every page designed at real widths in the browser.', you: 'Comments in the shared file.', get: 'Clickable designs and a motion study.' },
    { n: 'Build', w: 'Weeks 6 to 8', hap: 'We build it for real. The preview link updates every evening.', you: 'Write and upload the content.', get: 'A working site on a preview address.' },
    { n: 'Polish', w: 'Week 9', hap: 'Testing on real phones and with screen readers.', you: 'Try to break it.', get: 'A list of fixes. Then no list.' },
    { n: 'Launch', w: 'Week 10', hap: 'We go live on a quiet morning. Then we watch.', you: 'Tell people.', get: 'Your site live and a team that can run it.' },
  ],
  tracks: [
    { n: 'You', clips: ['Kickoff call', 'Workshop', 'Pick a look', 'Write the content', 'Try to break it', 'Tell people'] },
    { n: 'Design', clips: ['Discovery', 'Moodboard', 'Design every page', 'Support the build'] },
    { n: 'Motion', clips: ['Motion study', 'Build the motion', 'Launch film'] },
    { n: 'Code', clips: ['Setup', 'Build', 'Test', 'Go live'] },
  ],
  milestones: ['Look agreed', 'Design sign off', 'Content freeze', 'Launch'],
  week: {
    h: 'Same rhythm.\nEvery week.',
    p: 'Ten weeks is long enough to lose track. A fixed weekly rhythm makes sure nobody does.',
    days: [
      { d: 'Mon', at: '09:30', len: '15 min', t: 'Plan', text: 'What we do this week and what we need from you.' },
      { d: 'Tue', at: '', len: 'All day', t: 'Make', text: 'Work happens in a file you can open any time.' },
      { d: 'Wed', at: '', len: 'Async', t: 'Comments', text: 'Leave notes right on the design. We answer the same day.' },
      { d: 'Thu', at: '', len: 'All day', t: 'Make', text: 'A new preview link every evening.' },
      { d: 'Fri', at: '16:00', len: '30 min · recorded', t: 'Demo', text: 'We show what changed. You say what you think. Short and honest.' },
    ],
    daily: ['Every day', 'A short written update in your channel. No status meetings.'],
  },
  rules: [
    { t: 'No surprises on the invoice.', p: 'The quote is fixed before we start. Changes get a price before they get made.' },
    { t: 'You see it every Friday.', p: 'Unfinished work included. Especially unfinished work.' },
    { t: 'Decisions get written down.', p: 'In the shared file next to the thing they are about. Nobody has to remember.' },
    { t: 'One person decides.', p: 'On your side and on ours. Committees make beige.' },
    { t: 'We say no when we should.', p: 'If an idea will hurt your project we will tell you why. Politely and early.' },
    { t: 'Launch is a beginning.', p: 'We watch the first weeks closely and fix what real people find.' },
  ],
  plans: [
    { n: 'Watch', p: 'We keep it fast and safe and up to date.', items: ['Monitoring day and night', 'Updates and backups', 'A monthly health report'], per: 'per month' },
    { n: 'Grow', p: 'Everything in Watch plus new features every month.', items: ['Two days of design and code a month', 'A seat in our Friday demo', 'Priority for anything urgent'], per: 'per month' },
    { n: 'Call us', p: 'No plan. Just call when you need us.', items: ['Fixed quote for every job', 'Usually within a week', 'Same team as before'], per: 'no minimum' },
  ],
};

const tr: ProcessCopy = {
  title: 'On hafta.',
  lede: 'İlk görüşmeden yayın gününe tipik bir web sitesi.',
  try: 'Oynatma kafasını sürükle ya da oynat’a bas.',
  after: 'Herkes aynı dosyada çalışır ve böylece nerede olduğumuzu hep bilirsin.',
  phases: [
    { n: 'Tanışma', w: '1. hafta', hap: 'Ekibinle tanışıp bol bol soru soruyoruz.', you: 'Karar veren kişiyi getir.', get: 'İkimizin de imzaladığı tek sayfalık bir brief.' },
    { n: 'Kurgu', w: '2. hafta', hap: 'Bir atölye ve bir site haritası. Ne nereye gidiyor ve neden.', you: 'Bizimle bir odada yarım gün.', get: 'Bir site haritası ve bir içerik planı.' },
    { n: 'Görünüm', w: '3. hafta', hap: 'Tek panoda üç yön. Birini birlikte seçiyoruz.', you: 'Hangisinin sana benzediğini söyle.', get: 'Bir ilham panosu ve bir yazı eşleşmesi.' },
    { n: 'Tasarım', w: '4 ile 5. hafta', hap: 'Her sayfa tarayıcıda ve gerçek genişliklerde tasarlanır.', you: 'Ortak dosyada yorumlar.', get: 'Tıklanabilir tasarımlar ve bir hareket çalışması.' },
    { n: 'Yapım', w: '6 ile 8. hafta', hap: 'Gerçeğini kuruyoruz. Önizleme bağlantısı her akşam güncellenir.', you: 'İçeriği yaz ve yükle.', get: 'Bir önizleme adresinde çalışan bir site.' },
    { n: 'Cila', w: '9. hafta', hap: 'Gerçek telefonlarda ve ekran okuyucularla test.', you: 'Bozmaya çalış.', get: 'Bir düzeltme listesi. Sonra liste yok.' },
    { n: 'Yayın', w: '10. hafta', hap: 'Sakin bir sabah yayına çıkıyoruz. Sonra izliyoruz.', you: 'Herkese duyur.', get: 'Yayında bir site ve onu yönetebilen bir ekip.' },
  ],
  tracks: [
    { n: 'Sen', clips: ['Tanışma görüşmesi', 'Atölye', 'Görünüm seç', 'İçeriği yaz', 'Bozmaya çalış', 'Duyur'] },
    { n: 'Tasarım', clips: ['Keşif', 'İlham panosu', 'Her sayfayı tasarla', 'Yapıma destek'] },
    { n: 'Hareket', clips: ['Hareket çalışması', 'Hareketi kur', 'Lansman filmi'] },
    { n: 'Kod', clips: ['Kurulum', 'Yapım', 'Test', 'Yayına al'] },
  ],
  milestones: ['Görünüm onaylandı', 'Tasarım onayı', 'İçerik dondu', 'Yayın'],
  week: {
    h: 'Aynı ritim.\nHer hafta.',
    p: 'On hafta yolu kaybetmeye yetecek kadar uzun. Sabit bir haftalık ritim kimsenin kaybetmemesini sağlar.',
    days: [
      { d: 'Pzt', at: '09:30', len: '15 dk', t: 'Plan', text: 'Bu hafta ne yapacağımız ve senden neye ihtiyacımız olduğu.' },
      { d: 'Sal', at: '', len: 'Bütün gün', t: 'Yapım', text: 'İş istediğin an açabileceğin bir dosyada yürür.' },
      { d: 'Çar', at: '', len: 'Eşzamansız', t: 'Yorumlar', text: 'Notunu doğrudan tasarımın üstüne bırak. Aynı gün cevaplarız.' },
      { d: 'Per', at: '', len: 'Bütün gün', t: 'Yapım', text: 'Her akşam yeni bir önizleme bağlantısı.' },
      { d: 'Cum', at: '16:00', len: '30 dk · kayıtlı', t: 'Demo', text: 'Neyin değiştiğini gösteririz. Sen ne düşündüğünü söylersin. Kısa ve dürüst.' },
    ],
    daily: ['Her gün', 'Kanalında kısa bir yazılı güncelleme. Durum toplantısı yok.'],
  },
  rules: [
    { t: 'Faturada sürpriz yok.', p: 'Teklif başlamadan önce sabitlenir. Değişiklikler yapılmadan önce fiyatlanır.' },
    { t: 'Her cuma görürsün.', p: 'Bitmemiş işler dahil. Özellikle bitmemiş işler.' },
    { t: 'Kararlar yazılır.', p: 'Ortak dosyada ve ilgili şeyin hemen yanında. Kimsenin hatırlaması gerekmez.' },
    { t: 'Tek kişi karar verir.', p: 'Senin tarafında da bizimkinde de. Komiteler bej üretir.' },
    { t: 'Gerektiğinde hayır deriz.', p: 'Bir fikir projene zarar verecekse nedenini söyleriz. Kibarca ve erkenden.' },
    { t: 'Yayın bir başlangıçtır.', p: 'İlk haftaları yakından izler ve gerçek insanların bulduklarını düzeltiriz.' },
  ],
  plans: [
    { n: 'İzle', p: 'Hızlı ve güvenli ve güncel tutarız.', items: ['Gece gündüz izleme', 'Güncellemeler ve yedekler', 'Aylık bir sağlık raporu'], per: 'aylık' },
    { n: 'Büyüt', p: 'İzle’deki her şey ve her ay yeni özellikler.', items: ['Ayda iki gün tasarım ve kod', 'Cuma demomuzda bir sandalye', 'Acil her şeyde öncelik'], per: 'aylık' },
    { n: 'Ara bizi', p: 'Plan yok. İhtiyacın olunca ara.', items: ['Her iş için sabit teklif', 'Genelde bir hafta içinde', 'Öncekiyle aynı ekip'], per: 'en az tutar yok' },
  ],
};

export const PROCESS: Record<Lang, ProcessCopy> = { tr, en };
