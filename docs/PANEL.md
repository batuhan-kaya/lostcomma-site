# Panel · plan ve kullanım (11. aşama)

## İlk giriş

1. Bir şifre koy. Sunucuda:
   ```
   docker compose exec web node dist/server/cli.js panel password
   ```
   Yerelde: `npm run panel -- password`. İki kez sorar · ekrana yazmaz. En az 12 karakter. Bir cümle iyi bir şifredir.
   İstersen ilk açılışta `PANEL_PASSWORD` ortam değişkeni de olur. Şifre konunca onu sil.
2. `https://lostcomma.co/panel` adresine git ve gir.
3. Pano'daki **Yayına hazırlık** listesinden başla: her satır eksik olanı söyler ve tıklayınca oraya götürür.
4. Önerilir: **Hesap → İki adımlı doğrulama**.

Telefon kaybolursa: `node dist/server/cli.js panel totp off`. Her yerden çıkış: `… panel signout`.

Sitenin bütün içeriğini kod açmadan yönetmek için tek kişilik bir yönetim ekranı. Adres: `/panel`. Arayüz Türkçe. Telefonda da çalışır (gelen brief ve görüşmelere bakmak için).

## 1. Giriş ve güvenlik

- **Tek kullanıcı · şifre.**
  - Şifre ilk kez üç yoldan biriyle konur:
    - `npm run panel -- password` (sunucuda: `node dist/server/cli.js panel password`)
    - ya da ilk açılışta `PANEL_PASSWORD` ortam değişkeni. Sonra silinmesi önerilir.
  - Şifre panelde de değiştirilebilir (eski şifre sorulur).
  - En az 12 karakter.
  - Saklama: scrypt (tuz + yavaş özet) · karşılaştırma sabit zamanlı.
- **İki adımlı doğrulama (isteğe bağlı).**
  - Ayarlardan açılır: QR kod ya da elle girilen anahtar · 6 haneli kod (TOTP · Google Authenticator · 1Password · Authy).
  - Aynı kod iki kez kullanılamaz.
  - Telefon kaybolursa sunucuda `npm run panel -- totp off`.
- **Oturum.**
  - Rastgele 32 baytlık anahtar. Veritabanında sadece özeti tutulur.
  - Çerez: HttpOnly · SameSite=Strict · HTTPS'te Secure · sadece `/panel` yolunda.
  - 24 saat hareketsizlikte biter · en fazla 14 gün.
  - "Diğer bütün oturumları kapat" düğmesi.
  - Açık oturumlar listelenir (tarayıcı · IP · son görülme).
- **Saldırıya karşı.**
  - Giriş denemesi IP başına 15 dakikada 5.
  - Her başarısız denemede küçük bir bekleme.
  - Bütün denemeler kayda düşer.
- **CSRF.** Her formda oturuma bağlı gizli bir anahtar · ayrıca Origin kontrolü.
- **Arama motorları ve önbellek.** Panel arama motorlarına kapalı (`noindex` · robots.txt) · önbelleğe alınmaz (`no-store`). Aynı sıkı CSP.

## 2. Bölümler

