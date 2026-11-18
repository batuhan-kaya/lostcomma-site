# Lost Comma sitesi · yapım planı

Tasarım kaynağı: [Lost Comma — Pages panosu](https://claude.ai/artifact/JxLVX6BbRNJbHrZDXka4RS) (13 sayfa) ve onaylı ana sayfa "Live" tasarımı.

Her aşama aynı şekilde kapanır: kod + testler yeşil + iki dilde ekran görüntüleri → Batuhan'ın onayı → bir sonraki aşama. Onay olmadan sonraki aşamaya geçilmez.

0. aşama `main` dalına ilk commit olarak girer. Sonraki her aşama kendi dalında (`phase-1-cursors` gibi) bir pull request olarak gelir. Onay = PR'ın birleştirilmesi.

## Teknoloji

| Katman | Seçim |
|---|---|
| Sunucu | Node 22 · Fastify 5 · TypeScript |
| HTML | Sunucuda üretilir (`html` etiketli şablon · otomatik kaçış). JS olmadan da içerik okunur. |
| İstemci | Sayfa başına küçük TS modülleri · esbuild ile paketlenir · hash'li dosya adları |
| Dil | Türkçe kaynak metin `t('…')` · İngilizce katalog `i18n/en.json` · acorn ile çıkarma ve kontrol |
| Veri | PostgreSQL 18 · Drizzle · testlerde ve Docker'sız geliştirmede PGlite (WebAssembly'ye derlenmiş gerçek Postgres) |
| İçerik | markdown-it (Notes) · sharp + fontkit + wawoff2 (OG görselleri kendi fontlarımızla) |
| Görsel | sharp · her görsel AVIF ve WebP olarak 320 ile 2560 px arası altı genişlikte · içerik hash'li adres · bir yıl önbellek |
| Formlar | zod şemaları · sunucu ve istemci aynı şemayı kullanır |
| Panel | Tek kullanıcı (Batuhan) · klasik şifre · şifre hash'lenerek saklanır · oturum çerezi · deneme sınırı |
| Test | vitest (birim + Fastify inject) · Playwright (e2e) · axe (erişilebilirlik) |
| Yayın | Docker Compose · Caddy · sunucudaki diğer siteler etkilenmez |
| Font | Anybody · Geist · Martian Mono (OFL) · woff2 olarak kendi sunucumuzdan · Google Fonts yok |

## Adresler

`/` dil tercihine göre `/tr` ya da `/en` adresine yönlenir (önce çerez sonra tarayıcı dili). `x-default` = `/en`.

| Sayfa | TR | EN |
|---|---|---|
| Ana sayfa | `/tr` | `/en` |
| İşler | `/tr/isler` | `/en/work` |
| Vaka | `/tr/isler/:slug` | `/en/work/:slug` |
| Hizmetler | `/tr/hizmetler` | `/en/services` |
| Hizmet detayı | `/tr/hizmetler/:slug` | `/en/services/:slug` |
| Süreç | `/tr/surec` | `/en/process` |
| Stüdyo | `/tr/studyo` | `/en/studio` |
| Notes | `/tr/notes` | `/en/notes` |
| Not | `/tr/notes/:slug` | `/en/notes/:slug` |
| Lab | `/tr/lab` | `/en/lab` |
| Proje başlat | `/tr/basla` | `/en/start` |
| Şimdi | `/tr/simdi` | `/en/now` |
| Araçlar | `/tr/araclar` | `/en/uses` |
| RSS | `/tr/notes/rss.xml` | `/en/notes/rss.xml` |
| Panel | `/panel` | |

## Aşamalar

