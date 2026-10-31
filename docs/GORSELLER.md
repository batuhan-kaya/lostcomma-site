# Görsel listesi

Sitede gerçek görsel (fotoğraf · ekran görüntüsü · video) gelmesi gereken her yer burada. Her aşamada güncellenir. Proje sonunda Batuhan'a bu liste teslim edilir.

Görsel hattı 3. aşamada kuruldu: her görsel sunucuda AVIF ve WebP'ye çevrilir ve 320 · 640 · 960 · 1280 · 1920 · 2560 px genişliklerinde servis edilir (asla büyütülmez). Bu yüzden teslim edilen dosya büyük ve kaliteli olmalı: en az aşağıdaki boyutun iki katı. Kamera ve konum bilgisi otomatik silinir · yan yatmış fotoğraflar düzeltilir.

## Nasıl teslim edilir

- Fotoğraf ve ekran görüntüsü: JPEG · PNG · WebP · AVIF · HEIC (iPhone) · TIFF. SVG kabul edilmez (logo ve ikonlar ayrı yoldan gelir · B9).
- Her görsel için iki kısa açıklama (alt metin): Türkçe ve İngilizce · virgülsüz. Görme engelli ziyaretçiler ekran okuyucuda bunu duyar.
- Dosya adı önemli değil · hangi yere gittiğini bu listedeki numarayla söylemen yeterli (A1 · No. 014 gibi).
- Panel gelene kadar (11. aşama) görselleri ben eklerim: `npm run media -- cover 14 dosya.jpg --alt-tr "…" --alt-en "…"`.
- Video (A6 ve hareket işleri) için ayrı bir hat gerekecek: MP4 ve WebM · poster karesi · sessiz döngü. Hareket vitrini kararıyla birlikte (8. aşama) kurulur.

Durum sütunu: **Hazır** = yer görsel almaya hazır · görsel gelene kadar çizim duruyor · **CSS** = şu an kodla çizilmiş bir illüstrasyon duruyor ve görseli alacak kod henüz yok · **Boş** = henüz yer tutucu · **Gerekmez** = kodla yapılan ve öyle kalacak bir şey.

Panodaki çerçevelerin şekli farklı (yatay ve dikey). Kapak çerçeveye göre kırpılır ve açılan kartta 3:2 görünür: önemli kısım ortada kalsın.

## Ana sayfa (2. aşama)

| # | Yer | Ne lazım | Oran · teslim boyutu | Durum |
|---|---|---|---|---|
| A1 | Pano · 7 proje kapağı + Lab | Panodaki her proje için bir kapak (ekran görüntüsü · ürün fotoğrafı · afiş) · Lab çerçevesi kodla çizili kalabilir | 520×340 → 1040×680 · 300×400 → 600×800 · 340×440 → 680×880 · 460×300 → 920×600 · 540×340 → 1080×680 · 320×420 → 640×840 · 420×300 → 840×600 | Hazır: kapak eklenen proje görseli gösterir · eklenmeyen çizimini |
| A2 | Pano · açılan proje kartı | A1 ile aynı kapak (ayrıca gerekmez) | 3:2 · 1200×800 | Hazır |
| A3 | Hizmetler çerçevesi · Web sitesi | Gerçek bir sitenin masaüstü ekranı | 780×488 → 1560×976 | CSS (LODOS örneği) |
| A4 | Hizmetler çerçevesi · Uygulama | Gerçek bir uygulama ekranı | 282×610 → 564×1220 | CSS |
| A5 | Hizmetler çerçevesi · Kimlik | Logo · yazı · renk sayfası | 520×520 → 1040×1040 | CSS |
| A6 | Hizmetler çerçevesi · Hareket | Kısa döngü video (sessiz · 6 ile 12 sn) + poster | 820×350 → 1640×700 · MP4 + WebM | CSS |
| A7 | Süreç · 5 ekran | İsteğe bağlı: atölye · eskiz · prototip · kod · yayın fotoğrafları | 156×212 → 624×848 | CSS |

## İşler ve vaka sayfaları (4. aşama)

Her projenin kapağı tek bir görsel: ana sayfa panosu · İşler önizlemesi · tuval görünümü · vaka sayfasının hero'su aynı kapağı kullanır ve her yerde kendi şekline göre kırpar. Bu yüzden kapak geniş olsun ve önemli kısım ortada dursun.

| # | Yer | Ne lazım | Oran · teslim boyutu | Durum |
|---|---|---|---|---|
| C1 | Proje kapağı (her proje) | Projenin en iyi tek görseli | 16:9 ya da daha geniş · en az 2720×1120 | Hazır: kapağı olmayan proje çizimini gösterir |
| C2 | Vaka · sürüm geçmişi | Her sürüm için bir ekran: eskiz fotoğrafı · tel çerçeve · tasarım · kodlanmış hal · yayın · uygulama | 16:10 · 1800×1125 | Hazır: görseli olmayan sürüm kapağı gösterir (örnek projede çizili site) |
| C3 | Vaka · detaylar | Yakın plan detaylar (bileşen · ikon · ambalaj · hareket karesi) | Kare ya da 2:1 · 1000×1000 veya 1800×900 | Hazır (görsel karosu) |
| C4 | Vaka · alıntı ve sonuçlar | Müşteriden bir cümle · gerçek sayılar | Metin | Yer tutucu ([X] · [İsim]) |

