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
| 8 | Lab | Canlı örnekler · ekran dışında duraklatma · performans bütçesi · döngü videoları (karar: hazır dosya · sunucu kontrol eder ve sunar) | |
| 9 | Start | Ofis saatleri · saat dilimi · randevu · form · bildirim | |
| 10 | Now + Uses + 404 | Duvar takvimi · klavye · geri al | |
| 11 | Panel | Şifreyle giriş (tek kullanıcı) · içerik ve görsel yönetimi · denetim kaydı | |
| 12 | Sertleştirme | SEO · performans · erişilebilirlik · çapraz tarayıcı | |
| 13 | Yayın | Staging · Compose + Caddy · yedekleme · izleme | |

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
- Sunucudaki mevcut ters vekil düzeni: Caddy ortak mı · ağ adı · port (13. aşama)