| Bölüm | Ne yapılır |
|---|---|
| **Pano** | Yeni brief'ler · yaklaşan görüşmeler · gönderilemeyen e-postalar · son değişiklikler · **Yayına hazırlık listesi**. Liste, eksik ne varsa söyler ve tıklayınca oraya götürür: fiyatlar · adres · telefon · boş yer ayı · ekip adları ve portreleri · kapaksız projeler · alt metni eksik görseller · köşeli parantezli yer tutucular · e-posta ayarı · iki adımlı doğrulama. |
| **İşler** | Liste (numara · ad · disiplin · durum · panodaki çerçeve · kapak). Yeni proje ve düzenleme: numara (otomatik önerilir) · disiplin · yıl · durum (taslak · yayında · NDA) · ana sayfa panosundaki çerçeve (0–6 · dolu çerçeveyi kimin tuttuğu yazar · istenirse yer değiştirir) · çizim · kapak · döngü videosu · site adresi · iki dilde ad · adres (slug: addan otomatik) · tür · özet · müşteri. **Vaka hikâyesi düzenleyicisi:** tema · süre · ekip · etiketler · baloncuklar · sürüm geçmişi · brief · detay karoları (palet · yazı · görsel · …) · sonuçlar · emek verenler. Hepsi alan alan girilir · arkada aynı doğrulama çalışır · JS yoksa JSON olarak düzenlenir. **Önizleme:** taslak bile olsa gerçek vaka sayfası nasıl görünecekse öyle. |
| **Notlar** | Liste (taslak · zamanlanmış · yayında). Düzenleme: yazar · etiketler · yayın tarihi (boş = taslak · ileri tarih = zamanlanmış) · iki dilde başlık · adres · özet · gövde (markdown). Gövdenin yanında **canlı önizleme** (sitedeki çizimle aynı: kod blokları · yay oyun alanı · şekiller · dipnotlar) · okuma süresi · araç çubuğu (kod · oyun alanı · şekil · dipnot ekle). Tam sayfa önizleme. |
| **Görseller** | Görsel kitaplığı: sürükle bırak ile çoklu yükleme (AVIF ve WebP boyutları otomatik). Her görselin iki dilde alt metni · nerede kullanıldığı (hangi proje kapağı · hangi portre · hangi vaka karosu). Kullanılan görsel silinemez. **Döngü videoları:** MP4 · isteğe bağlı WebM · poster · alt metin. Sunucu kontrol eder ve düzeltilecek bir şey varsa Türkçe söyler. |
| **Ekip** | Üç kişi: ad · kısayol tuşları · portre · iki dilde rol · "genelde" · "şu sıralar" · kısayolun yaptığı · imleç selamı. |
| **Gelen kutusu** | Ana sayfadaki brief formundan gelenler. Durum: yeni · okundu · yanıtlandı · arşiv. Açınca okundu olur. "Yanıtla" e-posta programını konu satırıyla açar. Silme. |
| **Görüşmeler** | Yaklaşan ve geçmiş görüşmeler (İstanbul saati ve kişinin kendi saati) · not · iptal (saat yeniden açılır · istenirse kişiye kendi dilinde iptal e-postası gider). **Kapalı günler ve saatler:** tatil ya da dolu bir öğleden sonra. O saatler Başla sayfasında görünmez ve alınamaz. |
| **E-postalar** | Giden kutusu: gönderildi · bekliyor · gönderilemedi (hatasıyla). Tekrar dene · içeriğini gör. E-posta ayarlı mı · deneme e-postası gönder. |
| **Site ayarları** | Panelden doldurulan yer tutucular: dört hizmetin üçer basamak fiyatı (iki dilde · virgülsüz) · Süreç sayfasındaki iki planın fiyatı · bir sonraki boş yer ayı (İşler sayfası) · stüdyo adresi · telefon. Boş kalan yer tutucu olarak görünmeye devam eder ve yayına hazırlık listesinde çıkar. |
| **Yönlendirmeler** | Bir işin ya da notun adresi değişince eski adres yeni adrese otomatik yönlenir (301 · zincir oluşmaz). Elle eklenebilir ve silinebilir. Kaç kez kullanıldığı görünür. |
| **Kayıt** | Kim · ne · ne zaman · hangi IP: her kayıt · silme · durum değişikliği · giriş. İçerik değişikliklerinde önce ve sonra hali saklanır · iki hal yan yana görülür · **"Bu hale dön"** ile geri alınır (silinen bir iş ya da not da geri getirilebilir). |
| **Hesap** | Şifre değiştir · iki adımlı doğrulama · açık oturumlar · çıkış. |

## 3. Siteye etkisi