Renk paleti ve yazı karoları görsel istemez: renk kodları ve font adı yeter.

## Hizmetler ve hizmet detayları (5. aşama)

Bu sayfalardaki etkileşimli parçaların çoğu kodla çiziliyor ve öyle kalacak. Gerçek görsel isteyen yerler:

| # | Yer | Ne lazım | Oran · teslim boyutu | Durum |
|---|---|---|---|---|
| D1 | Hizmetler · çizim tahtası ve dört araç kartı | Görsel gerekmez | | Gerekmez |
| D2 | Web siteleri · yeniden boyutlanan çerçeve | Çerçevedeki site kurgusal bir seramik atölyesi ("kil"). İsteğe bağlı: kase fotoğrafları (1 büyük + 4 ürün) koyarsak çizimlerin yerine geçer | Büyük 5:4 · 1400×1120 · ürünler kare · 800×800 | CSS (çizili kaseler) |
| D3 | Uygulamalar · başparmak alanı | Telefondaki vapur saatleri kodla çiziliyor | | Gerekmez |
| D4 | Kimlik · favicon'dan reklam panosuna | Kurgusal "fırın" markası SVG ile çiziliyor. İsteğe bağlı: gerçek bir müşterinin logosuyla değiştirilebilir (SVG · altı boyut için sürümleri) | SVG | Gerekmez |
| D5 | Hareket · makara | Hareket projelerinden sessiz döngü videoları (her proje için bir tane) + poster karesi | 16:10 · 1280×800 · 6 ile 12 sn · MP4 + WebM | CSS (hareketli çizimler) · video hattı 8. aşamada |
| D6 | Web · Uygulama · Kimlik · "yaptığımız işler" | C1 ile aynı kapak (ayrıca gerekmez) | 16:10'a kırpılır | Hazır |

Fiyatlar görsel değil ama hâlâ yer tutucu: her hizmet sayfasında üç şekil · hizmetler sayfasında dört "başlangıç fiyatı" ([FİYAT] · [PRICE]).

## Süreç ve Stüdyo (6. aşama)

| # | Yer | Ne lazım | Oran · teslim boyutu | Durum |
|---|---|---|---|---|
| E1 | Stüdyo · ekip kartları | Üç portre (tasarım · kod · hareket). Aynı ışık ve aynı fon · omuz hizasından · doğal | 4:3 · 1200×900 | Hazır: portre gelene kadar kartta imleç çizimi duruyor · `npm run media -- portrait design dosya.jpg --alt-tr "…" --alt-en "…"` |
| E2 | Süreç · kurgu masasındaki ekran | Yedi hafta sahnesi kodla çiziliyor | | Gerekmez |
| E3 | Stüdyo · İstanbul haritası ve vapur | SVG ile çiziliyor · vapur İstanbul saatine göre geçiyor | | Gerekmez |

Görsel olmayan yer tutucular: ekip adları ve rolleri ([Name] · veritabanında) · stüdyo adresi ([ADRES]) · yayın sonrası iki planın fiyatı ([FİYAT]).

## Notes ve Not (7. aşama)

| # | Yer | Ne lazım | Oran · teslim boyutu | Durum |
|---|---|---|---|---|
| F1 | Notes · son notun dosya kartı | Notun kendi metninden çizilen küçük harita | | Gerekmez |
| F2 | Not · yay oyun alanı ve şekil | Kodla çiziliyor | | Gerekmez |
| F3 | Paylaşım görselleri (OG) · bütün sayfalar | Sunucu kendi fontlarımızla çiziyor | 1200×630 | Hazır · görsel gerekmez |
| F4 | Not içi görseller | Panel (11. aşama) gelince yazının içine görsel eklenebilecek | 16:10 · 1600×1000 | Şimdilik kapalı |

Örnek notların metinleri bu sitenin gerçekte nasıl yapıldığını anlatıyor ama yer tutucu: panel gelince kendi notlarınla değiştirilecek. Yazar adları hâlâ [Name].

## Sonraki aşamalarda gelecekler (taslaklardan)

| # | Sayfa | Ne lazım | Not |
|---|---|---|---|
| B7 | Lab | Canlı örnekler kodla çiziliyor | Gerekmez · hareket vitrini kararına bağlı (8. aşama) |
| B8 | Araçlar | Donanım fotoğrafları (bilgisayar · kulaklık · monitör) | İsteğe bağlı |
| B9 | Marka | Son logo · favicon · apple-touch-icon (180) · PWA ikonları (192 · 512) | Şu an geçici imleç ikonu |
