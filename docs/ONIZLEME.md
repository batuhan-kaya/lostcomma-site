# Siteyi canlı incelemek (GitHub Codespaces)

Kendi sunucundaki önizleme kurulana kadar siteyi GitHub üzerinden açabilirsin. Site gerçek sunucusu ve örnek içerikli veritabanıyla tarayıcıda çalışır. Kişisel hesaplarda ayda 120 çekirdek saati ücretsiz (bu ayar 2 çekirdek kullanıyor: ayda yaklaşık 60 saat).

## Açmak

1. Repoda incelemek istediğin dalı seç (örneğin PR'ın dalı `phase-4-work`).
2. Yeşil **Code** düğmesi → **Codespaces** sekmesi → **Create codespace on phase-4-work**.
3. İlk açılışta kurulum 2 ile 3 dakika sürer. Site hazır olunca yeni bir sekmede açılır.
   Açılmazsa: alttaki **Ports** sekmesi → **3000 · Lost Comma** satırı → küre simgesi.

Adres `…-3000.app.github.dev` gibi görünür. Varsayılan olarak sadece sen (GitHub hesabınla) açabilirsin.

## Telefonda bakmak

**Ports** sekmesinde 3000 satırına sağ tıkla → **Port Visibility** → **Public**. Adresi telefonuna gönder. İş bitince yine **Private** yap.

## Yeni bir değişiklikten sonra

Terminalde `Ctrl + C` · `git pull` · `npm run preview`. Ya da yeni PR'ın dalında yeni bir codespace aç.

Her açılış örnek içerikle temiz bir veritabanından başlar. Brief formu da çalışır, gönderilenler o codespace'te kalır.

## Kapatmak

[github.com/codespaces](https://github.com/codespaces) sayfasından durdur ya da sil. Bir süre boşta kalınca kendiliğinden de durur. Durmuş bir codespace kota harcamaz, sadece az bir depolama tutar.
