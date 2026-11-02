/**
 * The legal pages (Gizlilik · KVKK · Çerezler) in both languages. Like all visible copy they keep
 * the comma rule. {controller} · {address} · {email} · {mail} come from the panel (Site ayarları ·
 * Yasal sayfalar) and stay placeholders until filled. When the text changes · change LEGAL_UPDATED.
 *
 * What these pages promise is real: docs/ISTATISTIK.md (cookieless statistics · the daily salt) ·
 * src/server/data/retention.ts (two years) · STATS_DAYS (thirteen months).
 */
import type { Lang } from '../i18n';

export const LEGAL_UPDATED = '2026-11-01';

export type LegalKey = 'privacy' | 'kvkk' | 'cookies';

export type Block = string | { list: string[] } | { table: { head: [string, string, string]; rows: [string, string, string][] } };

export interface LegalDoc {
  kick: string;
  title: string;
  lede: string;
  /** "In short": three to five plain lines in the hero. */
  short: string[];
  sections: { id: string; h: string; body: Block[] }[];
}

const TR: Record<LegalKey, LegalDoc> = {
  privacy: {
    kick: 'Gizlilik',
    title: 'Gizlilik.',
    lede: 'Seni tanımadan da iyi bir site yapılabiliyor. Ne topladığımızı · neden topladığımızı ve ne zaman sildiğimizi sade bir dille anlattık.',
    short: [
      'Çerez kullanmıyoruz. Reklam ve takip yok.',
      'Siteyi gezerken kim olduğunu bilmiyoruz. IP adresini saklamıyoruz.',
      'Bize yazarsan ya da görüşme alırsan sadece cevap vermek için gerekenleri tutuyoruz.',
      'Verilerin Almanya’daki sunucumuzda duruyor. Kimseye satılmıyor.',
    ],
    sections: [
      { id: 'biz', h: 'Biz kimiz', body: ['Lost Comma İstanbul’da tasarım ve yazılım yapan küçük bir stüdyo. Bu sitedeki kişisel verilerin sorumlusu {controller}.', 'Adres: {address} · E-posta: {email}'] },
      {
        id: 'ne',
        h: 'Ne topluyoruz',
        body: [
          {
            list: [
              'Bize yazdığında (ana sayfadaki brief formu): adın · e-posta adresin · mesajın · seçtiğin işler · zaman ve bütçe tercihin.',
              'Görüşme aldığında (Başla sayfası): adın · e-posta adresin · saat dilimin · seçtiğin konular ve bıraktığın not.',
              'Siteyi gezerken: hangi sayfalara baktığın · ne kadar kaldığın · ne kadar aşağı indiğin · hangi bağlantı ve düğmelere tıkladığın · hangi siteden geldiğin · ülken (varsa şehrin) · cihaz türün · tarayıcın · dilin ve saat dilimin.',
              'Bize e-posta gönderdiğinde: yazışmanın kendisi.',
              'Sunucunun güvenlik kayıtları: her istekte IP adresi · tarayıcı bilgisi ve zaman.',
            ],
          },
          'Bir forma yazdıklarını sen gönder düğmesine basmadan okumuyoruz.',
        ],
      },
      {
        id: 'sayim',
        h: 'Seni tanımadan nasıl sayıyoruz',
        body: [
          'Tarayıcına çerez ya da başka bir şey yazmıyoruz. Sunucumuz her gün yeni bir rastgele anahtar üretiyor. IP adresini ve tarayıcı bilgini bu anahtarla karıştırıp geri çözülemeyen kısa bir kod yapıyoruz. Aynı gün içindeki ziyaretlerin bu kodla birbirine bağlanıyor.',
          'Gece yarısı anahtarı siliyoruz ve ertesi gün yeni biri oluyorsun. Bu yüzden dünkü kayıtlar kimseye geri bağlanamıyor · bize bile.',
          'IP adresini sadece o an ülkeni bulmak ve bu kodu üretmek için kullanıyoruz. Hiçbir yere yazmıyoruz.',
          'Tarayıcında Do Not Track ya da Global Privacy Control açıksa seni hiç saymıyoruz. Bu sayfanın başındaki düğmeyle de saymamamızı isteyebilirsin.',
          'Bize yazarsan ya da görüşme alırsan o ziyaretin yolunu (hangi siteden geldiğin ve hangi sayfalara baktığın) mesajının yanına koyuyoruz. Böylece sana daha iyi cevap verebiliyoruz.',
        ],
      },
      {
        id: 'neden',
        h: 'Neden',
        body: [
          {
            list: [
              'Brief’ine cevap vermek ve teklif hazırlamak.',
              'Görüşmeni ayarlamak · onayı ve takvim davetini göndermek · gerekirse iptal etmek.',
              'Hangi sayfanın işe yaradığını görüp siteyi iyileştirmek.',
              'Siteyi saldırılara ve kötüye kullanıma karşı korumak.',
            ],
          },
        ],
      },
      {
        id: 'kimle',
        h: 'Kimlerle paylaşıyoruz',
        body: [
          'Verilerini satmıyoruz ve reklam için kullanmıyoruz. İşimizi yapmak için şu hizmetlerden yararlanıyoruz:',
          {
            list: [
              'Sunucu: Hetzner Online GmbH · Almanya. Site ve veritabanı burada çalışıyor.',
              'E-posta: {mail}. Bildirimler ve yazışmalar bu servisten geçiyor.',
              'Görüntülü görüşme: görüşmen için bir bağlantı gönderirsek o servisin kendi gizlilik kuralları geçerli olur.',
            ],
          },
          'Bir mahkeme ya da yetkili bir kurum yasal olarak isterse ilgili bilgiyi paylaşmak zorunda kalabiliriz.',
        ],
      },
      {
        id: 'sure',
        h: 'Ne kadar saklıyoruz',
        body: [
          {
            list: [
              'Brief’ler ve görüşme kayıtları: iki yıl. Sonra kendiliğinden silinir.',
              'Site istatistiği: on üç ay. Bir brief’e ya da görüşmeye bağlı ziyaret onunla birlikte durur ve onunla birlikte silinir.',
              'Sunucunun güvenlik kayıtları: otuz gün.',
              'E-posta yazışmaları: iş ilişkimiz boyunca ve sonrasında yasaların istediği kadar.',
            ],
          },
        ],
      },
      {
        id: 'hak',
        h: 'Hakların',
        body: [
          'Hakkında hangi bilgileri tuttuğumuzu sorabilir · düzeltilmesini ya da silinmesini isteyebilir · işlenmesine itiraz edebilirsin. Hakların ve nasıl başvuracağın KVKK aydınlatma metninde yazıyor.',
          'Bugünkü ziyaretinin kaydını bu sayfanın başında görebilir ve hemen silebilirsin.',
        ],
      },
      { id: 'degisiklik', h: 'Değişiklikler', body: ['Bu metni değiştirirsek üstteki tarihi güncelleriz.'] },
      { id: 'iletisim', h: 'Bize ulaş', body: ['Sorun ya da isteğin için {email} adresine yaz. En geç otuz gün içinde cevap veririz.'] },
    ],
  },
  kvkk: {
    kick: 'KVKK',
    title: 'Aydınlatma metni.',
    lede: '6698 sayılı Kişisel Verilerin Korunması Kanunu’nun 10. maddesi gereği kişisel verilerini nasıl işlediğimizi anlatıyoruz.',
    short: ['Veri sorumlusu: {controller}', 'Verilerin Almanya’daki sunucuda tutuluyor.', 'Başvurun için: {email}'],
    sections: [
      { id: 'sorumlu', h: 'Veri sorumlusu', body: ['Kişisel verilerin veri sorumlusu sıfatıyla {controller} (Lost Comma) tarafından işlenir.', 'Adres: {address}', 'E-posta: {email}'] },
      {
        id: 'veriler',
        h: 'İşlenen kişisel veriler',
        body: [
          {
            list: [
              'Kimlik: ad soyad.',
              'İletişim: e-posta adresi.',
              'Müşteri işlem: brief içeriği · seçilen hizmetler · zaman ve bütçe tercihi · görüşme konusu ve notu · görüşme saati ve saat dilimi.',
              'İşlem güvenliği: IP adresi · tarayıcı bilgisi · sunucu kayıtları.',
              'İnternet sitesi kullanımı: gezilen sayfalar · sayfada kalma süresi · tıklamalar · gelinen site · ülke ve şehir · cihaz · tarayıcı · dil. Bu veriler anonimdir. Bir brief ya da görüşme kaydına bağlandıklarında kişisel veri sayılır.',
            ],
          },
        ],
      },
      {
        id: 'amac',
        h: 'İşleme amaçları',
        body: [
          {
            list: [
              'Talebinin alınması ve cevaplanması · teklif hazırlanması.',
              'Görüşmenin planlanması · onaylanması · hatırlatılması ve iptali.',
              'İş ilişkisinin kurulması ve yürütülmesi.',
              'Bilgi güvenliğinin sağlanması ve kötüye kullanımın önlenmesi.',
              'İnternet sitesinin geliştirilmesi.',
              'Yetkili kurumlara yasal bilgi verilmesi.',
            ],
          },
        ],
      },
      {
        id: 'sebep',
        h: 'Hukuki sebepler',
        body: [
          {
            list: [
              'Bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması (KVKK m. 5/2-c): brief ve görüşme bilgileri.',
              'Veri sorumlusunun hukuki yükümlülüğünü yerine getirmesi (m. 5/2-ç): yasal saklama ve bildirimler.',
              'İlgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla veri sorumlusunun meşru menfaati (m. 5/2-f): bilgi güvenliği · site istatistiği · bir ziyaretin brief ya da görüşme kaydıyla ilişkilendirilmesi.',
            ],
          },
        ],
      },
      { id: 'yontem', h: 'Toplama yöntemi', body: ['Kişisel verilerin internet sitemizdeki formlar · e-posta ve tarayıcının sunucuya gönderdiği bilgiler aracılığıyla elektronik ortamda otomatik ya da kısmen otomatik yollarla toplanır.'] },
      {
        id: 'aktarim',
        h: 'Aktarım',
        body: [
          'Yurt içinde: kanunen yetkili kamu kurum ve kuruluşlarına talep halinde ve yasal sınırlar içinde.',
          'Yurt dışında: internet sitesinin ve veritabanının barındırıldığı Hetzner Online GmbH (Almanya) ile e-posta hizmeti aldığımız {mail}. Bu aktarımlar KVKK m. 9 kapsamında Kişisel Verileri Koruma Kurulu tarafından ilan edilen standart sözleşme hükümleriyle yapılır.',
        ],
      },
      {
        id: 'sure',
        h: 'Saklama süreleri',
        body: [
          {
            list: [
              'Brief ve görüşme kayıtları: iki yıl.',
              'Site istatistiği: on üç ay. Bir kayda bağlı ziyaret o kayıtla birlikte.',
              'Sunucu güvenlik kayıtları: otuz gün.',
              'E-posta yazışmaları: iş ilişkisi süresince ve ilgili mevzuatın öngördüğü süre kadar.',
            ],
          },
          'Süre dolunca veriler silinir ya da anonim hale getirilir.',
        ],
      },
      {
        id: 'haklar',
        h: 'Hakların (KVKK m. 11)',
        body: [
          {
            list: [
              'Kişisel verilerinin işlenip işlenmediğini öğrenme.',
              'İşlenmişse buna ilişkin bilgi talep etme.',
              'İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme.',
              'Yurt içinde ya da yurt dışında aktarıldığı üçüncü kişileri bilme.',
              'Eksik ya da yanlış işlenmişse düzeltilmesini isteme.',
              'Kanunda öngörülen şartlar çerçevesinde silinmesini ya da yok edilmesini isteme.',
              'Düzeltme · silme ve yok etme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme.',
              'Otomatik sistemlerle analiz edilmesi sonucu aleyhine bir sonuç çıkmasına itiraz etme.',
              'Kanuna aykırı işlenmesi sebebiyle zarara uğrarsa zararın giderilmesini talep etme.',
            ],
          },
        ],
      },
      {
        id: 'basvuru',
        h: 'Başvuru',
        body: [
          'Haklarını kullanmak için Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ’e uygun olarak yazılı şekilde · kayıtlı elektronik posta (KEP) · güvenli elektronik imza · mobil imza ya da bize daha önce bildirdiğin ve sistemimizde kayıtlı olan e-posta adresinden {email} adresine başvurabilirsin.',
          'Başvurunda adını soyadını · T.C. kimlik numaranı (yabancıysan uyruğunu ve pasaport numaranı) · tebligata esas adresini ya da e-posta adresini ve talebini açıkça yaz. Yazılı başvuruda imzan da gerekir.',
          'Başvurunu en geç otuz gün içinde ücretsiz olarak sonuçlandırırız. İşlem ayrıca bir maliyet gerektirirse Kurul’un belirlediği tarife uygulanabilir.',
        ],
      },
    ],
  },
  cookies: {
    kick: 'Çerezler',
    title: 'Çerezler.',
    lede: 'Kısa cevap: reklam ve takip çerezi yok. Uzun cevap aşağıda.',
    short: ['Takip ve reklam çerezi kullanmıyoruz.', 'İstatistik çerezsiz çalışıyor.', 'Tek çerezimiz dil seçimin.', 'Tarayıcında tuttuklarımızı buradan görüp silebilirsin.'],
    sections: [
      {
        id: 'cerez',
        h: 'Kullandığımız çerezler',
        body: [
          {
            table: {
              head: ['Ad', 'Ne işe yarar', 'Ne kadar'],
              rows: [
                ['lang', 'Seçtiğin dili hatırlar. Sadece dili değiştirdiğinde yazılır.', 'Bir yıl'],
                ['lc_panel', 'Stüdyonun yönetim paneli için oturum. Ziyaretçilere hiç yazılmaz.', 'En çok on dört gün'],
                ['lc_panel_step', 'Panelde iki adımlı girişin ikinci adımı. Ziyaretçilere hiç yazılmaz.', 'Beş dakika'],
              ],
            },
          },
        ],
      },
      {
        id: 'yerel',
        h: 'Tarayıcında tuttuklarımız',
        body: [
          'Bunlar çerez değil. Tarayıcının yerel deposunda dururlar ve bize hiç gönderilmezler.',
          {
            table: {
              head: ['Ad', 'Ne işe yarar', 'Ne kadar'],
              rows: [
                ['lc-comma', 'Ana sayfada saklanan virgülü bulduğunu hatırlar.', 'Sen silene kadar'],
                ['lc-saved-notes', 'Notes sayfasında kaydettiğin notlar.', 'Sen silene kadar'],
                ['lc-stats-off', 'Seni saymamamızı istediğini hatırlar.', 'Sen silene kadar'],
              ],
            },
          },
        ],
      },
      { id: 'baska', h: 'Başka sitelerin çerezleri', body: ['Yok. Fontlarımız · görsellerimiz ve kodumuz kendi sunucumuzdan geliyor. Sayfalarımızda başka bir sitenin aracı · reklamı ya da gömülü videosu bulunmuyor.'] },
      { id: 'onay', h: 'Neden onay sormuyoruz', body: ['Kullandığımız tek çerez senin istediğin bir şeyi (dil seçimini) hatırlıyor. Tarayıcında tuttuklarımız da senin yaptığın bir şeyin sonucu. Takip ya da reklam çerezi olmadığı için onay kutusuna gerek kalmıyor.'] },
      { id: 'sil', h: 'Nasıl silerim', body: ['Bu sayfanın başındaki listeden tek tek silebilirsin. Tarayıcının ayarlarından bu site için bütün verileri de temizleyebilirsin.'] },
    ],
  },
};

