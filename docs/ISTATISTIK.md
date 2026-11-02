# İstatistik · plan ve kullanım (13. aşama)

Siteye kimin girdiğini · nereden geldiğini · neye tıkladığını · ne kadar kaldığını panelden görmek için. Başka bir servise veri gitmez: ölçüm de rapor da bizim sunucumuzda.

## Kararlar (Batuhan · 1 Kasım)

- **Çerezsiz ve anonim.** Onay kutusu yok. Ziyaretçinin cihazına hiçbir şey yazılmaz. Aynı kişi ertesi gün gelirse yeni biri sayılır.
- **Müşteri izi açık.** Brief gönderen ya da görüşme alan kişinin o ziyaretteki yolu panelde kaydının yanında görünür. KVKK metninde açıkça yazılır.
- **Veri sorumlusu:** şirket kurulana kadar panelden girilen ad (boşsa yer tutucu).
- **Sunucu:** Almanya (Hetzner). KVKK metninde yurt dışına aktarım bölümü var.

## 1. Ne ölçülür

| Ne | Nasıl | Panelde |
|---|---|---|
| Sayfa görüntüleme | Sayfa açılınca | Sayfalar · giriş ve çıkış sayfaları |
| Kalma süresi | Sekme görünürken geçen süre (arka planda saymaz · bir sayfada en çok 30 dk) | Ortalama süre · ziyaret akışı |
| Kaydırma | Sayfanın yüzde kaçını gördü | Sayfa başına okuma derinliği |
| Tıklamalar | Bağlantılar ve düğmeler: etiketi · gittiği yer · sayfadaki konumu | En çok tıklananlar · tıklama haritası · dışarı giden bağlantılar |
| Olaylar | Brief gönderildi · görüşme alındı · dil değişti · virgül bulundu · çizim tahtası · oyun alanı | Dönüşüm · olay listesi |
| Kaynak | Geldiği site (sadece alan adı ve yol) · `utm_` etiketleri | Kaynaklar · kampanyalar |
| Konum | Ülke (saat dilimi ya da IP veritabanı) · şehir (sadece IP veritabanı varsa) | Ülkeler ve şehirler |
| Cihaz | Telefon · tablet · masaüstü · işletim sistemi · tarayıcı · dil | Cihazlar |

**Hiçbir zaman toplanmayanlar:** IP adresi (sadece o an konum ve günlük kimlik için kullanılır · yazılmaz) · formlara yazılan metin · çerez · parmak izi · tam yönlendiren adres (sorgu kısmı atılır).

## 2. Nasıl çalışır

- **İstemci** (`src/client/lib/stats.ts` · 2 kB altı): sayfa görüntülemesini · tıklamaları · görünür süreyi · kaydırmayı biriktirir. Sayfadan çıkarken (ya da sekme arka plana geçince) hepsini tek bir `sendBeacon` ile `/api/stats`'a yollar. Animasyon döngüsü yok · kaydırma dinleyicisi pasif.
- **Günlük kimlik:** sunucu `sha256(günün tuzu + IP + tarayıcı + site)` hesaplar. Tuz her gün yenilenir ve eskisi silinir: dünkü kayıtları bir kişiye geri bağlamak imkânsız olur. 30 dakika hareketsizlik yeni bir ziyaret başlatır.
- **Sayılmayanlar:** botlar ve otomasyonlar · `Do Not Track` ya da `Global Privacy Control` açık tarayıcılar · panelden "Bu tarayıcıyı sayma" denmiş cihazlar · sitenin kendi önizleme çerçeveleri · JS kapalı ziyaretler.
- **Konum:** önce `GEOIP_DB` (DB-IP Lite şehir veritabanı · ücretsiz · CC BY 4.0 · gizlilik sayfasında kaynak gösterilir). Yoksa tarayıcının saat diliminden ülke.
- **Müşteri izi:** brief ya da görüşme geldiğinde sunucu aynı günlük kimlikle o anki ziyareti bulur ve kayda bağlar. Brief silinirse bağ da kalkar.
- **Saklama:** ziyaret kayıtları 13 ay · sonra silinir (`STATS_DAYS`). Brief'e bağlı ziyaret brief durdukça durur.

## 3. Panelde "İstatistik"

