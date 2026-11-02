/**
 * Start copy per language: the booking panel · other ways to reach us · what happens next ·
 * the brief template people can copy · the two emails a booking sends. No commas anywhere.
 */
import type { Lang } from '../i18n';

export const ABOUT_KEYS = ['website', 'app', 'identity', 'motion', 'unsure'] as const;
export type About = (typeof ABOUT_KEYS)[number];

export interface StartCopy {
  lede: [string, string, string];
  about: Record<About, string>;
  ways: { email: { k: string; d: string }; brief: { k: string; b: string; d: string; q: string[] }; visit: { k: string; b: string; d: string }; phone: { k: string; b: string; d: string } };
  steps: { k: string; b: string; p: string }[];
  mail: {
    guestSubject: string;
    hello: string;
    ready: string;
    ist: string;
    yours: string;
    link: string;
    noLink: string;
    calendar: string;
    before: string;
    change: string;
    cancelSubject: string;
    cancelled: string;
    rebook: string;
  };
}

const en: StartCopy = {
  lede: ['Twenty minutes on a call is usually enough to know if we are right for each other. ', 'Pick a time that works in both of our time zones.', ' Or just write to us.'],
  about: { website: 'Website', app: 'App', identity: 'Identity', motion: 'Motion', unsure: 'Not sure yet' },
  ways: {
    email: { k: 'Email', d: 'The fastest way. A human answers within a working day.' },
    brief: {
      k: 'Write a brief',
      b: 'Seven questions',
      d: 'Copy our short brief and send it back by email. Answer the ones you can.',
      q: [
        'Who are you and what do you do?',
        'What should we make? A website or an app or an identity or motion or something else.',
        'Who is it for?',
        'What should be different once it exists?',
        'Is there a date we should know about?',
        'Do you have a budget in mind?',
        'Three sites or apps you like and why.',
      ],
    },
    visit: { k: 'Visit', b: 'Kadıköy Istanbul', d: 'Come for tea. Five minutes from the ferry.' },
    phone: { k: 'Phone', b: '[+90 phone]', d: 'Weekdays 10:00 to 18:00 Istanbul time.' },
  },
  steps: [
    { k: 'Same day', b: 'We read your note.', p: 'And look at your current site or app if you have one. No sales script.' },
    { k: 'On the call', b: 'Twenty honest minutes.', p: 'What you need and what it might cost. We will say so if we are not the right team.' },
    { k: 'Within a week', b: 'A written proposal.', p: 'Scope and timeline and a fixed price. Yours to keep even if you go with someone else.' },
  ],
  mail: {
    guestSubject: 'Our call: {when} Istanbul',
    hello: 'Hello {name}',
    ready: 'Your twenty minute call with Lost Comma is booked.',
    ist: 'Istanbul time: {when}',
    yours: 'Your time: {time} ({city})',
    link: 'The call: {url}',
    noLink: 'We will send the link for the call a day before.',
    calendar: 'The calendar invitation is attached.',
    before: 'Before the call we read your note and look at your current site or app if you have one.',
    change: 'Need another time? Just reply to this email.',
    cancelSubject: 'Our call is cancelled: {when} Istanbul',
    cancelled: 'We are sorry. We had to cancel our call on {when} Istanbul time.',
    rebook: 'Pick a new time here: {url} · or just reply to this email.',
  },
};

const tr: StartCopy = {
  lede: ['Birbirimize uygun olup olmadığımızı anlamak için yirmi dakikalık bir görüşme genelde yeter. ', 'İkimizin de saatine uyan bir zaman seç.', ' Ya da sadece yaz.'],
  about: { website: 'Web sitesi', app: 'Uygulama', identity: 'Kimlik', motion: 'Hareket', unsure: 'Henüz emin değilim' },
  ways: {
    email: { k: 'E-posta', d: 'En hızlı yol. Bir iş günü içinde bir insan cevaplıyor.' },
    brief: {
      k: 'Brief yaz',
      b: 'Yedi soru',
      d: 'Kısa brief şablonumuzu kopyala ve e-postayla geri gönder. Cevaplayabildiklerini cevapla.',
      q: [
        'Sen kimsin ve ne yapıyorsun?',
        'Ne yapmamızı istiyorsun? Web sitesi ya da uygulama ya da kimlik ya da hareket ya da başka bir şey.',
        'Kimin için?',
        'Bu iş bittiğinde ne değişmiş olmalı?',
        'Bilmemiz gereken bir tarih var mı?',
        'Aklında bir bütçe var mı?',
        'Sevdiğin üç site ya da uygulama ve neden.',
      ],
    },
    visit: { k: 'Ziyaret', b: 'Kadıköy İstanbul', d: 'Çaya gel. Vapurdan beş dakika.' },
    phone: { k: 'Telefon', b: '[+90 telefon]', d: 'Hafta içi 10:00 ile 18:00 arası İstanbul saatiyle.' },
  },
  steps: [
    { k: 'Aynı gün', b: 'Notunu okuyoruz.', p: 'Varsa şu anki siteni ya da uygulamanı da inceliyoruz. Satış konuşması yok.' },
    { k: 'Görüşmede', b: 'Yirmi dürüst dakika.', p: 'Neye ihtiyacın var ve ne kadar tutabilir. Doğru ekip değilsek bunu söyleriz.' },
    { k: 'Bir hafta içinde', b: 'Yazılı bir teklif.', p: 'Kapsam ve takvim ve sabit bir fiyat. Başka bir ekiple çalışsan bile sende kalır.' },
  ],
  mail: {
    guestSubject: 'Görüşmemiz: {when} İstanbul',
    hello: 'Merhaba {name}',
    ready: 'Lost Comma ile yirmi dakikalık görüşmen hazır.',
    ist: 'İstanbul saatiyle: {when}',
    yours: 'Senin saatinle: {time} ({city})',
    link: 'Görüşme: {url}',
    noLink: 'Görüşmenin bağlantısını bir gün önce göndereceğiz.',
    calendar: 'Takvim davetini ekte bulacaksın.',
    before: 'Görüşmeden önce notunu okuyacağız ve varsa şu anki siteni ya da uygulamanı inceleyeceğiz.',
    change: 'Başka bir saat mi lazım? Bu e-postayı yanıtlaman yeterli.',
    cancelSubject: 'Görüşmemiz iptal oldu: {when} İstanbul',
    cancelled: 'Kusura bakma. {when} İstanbul saatindeki görüşmemizi iptal etmek zorunda kaldık.',
    rebook: 'Yeni bir saat seçmek için: {url} · ya da bu e-postayı yanıtla.',
  },
};

export const START: Record<Lang, StartCopy> = { tr, en };
