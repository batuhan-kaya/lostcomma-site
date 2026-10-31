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

## Sonraki aşamalarda gelecekler (taslaklardan)

| # | Sayfa | Ne lazım | Not |
|---|---|---|---|
| B1 | İşler | 14 projenin kapak görseli (Katmanlar paneli önizlemesi) | A1 ile aynı görseller kullanılabilir |
| B2 | Vaka sayfası | Her vaka için: hero görseli · eskiz · wireframe · son ekranlar · telefon ekranları · sonuç görselleri | Proje başına 6 ile 12 görsel |
| B3 | Hizmet detayı · Web siteleri | Yeniden boyutlanan çerçevedeki örnek site | Şu an "kil" seramik sitesi örneği |
| B4 | Hizmet detayı · Uygulamalar · Kimlik · Hareket | Tasarımı henüz yok | 5. aşamada karar |
| B5 | Stüdyo | Ekip portreleri (3 kişi) · stüdyo ve İstanbul fotoğrafları | Portreler aynı ışık ve fonla |
| B6 | Notes ve Not | Yazı kapakları (isteğe bağlı) · yazı içi görseller | Paylaşım görselleri otomatik üretilir |
| B7 | Lab | Canlı örnekler kodla çiziliyor | Gerekmez · hareket vitrini kararına bağlı (8. aşama) |
| B8 | Araçlar | Donanım fotoğrafları (bilgisayar · kulaklık · monitör) | İsteğe bağlı |
| B9 | Marka | Son logo · favicon · apple-touch-icon (180) · PWA ikonları (192 · 512) | Şu an geçici imleç ikonu |
| B10 | Paylaşım (OG) | Her sayfa için 1200×630 | Otomatik üretilecek (7. aşama) · görsel gerekmez |