- **Üst şerit:** dönem (bugün · 7 gün · 30 gün · 90 gün · 12 ay) · önceki dönemle fark.
- **Şu an sitede:** son 5 dakikada hareket eden ziyaretler: hangi sayfada · nereden · hangi cihaz. JS ile 15 saniyede bir yenilenir.
- **Özet:** ziyaret · ziyaretçi (günlük tekil) · sayfa görüntüleme · ortalama süre · tek sayfada çıkanlar · brief ve görüşme sayısı.
- **Grafik:** günlere göre ziyaret ve görüntüleme (sunucuda çizilen SVG).
- **Tablolar:** sayfalar · giriş sayfaları · kaynaklar · kampanyalar · ülkeler ve şehirler · cihazlar · tarayıcılar · diller · tıklananlar · dışarı giden bağlantılar · olaylar.
- **Huniler:** Ana sayfa → Başla → görüşme · herhangi bir sayfa → brief.
- **Ziyaretler:** liste ve ayrıntı. Ayrıntı bir zaman çizelgesi: hangi sayfa · ne kadar · ne kadar kaydırdı · nereye tıkladı · sırasıyla. Brief ya da görüşmeye dönmüşse kaydına bağlantı.
- **Sayfa ayrıntısı ve tıklama haritası:** sayfanın kendisi panelde bir çerçevede (telefon · tablet · masaüstü genişliğinde) · üstünde tıklamalar nokta olarak.
- **Gelen kutusu ve Görüşmeler:** her kaydın yanında "Nasıl geldi": kaynak · sayfalar · süre.
- **Bu tarayıcıyı sayma:** senin kendi ziyaretlerin istatistiği bozmasın.

## 4. Siteye etkisi

- Gizlilik sayfasında **"Senin kaydın"**: bu ziyarette ne tuttuğumuzu canlı gösterir · "Bu kaydı sil" ve "Beni sayma" düğmeleri.
- KVKK ve gizlilik metinleri bu planı birebir anlatır.
- Güvenlik başlığı `frame-ancestors 'self'` olur: sitenin sayfaları sadece kendi panelimizin çerçevesinde açılabilir (tıklama haritası için).

## 5. Veri modeli (`drizzle/0005_stats.sql`)

- `stats_salts`: gün → tuz (sadece bugünün ve dünün tuzu durur).
- `stats_visits`: kimlik · günlük ziyaretçi özeti · başlangıç ve son hareket · giriş ve çıkış sayfası · kaynak · utm · ülke · şehir · cihaz · işletim sistemi · tarayıcı · dil · saat dilimi · sayfa sayısı · toplam süre.
- `stats_views`: ziyaret · adres · sayfa türü · dil · zaman · süre · kaydırma · ekran genişliği.
- `stats_events`: ziyaret · görüntüleme · zaman · tür (tıklama · dış bağlantı · olay) · ad · hedef · konum (genişliğe göre binde · sayfada piksel).
- `briefs.visit_id` · `bookings.visit_id`: müşteri izi.

## 6. Güvenlik ve bütçe

- `/api/stats` sadece kendi sitemizden gelen isteği kabul eder · IP başına dakikada 120 istek · gövde en çok 16 kB · alanlar zod ile doğrulanır · adresler ve etiketler kısaltılır.
- Panel ekranları aynı CSP ile · sadece giriş yapmış kullanıcı.
- E2E testi izleyicinin sayfa JS bütçesine 2 kB'tan fazla eklemediğini kontrol eder.

## 7. Test

- Birim ve rota: günlük kimlik ve tuz değişimi · 30 dakika kuralı · bot ve DNT süzgeci · doğrulama · kaynak ve utm ayrıştırma · saat diliminden ülke · panel sorguları · müşteri izi bağlantısı · "kaydımı sil" · saklama süresi.
- Tarayıcı: sayfaları gezen bir ziyaretçi panelde görünür (sayfalar · tıklamalar · süre) · brief gönderen kişinin izi gelen kutusunda · gizlilik sayfası kaydı gösterir ve siler · "Bu tarayıcıyı sayma" çalışır · panel ekranları axe temiz.

## 8. Sonraya kalanlar

- Kaydırma haritası (tıklama haritası gibi ama okunan yer).
- Haftalık e-posta özeti.