- **Ayarlar** sayfalara anında yansır (fiyatlar · ay · adres · telefon). Boş olanlar bugünkü gibi `[FİYAT]` olarak kalır.
- **Kapalı günler ve saatler** Başla sayfasında ve randevu API'sinde uygulanır. Tamamen kapalı bir gün listeden çıkar ve yerine bir sonraki iş günü gelir.
- **Yönlendirmeler** 404'ten önce bakılır.
- **Marka kuralı panelde de geçerli:** Görünen metinlerde virgül varsa kayıt reddedilir ve hangi alanda olduğu söylenir. Notlarda kod blokları hariç.

## 4. Veri modeli (yeni tablolar · `drizzle/0004_panel.sql`)

- `panel_user`: tek satır · şifre özeti · TOTP anahtarı · son kullanılan kod.
- `panel_sessions`: oturum özeti · CSRF anahtarı · IP · tarayıcı · zamanlar.
- `audit`: işlem · varlık · kimlik · özet · önceki ve sonraki hal (jsonb) · IP · zaman.
- `settings`: anahtar → değer (jsonb).
- `closures`: gün · başlangıç ve bitiş saati (boşsa bütün gün) · sebep.
- `redirects`: eski adres → yeni adres · kullanım sayısı.
- `bookings.staff_note`: görüşmeye panelden not.
- `briefs.note`: brief'e panelden not.

## 5. Arayüz

- Sakin kâğıt zemin · mürekkep yazı · tek vurgu rengi lime · Geist ve Martian Mono.
- Masaüstünde solda menü · telefonda üstte menü.
- **Her kayıt formunda:**
  - Altta yapışkan kayıt çubuğu.
  - ⌘S ya da Ctrl+S ile kayıt.
  - Kaydedilmemiş değişiklik varsa sayfadan çıkarken uyarı.
  - Hata olursa en üstte hata özeti. Tıklayınca ilgili alana gider.
- Listelerde "/" ile arama · sıralama · filtre.
- Silmeden önce onay penceresi.
- Kaydedince üstte kısa bir bildirim.
- Bağımlılıklar:
  - **JS olmadan:** her şey normal formlarla çalışır.
  - **JS ile gelenler:** canlı önizleme · görsel seçici · sürükle bırak · hikâye düzenleyicisi · adresin addan dolması.
- Erişilebilirlik: etiketli alanlar · klavye ile her şey · odak halkaları · axe temiz.

## 6. Teknik

- `src/server/panel/`: rotalar · giriş · CSRF · TOTP · kayıt · görünümler.
- `src/client/panel/`: düzenleyiciler.
- `src/styles/pages/panel.css`.
- Yükleme için `@fastify/multipart`, sadece panelde. Görsel 30 MB · video 20 MB.
- `qrcode`: TOTP için QR, sunucuda SVG olarak.
- İyimser kilit: aynı içerik iki sekmede açıksa geç kaydeden uyarılır ve üzerine yazılmaz (`updated_at`).
- Önizleme sitenin kendi sayfa şablonlarını kullanır. Taslak, yayınlanmadan nasıl görüneceğiyle aynı görünür.

## 7. Test

- **Birim ve rota testleri:**
  - şifre özeti · oturum süresi · CSRF · Origin · giriş hız sınırı · TOTP
  - her bölümde ekle · düzenle · sil · doğrulama hataları
  - virgül kuralı · çakışma uyarısı
  - adres değişince yönlendirme
  - kayıt ve geri alma
  - ayarların sayfalara yansıması
  - kapalı günlerin randevuya etkisi
  - yüklemeler
- **Tarayıcı testleri (üç genişlik):**
  - giriş ve çıkış
  - taslak iş oluştur · önizle · yayınla · İşler sayfasında gör
  - görsel yükle · alt metin yaz · kapak yap
  - not yaz · canlı önizleme · yayınla
  - fiyat gir · hizmet sayfasında gör
  - görüşme iptal et
  - bütün panel sayfalarında konsol hatası yok · axe temiz · yatay kaydırma yok

## 8. Sonraya kalanlar

- Birden fazla kullanıcı ve yetki.
- Görsel kırpma.
- Projeleri sürükleyerek sıralama (sıra numaradan gelir).