const EN: Record<LegalKey, LegalDoc> = {
  privacy: {
    kick: 'Privacy',
    title: 'Privacy.',
    lede: 'A good website does not need to know who you are. Here is what we collect · why · and when we delete it · in plain words.',
    short: [
      'No cookies. No ads and no tracking.',
      'While you browse we do not know who you are. We never store your IP address.',
      'If you write to us or book a call we keep only what we need to answer.',
      'Your data sits on our server in Germany. It is never sold.',
    ],
    sections: [
      { id: 'us', h: 'Who we are', body: ['Lost Comma is a small design and engineering studio in Istanbul. The controller of personal data on this site is {controller}.', 'Address: {address} · Email: {email}'] },
      {
        id: 'what',
        h: 'What we collect',
        body: [
          {
            list: [
              'When you write to us (the brief on the homepage): your name · email address · message · the kinds of work you picked · your timing and budget.',
              'When you book a call (Start): your name · email address · time zone · the topics you picked and your note.',
              'While you browse: the pages you look at · how long you stay · how far down you scroll · the links and buttons you click · the site you came from · your country (and city when known) · device type · browser · language and time zone.',
              'When you email us: the conversation itself.',
              'The server’s security logs: the IP address · browser details and time of every request.',
            ],
          },
          'We never read what you type into a form until you press send.',
        ],
      },
      {
        id: 'counting',
        h: 'How we count without knowing you',
        body: [
          'We write no cookie or anything else into your browser. Our server makes a new random key every day. It mixes your IP address and browser details with that key into a short code that cannot be reversed. That code ties your visits within one day together.',
          'At midnight the key is deleted and tomorrow you are someone new. So yesterday’s records can never be traced back to anyone · not even by us.',
          'We use your IP address only in that moment to find your country and make the code. We never write it down.',
          'If Do Not Track or Global Privacy Control is on in your browser we do not count you at all. You can also ask us not to count you with the button at the top of this page.',
          'If you write to us or book a call we put the path of that visit (where you came from and which pages you saw) next to your message. It helps us answer you better.',
        ],
      },
      {
        id: 'why',
        h: 'Why',
        body: [
          {
            list: [
              'To answer your brief and prepare a proposal.',
              'To set up your call · send the confirmation and calendar invitation · cancel it if needed.',
              'To see which pages work and make the site better.',
              'To protect the site from attacks and abuse.',
            ],
          },
        ],
      },
      {
        id: 'who',
        h: 'Who we share it with',
        body: [
          'We do not sell your data and we do not use it for ads. We rely on these services to do our work:',
          {
            list: [
              'Hosting: Hetzner Online GmbH · Germany. The site and its database run here.',
              'Email: {mail}. Notifications and our correspondence go through it.',
              'Video calls: if we send you a link for your call that service’s own privacy terms apply.',
            ],
          },
          'If a court or a competent authority lawfully requires it we may have to share the relevant information.',
        ],
      },
      {
        id: 'keep',
        h: 'How long we keep it',
        body: [
          {
            list: [
              'Briefs and call records: two years. Then they are deleted automatically.',
              'Site statistics: thirteen months. A visit linked to a brief or a call stays with it and is deleted with it.',
              'Server security logs: thirty days.',
              'Email correspondence: for as long as we work together and afterwards as long as the law requires.',
            ],
          },
        ],
      },
      {
        id: 'rights',
        h: 'Your rights',
        body: [
          'You can ask what we hold about you · ask us to correct or delete it · or object to its processing. Your rights and how to apply are in the KVKK notice.',
          'You can see today’s record of your visit at the top of this page and delete it right away.',
        ],
      },
      { id: 'changes', h: 'Changes', body: ['If we change this text we update the date at the top.'] },
      { id: 'contact', h: 'Reach us', body: ['Write to {email} with any question or request. We answer within thirty days at the latest.'] },
    ],
  },
  kvkk: {
    kick: 'KVKK',
    title: 'Personal data notice.',
    lede: 'Under Article 10 of the Turkish Personal Data Protection Law No. 6698 (KVKK) this is how we process your personal data.',
    short: ['Data controller: {controller}', 'Your data is kept on a server in Germany.', 'To apply: {email}'],
    sections: [
      { id: 'controller', h: 'Data controller', body: ['Your personal data is processed by {controller} (Lost Comma) as the data controller.', 'Address: {address}', 'Email: {email}'] },
      {
        id: 'data',
        h: 'Personal data we process',
        body: [
          {
            list: [
              'Identity: name and surname.',
              'Contact: email address.',
              'Customer transactions: the content of a brief · services picked · timing and budget · the topic and note of a call · its time and time zone.',
              'Transaction security: IP address · browser details · server logs.',
              'Website use: pages visited · time on a page · clicks · the referring site · country and city · device · browser · language. These are anonymous. Once linked to a brief or a call record they count as personal data.',
            ],
          },
        ],
      },
      {
        id: 'purposes',
        h: 'Purposes',
        body: [
          {
            list: [
              'Receiving and answering your request · preparing a proposal.',
              'Planning · confirming · reminding of and cancelling a call.',
              'Starting and running a working relationship.',
              'Keeping information secure and preventing abuse.',
              'Improving the website.',
              'Giving legally required information to competent authorities.',
            ],
          },
        ],
      },
      {
        id: 'grounds',
        h: 'Legal grounds',
        body: [
          {
            list: [
              'Directly related to making or performing a contract (KVKK Art. 5/2-c): brief and call details.',
              'Fulfilling a legal obligation of the controller (Art. 5/2-ç): legal retention and notifications.',
              'The legitimate interest of the controller without harming your fundamental rights and freedoms (Art. 5/2-f): information security · site statistics · linking a visit to a brief or call record.',
            ],
          },
        ],
      },
      { id: 'method', h: 'How we collect it', body: ['Your personal data is collected electronically by automated or partly automated means through the forms on our website · email and the information your browser sends to the server.'] },
      {
        id: 'transfer',
        h: 'Transfers',
        body: [
          'Within Türkiye: to legally authorised public institutions upon request and within legal limits.',
          'Abroad: to Hetzner Online GmbH (Germany) which hosts the website and its database and to {mail} which provides our email. These transfers are made under Article 9 of KVKK with the standard contractual clauses announced by the Personal Data Protection Board.',
        ],
      },
      {
        id: 'retention',
        h: 'How long we keep it',
        body: [
          {
            list: [
              'Brief and call records: two years.',
              'Site statistics: thirteen months. A visit linked to a record stays with that record.',
              'Server security logs: thirty days.',
              'Email correspondence: for the duration of the working relationship and as long as the law requires.',
            ],
          },
          'When the time is up the data is deleted or made anonymous.',
        ],
      },
      {
        id: 'rights',
        h: 'Your rights (KVKK Art. 11)',
        body: [
          {
            list: [
              'To learn whether your personal data is processed.',
              'To request information about it if so.',
              'To learn the purpose of processing and whether it is used accordingly.',
              'To know the third parties it is transferred to in Türkiye or abroad.',
              'To ask for correction if it is incomplete or wrong.',
              'To ask for deletion or destruction under the conditions of the law.',
              'To ask that corrections · deletions and destructions are passed on to the third parties it was transferred to.',
              'To object to a result against you that comes from analysis by automated systems alone.',
              'To claim compensation for damage caused by unlawful processing.',
            ],
          },
        ],
      },
      {
        id: 'apply',
        h: 'How to apply',
        body: [
          'To use your rights write to {email} in line with the Communiqué on the Procedures and Principles of Application to the Data Controller: in writing · by registered electronic mail (KEP) · with a secure electronic or mobile signature · or from the email address you gave us before and that is on record with us.',
          'Please include your name and surname · your Turkish ID number (or nationality and passport number if you are not a Turkish citizen) · an address or email for our reply and your request. A written application also needs your signature.',
          'We answer free of charge within thirty days at the latest. If the request needs extra cost the fee set by the Board may apply.',
        ],
      },
    ],
  },
  cookies: {
    kick: 'Cookies',
    title: 'Cookies.',
    lede: 'Short answer: no advertising or tracking cookies. The long answer is below.',
    short: ['No tracking or advertising cookies.', 'Our statistics work without cookies.', 'Our only cookie remembers your language.', 'See and delete what we keep in your browser right here.'],
    sections: [
      {
        id: 'ours',
        h: 'The cookies we use',
        body: [
          {
            table: {
              head: ['Name', 'What it does', 'How long'],
              rows: [
                ['lang', 'Remembers the language you picked. Only set when you switch language.', 'One year'],
                ['lc_panel', 'The session for the studio’s admin panel. Never set for visitors.', 'Up to fourteen days'],
                ['lc_panel_step', 'The second step of the panel’s two-step sign in. Never set for visitors.', 'Five minutes'],
              ],
            },
          },
        ],
      },
      {
        id: 'local',
        h: 'What we keep in your browser',
        body: [
          'These are not cookies. They live in your browser’s local storage and are never sent to us.',
          {
            table: {
              head: ['Name', 'What it does', 'How long'],
              rows: [
                ['lc-comma', 'Remembers that you found the comma hidden on the homepage.', 'Until you delete it'],
                ['lc-saved-notes', 'The notes you saved on the Notes page.', 'Until you delete it'],
                ['lc-stats-off', 'Remembers that you asked us not to count you.', 'Until you delete it'],
              ],
            },
          },
        ],
      },
      { id: 'others', h: 'Cookies from other sites', body: ['None. Our fonts · images and code come from our own server. Our pages carry no tools · ads or embedded videos from other sites.'] },
      { id: 'consent', h: 'Why we do not ask for consent', body: ['Our only cookie remembers something you asked for (your language). What we keep in your browser is the result of something you did. With no tracking or advertising cookies there is nothing to consent to.'] },
      { id: 'delete', h: 'How to delete them', body: ['Delete them one by one in the list at the top of this page. You can also clear all data for this site in your browser’s settings.'] },
    ],
  },
};

export const LEGAL: Record<Lang, Record<LegalKey, LegalDoc>> = { tr: TR, en: EN };