| # | Aşama | Çıktı | Durum |
|---|---|---|---|
| 0 | Temel | Sunucu · dil sistemi · adresler · fontlar · header ve footer · test altyapısı · Docker · CI | Bitti |
| 1 | Ortak etkileşim katmanı | İmleç motoru (hero'da ekip · aşağıda tek ev sahibi) · roll etiketleri · next band · azaltılmış hareket · dokunmatik davranış | Bitti |
| 2 | Ana sayfa | "Live" tasarımı + iletişim bölümü · mobil düzen | Bitti |
| 3 | Veri katmanı | Drizzle şeması · migration · seed · içerik modeli · görsel hattı (sharp · AVIF ve WebP · srcset) · briefler veritabanına | Bitti |
| 4 | Work + Case | Layers paneli · vaka sayfası sürüm geçmişi | Bitti |
| 5 | Services + hizmet detayları | Araç seç ve çiz · Web siteleri (yeniden boyutlanan çerçeve) · Uygulamalar (başparmak alanı) · Kimlik (favicon'dan reklam panosuna) · Hareket (eğri düzenleyici ve makara) | Bitti |
| 6 | Process + Studio | Kurgu masası zaman çizelgesi · haftalık ritim · ayarlar penceresi · vapurlu İstanbul haritası · sakin renk ve yoğunluk | Bitti |
| 7 | Notes + Note | Bul ve blame · yay oyun alanı · RSS · OG görselleri | Bitti |
| 8 | Lab | Canlı örnekler · ekran dışında duraklatma · performans bütçesi · döngü videoları (karar: hazır dosya · sunucu kontrol eder ve sunar) | Bitti |
| 9 | Start | Ofis saatleri · saat dilimi · randevu · form · bildirim (outbox · SMTP · takvim daveti) | Bitti |
| 10 | 404 (Now + Uses kararı bekliyor) | Site haritası olarak 404: en yakın sayfa harf farkıyla · ⌘Z şakası | Bitti |
| 11 | Panel | Şifreyle giriş (tek kullanıcı · iki adımlı doğrulama) · içerik ve görsel yönetimi · gelen kutusu · görüşmeler · e-postalar · site ayarları · yönlendirmeler · denetim kaydı ve geri alma | Bitti |
| 12 | Sertleştirme | **12a:** imleç motoru · animasyonlar · bütün ekran genişlikleri · dokunma hedefleri · yazı boyları · yüklenirken kayma (300 ölçüm · kalıcı testler) · **12b:** SEO · erişilebilirlik turu · çapraz tarayıcı | 12a onay bekliyor |
| 13 | İstatistik ve yasal sayfalar | Çerezsiz anonim istatistik (panelde canlı · özet · ziyaret akışı · tıklama haritası · brief ve görüşmenin "nasıl geldi" izi) · Gizlilik · KVKK aydınlatma metni · Çerezler (iki dil) · saklama süreleri | Bitti |
| 14 | Footer ve logo | Her sayfada aynı footer (çağrı · site haritası · çizilerek gelen logo ve isim · yasal · dil · başa dön) · logo her yerde (header · panel · paylaşım görselleri · favicon · telefon ikonları · RSS · arama verisi) · sosyal hesaplar panelden · Codespaces önizlemesinde panel ve formlar | Bitti |
| 15 | Preloader | Kayıp virgül aranıyor (beş fikirden Batuhan'ın seçtiği 1. fikir): sadece dışarıdan gelene · yaklaşık 3,4 sn (her adım okunabilsin · yollar tek kavis) · tıklayınca geçilir · hareket azaltmada ve JS yokken hiç yok · logo header'daki yerine iner · ekip imleçleri yumuşak kalkıyor ve her ekranda (60 · 120 · 144 Hz) aynı hızda akıyor | Bitti |
| 15a | Canlı imleçler · footer · preloader düzeltmeleri | İmleçler el gibi hareket ediyor (kavisli yol · ıskalayıp düzeltme · herkesin kendi huyu · dururken gerçekten duruyor · arada fareyi oynatıyor · ziyaretçinin imlecine yol veriyor) · turuncu virgül yumurtası iptal · footer büyük logo yerine sakin bir kapanış (logo · ekip · İstanbul saati) · preloader'da herkes ekran dışından giriyor ve logo yeri iniş anına kadar boş · ana sayfa metin önerileri (ayrı onay) · panelde **Metinler** bölümü (bütün cümleler ve ana sayfa içeriği kod açmadan değişir) · ana sayfadaki sosyal bağlantılar Site ayarları'ndan | Bitti |
| 16 | İletişim | Ana sayfadaki iletişim tek cümle oldu (1. turdaki 3. seçenek): ad · konu · e-posta boşlukları cümlenin içinde · fiyat · tarih · hizmet seçimi yok · seçili boşlukta tasarım aracının seçim kutusu · konu boşluğu sırayla fikir önerir · gönderince cümle teşekküre döner · JS yokken de form · zemin süt (mavi fazla patlıyordu) | Bitti |
| 16a | Ne yapıyoruz · gerçek ürünler | Ana sayfadaki hizmet çerçevesi beş gerçekçi ve hareketli ürün ekranı: Lodos web sitesi (kaydırma · filo · rezervasyon) · Pocket iOS uygulaması (para gönderme akışı) · Clay marka kitabı · hareket editöründe logo animasyonu · otomasyon iş akışı ve çalışma kaydı · yeni sekme Otomasyon & entegrasyon | Onay bekliyor |
| 16b | Web ve mobil · profesyonel seviye | Lodos tam sayfa (canlı rüzgâr · arama çubuğu · rakamlar · filo kartları · kaptanlı rezervasyon · altbilgi · ekran koordinatında imleç) · Pocket (dikişsiz kart · ortalamalı grafik · ikonlu hareketler · IBAN satırı · hızlı tutarlar · makbuz) · maketlere isteğe bağlı fotoğraf yuvaları (`npm run mock`) | Onay bekliyor |
| 16c | Web ve mobil · ziyaretçinin elinde | Fare çerçevenin üstüne gelince (ya da dokununca) hikâye olduğu yerde durur ve ürün çalışır: Lodos kayar (imleç bir an durunca · sayfa kaydırması asla takılmaz) · kartlar · filtreler · takvim · saat · rezervasyon · bülten · Pocket baştan sona para gönderir (tuş takımı ya da klavye · makbuz · liste ve bakiye güncellenir) · on saniye sonra döngü baştan · çerçeve altında canlı ipucu · telefonda dokununca tam ekran (Lodos kendi mobil sitesi olur · Pocket telefon boyutunda) · iPhone'un yanında Pocket'ın Android sürümü (ikinci çalışma alanı · eşzamanlı hikâye · o da dokunulabilir) | Onay bekliyor |
| 16d | Hizmetler ve iletişim · ince ayar | Otomasyon çerçevesi soldaki listenin bittiği yerde biter (dile ve genişliğe göre ölçülür) · içi on beş adım ve beş grup (hata yolu · CRM dalı · ödeme dalı · paralel bildirim · sonrası için şerit · çıktı paneli · not · mini harita · adım çubuklarını çizen iz) · telefon etiketleri iOS ve Android · para gönderdikten sonra ana ekran sola kayık kalmıyor · iletişim cümlesinde boşluk ilk harfle yumuşakça yazının boyuna iner | Onay bekliyor |
| 16e | Hizmet çerçeveleri alanı doldurur | Web · Kimlik · Hareket · Otomasyon kendi satırları açıkken soldaki listenin bittiği yerde biter · Lodos daha uzun bir görünümle · Kimlik'te Batuhan'ın gönderdiği Clay panosu (fotoğraf yuvası · üzerinden geçen seçim) · Hareket'te tam bir editör (proje · önizleme · ölçerler · grafik · efekt kontrolleri · on beş katman ve ses · render kuyruğu) | Onay bekliyor |
| 16f | Süreç · katman katman | Ana sayfanın 05 bölümü yeniden: tek bir projenin (Clay'in sitesi) beş adımı izometrik bir yığında beş kâğıt · en altta Dinle (araştırma duvarı) · Eskiz (kalem) · Prototip (tel kafes · bağlantı · imleç) · Geliştirme (renkli tasarım ve geliştirici katmanı: ızgara · ölçüler · seçim · kod) · en üstte Yayın (tarayıcıda canlı site · yükselen üç sayı) · bir adım seçilince üstündeki kâğıtlar aydinger gibi kalkar · notu kendi kâğıdının köşesine bir çizgiyle bağlı açılır (ne yapıyoruz · süre · sana kalan · masada kim) · her kâğıdın açılırken kendi küçük anı · dar ekranda yığın üstte ve adımlar liste · Süreç sayfasına bağlantı | Onay bekliyor |
| 16g | Süreç kâğıtları gerçek gibi | 1. adım Planla (metni ve sana kalanı da) · Planla kâğıdı bir planlama panosu (hedefler · site haritası · adımların kendi adlarıyla on haftalık takvim · brief · alıntı · yorum · imleç) · Eskiz sarmal bir defter (iki varyasyon · biri seçili · mobil · bir kurşun kalem) · Prototip bir tasarım aracının prototip görünümü (üç telefon · bağlantılar · etkileşim paneli) · Geliştirme gerçek bir editör: kod kendini yazar · önizleme yenilenir · terminal testleri çalıştırır · Yayın Clay'in gerçekçi sitesi: Batuhan'ın panosundan kırpılan fotoğraflar · logo ve serif başlık | Onay bekliyor |
| 16h | Süreç · fonra | Örnek proje fonra oldu (bir ses ve hareket stüdyosu): Yayın kâğıdı Batuhan'ın gönderdiği ana sayfa görseli (koyu tarayıcı · virgülü silindi) · Planla fonra'nın hedefleri · site haritası (Deneyler · Stüdyo · Arşiv · İletişim) · ruh hali kartı · Eskiz bu sayfanın kalem taslağı (dev başlık · dalga · frekans cetveli) · Prototip koyu telefonlarda cetveli sürükleyince 330 Hz'e yaylı geçiş · Geliştirme Wave ve Ruler'ı yazan kod · önizlemede canlı sayfa ve dalganın ayarları | Onay bekliyor |
| 17 | Sayfa geçişleri | 91.99.4.44'teki sitenin geçişinin aynısı (kodu Batuhan'dan gelecek) | Kod bekliyor |
| 18 | Yayın | Staging · Compose + Caddy · yedekleme · izleme · `GEOIP_DB` (DB-IP Lite şehir · ayda bir güncelleme) · sunucu günlükleri 30 gün (gizlilik metni böyle söylüyor) | |

Taslaklar sadece 1440 px masaüstü. Her sayfa aşamasında 1024 · 768 · 390 px düzenleri de önerilir ve ekran görüntüsüyle onaya sunulur.

## Her aşamanın bitti tanımı

1. `npm run typecheck` temiz
2. `npm run i18n -- --check` · her Türkçe metnin İngilizcesi var · kullanılmayan çeviri yok
3. `npm test` · birim ve route testleri yeşil
4. `npm run test:e2e` · her sayfa iki dilde ve üç genişlikte:
   - konsol hatası yok
   - axe ciddi ve kritik ihlal yok
   - görünen metinde virgül yok (virgül sadece egg olarak)
   - yatay kaydırma yok
   - `prefers-reduced-motion` ile de çalışıyor
5. Taslakla yan yana ekran görüntüsü karşılaştırması
6. Commit + push · kısa özet

## Görseller

Gerçek görsel gelmesi gereken her yer `docs/GORSELLER.md` dosyasında tutulur ve her aşamada güncellenir. Proje sonunda tam liste teslim edilir.

## Batuhan'dan gelecekler (ilgili aşamaya kadar)

- GitHub reposu (0. aşama sonu)
- Gerçek içerik: projeler · ekip adları · fiyatlar · köşeli parantezli tüm yer tutucular (2. aşamadan itibaren)
- Hizmet ve bakım planı fiyatları ([FİYAT] · 5. aşamadan itibaren sayfalarda yer tutucu)
- Ekip adları · rolleri · portreler ve stüdyo adresi (6. aşamadan itibaren Stüdyo'da yer tutucu)
- Bütün sayfalar için renk turu (Batuhan'ın isteğiyle sonraya bırakıldı)
- E-posta gönderimi için SMTP sağlayıcısı (9. aşama)
- Panel şifresi: ilk girişte Batuhan kendisi belirler · sunucuda sadece hash'i durur (11. aşama)
- Sunucudaki mevcut ters vekil düzeni: Caddy ortak mı · ağ adı · port (18. aşama)
- Veri sorumlusunun adı ve adresi · başvuru e-postası · e-posta servisinin adı (13. aşama · panelde Site ayarları · Yasal sayfalar)
- Yayından önce: Hetzner ve e-posta servisiyle KVKK standart sözleşmesi · imzadan sonra beş iş günü içinde Kurul'a bildirim (yurt dışı aktarım · 13. aşama metinleri buna dayanıyor)
- Sayfa geçişinin kodu (91.99.4.44 · 17. aşama)
- Sosyal hesap adresleri (panelde Site ayarları · Sosyal hesaplar · boş olan footer'da görünmez)
