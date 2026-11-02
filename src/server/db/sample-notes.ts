/**
 * Bodies of the sample notes (markdown · see src/server/notes/render.ts for the blocks).
 * Keyed by slug. Fences use ~~~ so the backticks of inline code are the only ones to escape.
 * They describe this website as it is built · the panel (phase 11) replaces them with real notes.
 * The comma rule holds for the prose · code is exempt.
 */
export const NOTE_BODIES: Record<string, string> = {
  /* ---------------- How our cursors move ---------------- */
  'how-our-cursors-move': `Every page on this site has three cursors on it. They belong to the team and they move the way people move. This is the small piece of code behind them and the story of the day we learned they were too much.

## Too many and too fast

The first version felt alive. It also felt like a swarm. Three cursors raced to every section you scrolled to and each one had something to say. A friend put it well. It was fun for ten seconds and then it was noise.

So we changed two things. The cursors got slower and most of them now step back after the first screen.

## Thirty lines

Each cursor is a point that wants to reach a target. Every frame we pull it a little toward the target and let some of its speed fade away. That is a spring. Two numbers decide how it feels.

~~~ts title=spring.ts hl=2 note="sixty times a second on every screen"
const pull = 0.018    // stiffness · was 0.026
const damping = 0.79  // damping · was 0.8
const max = 14.8      // pixels per frame · was 24
const gain = 0.618    // speed it may gain per frame · new

export function step(c: Cursor) {
  const was = Math.sqrt(c.vx ** 2 + c.vy ** 2)
  c.vx = c.vx * damping + (c.tx - c.x) * pull
  c.vy = c.vy * damping + (c.ty - c.y) * pull
  const speed = Math.sqrt(c.vx ** 2 + c.vy ** 2)
  const top = Math.min(max, was + gain)
  if (speed > top) {
    c.vx *= top / speed
    c.vy *= top / speed
  }
  c.x += c.vx
  c.y += c.vy
}
~~~

Stiffness is how hard the target pulls. Damping is how much speed survives each frame. We softened the pull and let a little less speed survive.[^1] The cursor now lands without a wobble. The new line is the gain. A spring leaps off at full speed and that leap was most of the rush. Now the cursor may only gain a little speed each frame so it sets off the way a hand does. A move across half a screen reads in about half a second and is still before one. On long moves the speed cap does the rest.

A fast screen draws twice or more as many frames. So the spring steps sixty times a second on every screen and each frame in between is drawn where the cursor is on its way. Same pace and no stutter on 60 120 or 144 Hz.

## Try it

Move your pointer over the box. The cursor follows with the numbers below. The line underneath draws how far it is from the target over time. Anything below the dashed line is overshoot.

~~~playground spring
~~~

The first preset is what the homepage shipped with. It is not wrong. It is just a lot when there are three of them at once.

## Fewer cursors

The second change is a rule. On the first screen of every page you meet the whole team. After that only one cursor stays. Usually it belongs to whoever made that page. The others fade where they are instead of flying across the page.

~~~figure host
First screen | The whole team. Three cursors and a few words each.
After that | One host per page. It moves slowly and talks once per section at most.
Far jumps | Fade out and fade in near the new spot. No flights.
~~~

If the host has to travel far it fades out and appears again near the new section.[^2] Long flights across the page were the main source of the swarm feeling.

## When motion should stop

If your system asks for \`prefers-reduced-motion\` the cursors snap to their places and stay still. Nothing on this site should need movement to make sense. The Studio page has a switch that does the same for this site only.

Thank you to everyone who told us it was too much. Please keep doing that.

[^1]: With our stiffness the cursor stops overshooting at all once damping drops below about 0.75. Then it starts to feel dragged. At 0.79 it goes a pixel or two past and settles.
[^2]: We use 720 pixels. Anything further becomes a fade instead of a flight.`,

  'imleclerimiz-nasil-hareket-ediyor': `Bu sitedeki her sayfada üç imleç var. Ekibe ait ve insanların hareket ettiği gibi hareket ediyorlar. Bu yazı arkalarındaki küçük kod parçası ve onların fazla geldiğini öğrendiğimiz günün hikâyesi.

## Çok fazla ve çok hızlı

İlk sürüm canlı hissettiriyordu. Aynı zamanda bir sürü gibi de hissettiriyordu. Kaydırdığın her bölüme üç imleç birden koşuyordu ve her birinin söyleyecek bir şeyi vardı. Bir arkadaşımız güzel özetledi. On saniye eğlenceliydi ve sonra gürültüye döndü.

Bu yüzden iki şeyi değiştirdik. İmleçler yavaşladı ve çoğu artık ilk ekrandan sonra geri çekiliyor.

## Otuz satır

Her imleç bir hedefe ulaşmak isteyen bir nokta. Her karede onu hedefe doğru biraz çekiyoruz ve hızının bir kısmını söndürüyoruz. Buna yay deniyor. Nasıl hissettireceğine iki sayı karar veriyor.

~~~ts title=spring.ts hl=2 note="her ekranda saniyede altmış kez"
const pull = 0.018    // sertlik · önceden 0.026
const damping = 0.79  // sönüm · önceden 0.8
const max = 14.8      // kare başına piksel · önceden 24
const gain = 0.618    // kare başına kazanabileceği hız · yeni

export function step(c: Cursor) {
  const was = Math.sqrt(c.vx ** 2 + c.vy ** 2)
  c.vx = c.vx * damping + (c.tx - c.x) * pull
  c.vy = c.vy * damping + (c.ty - c.y) * pull
  const speed = Math.sqrt(c.vx ** 2 + c.vy ** 2)
  const top = Math.min(max, was + gain)
  if (speed > top) {
    c.vx *= top / speed
    c.vy *= top / speed
  }
  c.x += c.vx
  c.y += c.vy
}
~~~

Sertlik hedefin ne kadar güçlü çektiği. Sönüm her karede hızın ne kadarının kaldığı. Çekişi yumuşattık ve hızın biraz daha azının kalmasına izin verdik.[^1] İmleç artık titremeden iniyor. Yeni satır kazanç. Yay hedefe tam hızla atılır ve o atılış telaşın çoğuydu. Şimdi imleç her karede hızına ancak biraz ekleyebiliyor ve bir elin kalktığı gibi yola çıkıyor. Yarım ekranlık bir hareket yaklaşık yarım saniyede okunuyor ve bir saniye dolmadan duruyor. Uzun hareketlerde gerisini hız sınırı yapıyor.

Hızlı bir ekran iki katı ya da daha fazla kare çiziyor. Bu yüzden yay her ekranda saniyede altmış adım atıyor ve aradaki her kare imlecin yolda olduğu yere çiziliyor. 60 120 ya da 144 Hz fark etmiyor. Hız aynı ve takılma yok.

## Dene

İmlecini kutunun üstünde gezdir. İmleç aşağıdaki sayılarla seni takip ediyor. Alttaki çizgi zaman içinde hedefe ne kadar uzak olduğunu çiziyor. Kesikli çizginin altında kalan her şey aşma.

~~~playground spring
~~~

İlk hazır ayar ana sayfanın ilk hâli. Yanlış değil. Sadece aynı anda üç tane olunca fazla geliyor.

## Daha az imleç

İkinci değişiklik bir kural. Her sayfanın ilk ekranında bütün ekiple tanışıyorsun. Sonrasında tek bir imleç kalıyor. Genelde o sayfayı yapan kişinin imleci. Diğerleri sayfanın öbür ucuna uçmak yerine oldukları yerde kayboluyor.

~~~figure host
İlk ekran | Bütün ekip. Üç imleç ve her birinden birkaç kelime.
Sonrası | Sayfa başına bir ev sahibi. Yavaş hareket ediyor ve bölüm başına en fazla bir kez konuşuyor.
Uzak atlayışlar | Kaybol ve yeni yerin yakınında yeniden belir. Uçuş yok.
~~~

Ev sahibinin uzağa gitmesi gerekirse kayboluyor ve yeni bölümün yakınında yeniden beliriyor.[^2] Sürü hissinin asıl kaynağı sayfa boyunca yapılan uzun uçuşlardı.

## Hareket ne zaman durmalı

Sistemin \`prefers-reduced-motion\` istiyorsa imleçler yerlerine oturuyor ve kıpırdamıyor. Bu sitede hiçbir şeyin anlaşılmak için harekete ihtiyacı olmamalı. Stüdyo sayfasındaki bir anahtar aynısını sadece bu site için yapıyor.

Bize fazla olduğunu söyleyen herkese teşekkürler. Lütfen söylemeye devam edin.

[^1]: Bizim sertliğimizle sönüm yaklaşık 0.75’in altına indiğinde imleç hiç aşmıyor. O zaman da sürükleniyormuş gibi hissettiriyor. 0.79’da bir iki piksel geçip yerine oturuyor.
[^2]: 720 piksel kullanıyoruz. Bundan uzağı uçuş yerine kaybolup belirme oluyor.`,

  /* ---------------- Variable fonts on a budget ---------------- */
  'variable-fonts-on-a-budget': `Our display face is Anybody. It has two axes and we use both on almost every page. Width runs from 50 to 150 and weight from 100 to 900. One variable file replaces what used to be a folder of static cuts.

## What the browser actually loads

We do not subset by hand. Fontsource ships every family split by unicode range and we serve those files from our own server. The Latin file of Anybody is 57 kb with both axes. Turkish letters like ğ and ş and İ live in a second file of 46 kb.

~~~css title=fonts.css note="shortened"
@font-face {
  font-family: 'Anybody';
  font-weight: 100 900;
  font-stretch: 50% 150%;
  src: url(anybody-latin-standard-normal.woff2) format('woff2');
  unicode-range: U+0000-00FF;
}
~~~

The browser only fetches the second file when a page uses one of those letters. English pages rarely ask for it. Turkish pages always do.

## Three families and no CDN

Body text is Geist and labels are Martian Mono. All three are self hosted. No third party sees who reads our pages and nothing breaks when someone else’s CDN has a bad day. We preload the three Latin files and let the rest arrive when a page needs them.`,

  /* ---------------- Türkçe büyük harf sorunu ---------------- */
  'turkce-buyuk-harf-sorunu': `Etiketlerimizin çoğu büyük harfle yazılıyor. Bunu metni değiştirerek değil CSS ile yapıyoruz. Küçük bir ayrıntı yüzünden bu Türkçe için tehlikeli.

## Sorun

Tarayıcı büyük harfe çevirirken metnin hangi dilde olduğunu bilmek zorunda. Bilmiyorsa i harfini İngilizcedeki gibi I yapıyor. Böylece metin kelimesi METİN yerine METIN oluyor. Okunuyor ama yanlış ve göze batıyor.

~~~css title=base.css
.mono {
  text-transform: uppercase;
}
~~~

## Çözüm bir nitelik

Tarayıcıya dili söylemek yetiyor. Sayfanın kökünde \`lang\` niteliği var ve başka dilde yazılmış her parça kendi \`lang\` niteliğini taşıyor. Notes listesinde sadece İngilizce olan bir notun başlığı bu yüzden \`lang="en"\` ile geliyor.

~~~html
<html lang="tr">
<a href="/en/notes/how-our-cursors-move" lang="en">How our cursors move</a>
~~~

## JavaScript de aynı

Aynı tuzak kodda da var. \`toUpperCase\` dili bilmiyor. Dili bilen sürümü kullanıyoruz.

~~~ts
'istanbul'.toUpperCase()            // ISTANBUL
'istanbul'.toLocaleUpperCase('tr')  // İSTANBUL
~~~

Notes sayfasındaki arama da aynı yerden geçiyor. Büyük küçük harf ayrımı kapalıyken ı ve i ile ş ve s aynı sayılıyor. Böylece turkce yazan biri de Türkçe kelimesini buluyor.`,

  /* ---------------- A boring stack on purpose ---------------- */
  'a-boring-stack-on-purpose': `This site is a Node server that renders HTML. There is no client framework and no build tool we cannot read in one sitting. That is a choice and not an accident.

## What is in it

- Fastify serves every page and the small API behind the brief form.
- PostgreSQL holds projects and notes and people. Drizzle writes the queries and the migrations.
- Pages are tagged templates that escape everything by default.
- Every page ships one small script. The cursors are shared.
- One build script of about two hundred lines bundles scripts and styles for both languages.

## A page is a function

~~~ts title=work/index.ts note="shortened"
export const workPage: Page<WorkData> = {
  id: 'work',
  theme: 'ink',
  load: async (ctx) => ({ live: await listProjects(ctx.db, ctx.lang) }),
  body: (ctx, d) => html\`<section data-sec="hero">…</section>\`,
};
~~~

## Why boring

Boring parts have known failure modes. When something breaks at night we want to read a stack trace we have seen before. Every dependency is one more changelog to read before an update so we keep the list short.

The interesting work happens on the page. The plumbing should be the least surprising part of the project.`,

  'bilerek-sikici-bir-altyapi': `Bu site HTML üreten bir Node sunucusu. İstemcide bir çatı yok ve tek oturuşta okuyamayacağımız bir derleme aracı yok. Bu bir tesadüf değil bir tercih.

## İçinde ne var

- Fastify her sayfayı ve brief formunun arkasındaki küçük API’yi sunuyor.
- PostgreSQL projeleri ve notları ve kişileri tutuyor. Sorguları ve göçleri Drizzle yazıyor.
- Sayfalar her şeyi varsayılan olarak kaçışlayan etiketli şablonlar.
- Her sayfa tek bir küçük betik taşıyor. İmleçler ortak.
- Yaklaşık iki yüz satırlık tek bir derleme betiği iki dil için betikleri ve stilleri paketliyor.

## Bir sayfa bir fonksiyon

~~~ts title=work/index.ts note="kısaltıldı"
export const workPage: Page<WorkData> = {
  id: 'work',
  theme: 'ink',
  load: async (ctx) => ({ live: await listProjects(ctx.db, ctx.lang) }),
  body: (ctx, d) => html\`<section data-sec="hero">…</section>\`,
};
~~~

## Neden sıkıcı

Sıkıcı parçaların bilinen arızaları var. Gece bir şey bozulduğunda daha önce gördüğümüz bir hata çıktısını okumak istiyoruz. Her bağımlılık güncellemeden önce okunacak bir değişiklik listesi daha demek. O yüzden listeyi kısa tutuyoruz.

İlginç iş sayfada oluyor. Tesisat projenin en az şaşırtan parçası olmalı.`,

  /* ---------------- Easing curves ---------------- */
  'easing-curves-we-actually-use': `We counted. Most of the motion on this site runs on two named curves. Everything else is a softer cousin of one of them.

## Roll

The roll curve starts slowly and ends gently. Labels roll from one language to the other on it and the next page band wipes in on it. It is for things that travel.

~~~css title=tokens.css
--ease-roll: cubic-bezier(.7, 0, .2, 1);
--ease-pop: cubic-bezier(.2, 1.6, .3, 1);
~~~

## Pop

The pop curve overshoots on purpose. The second value goes past one so the end of the move swings a little too far and comes back. Buttons tilt on it and stamps land on it. It is for things that react to you.

## The cousins

Search the styles and you find a handful of pops with a smaller overshoot. Each one was tuned by eye for one spot. We will fold them into the pop curve one day. Until then they are a good reminder that a token only helps if you reach for it first.

Linear is the third thing we use and it is not really a curve. It is for loops that never end like the wave on a case study or the playhead on a film reel.`,

  /* ---------------- Forms from a schema ---------------- */
  'forms-from-a-schema': `A case study on this site is one document. A schema checks it before a page ever reads it. If anything is wrong the page falls back to the short version instead of breaking.

~~~ts title=story.ts note="shortened"
export const StorySchema = z.object({
  team: z.array(Crew).min(1),
  scope: Localized.optional(),
  history: History.optional(),
});
~~~

## The schema is the form

The panel we are building next reads the same schema. A text field for a string. Two side by side fields for something written in both languages. A list with add and remove buttons for an array. We describe the content once and the editor follows.

## Why it matters

Every hand written form drifts from the data it edits. A field gets renamed in one place and not the other. With one schema there is no other place.`,

  'semadan-formlar': `Bu sitedeki bir vaka çalışması tek bir belge. Bir şema onu sayfa okumadan önce kontrol ediyor. Bir şey yanlışsa sayfa bozulmak yerine kısa sürüme dönüyor.

~~~ts title=story.ts note="kısaltıldı"
export const StorySchema = z.object({
  team: z.array(Crew).min(1),
  scope: Localized.optional(),
  history: History.optional(),
});
~~~

## Şema formun kendisi

Sırada yapacağımız panel aynı şemayı okuyor. Metin için bir metin alanı. İki dilde yazılan bir şey için yan yana iki alan. Bir dizi için ekleme ve silme düğmeleri olan bir liste. İçeriği bir kez tarif ediyoruz ve editör onu izliyor.

## Neden önemli

Elle yazılan her form düzenlediği veriden zamanla uzaklaşıyor. Bir alanın adı bir yerde değişiyor ve öbür yerde değişmiyor. Tek bir şema olunca öbür yer diye bir şey kalmıyor.`,

  /* ---------------- Designing at real widths ---------------- */
  'designing-at-real-widths': `Our first mockup is usually a link. It opens in a browser at the width you are holding and it already uses the real fonts.

## Three widths

We check every page at 1440 and 1024 and 390 pixels. Those are the widths our tests open too. A layout that only works at the size of a design tool canvas is not finished.

## What a picture hides

A picture cannot tell you how a long Turkish word wraps or what happens when the second language is a third longer. It cannot show a font loading or a hover on a phone that has no hover. A link shows all of that on the first day.

We still draw. The drawing just stops being the thing we sign off on.`,

  /* ---------------- Share images ---------------- */
  'share-images-without-a-design-tool': `When you paste a link to this site somewhere the preview image is drawn by the server. Nobody exports anything from a design tool.

## Letters as paths

The server opens our own font files with fontkit and turns every letter of the title into an outline. The outlines go into an SVG with the page colour behind them. Sharp turns the SVG into a PNG.

~~~ts title=og.ts note="shortened"
const font = fontkit.create(ttf).getVariation({ wdth: 80, wght: 840 });
for (const glyph of font.layout(title).glyphs) {
  d += glyph.path.scale(size / font.unitsPerEm, -size / font.unitsPerEm).toSVG();
}
~~~

Our fonts are woff2 files. fontkit cannot apply variations to woff2 so the server unpacks each file once and keeps the result in memory.

## One template

Every page gets the same layout: a small label on top and the title in Anybody with the page’s cursor resting at its end. Images are cached by their content so a changed title draws a new one and nothing else is drawn twice.`,

  'tasarim-araci-olmadan-paylasim-gorselleri': `Bu sitenin bir bağlantısını bir yere yapıştırdığında önizleme görselini sunucu çiziyor. Kimse bir tasarım aracından bir şey dışa aktarmıyor.

## Yol olarak harfler

Sunucu kendi font dosyalarımızı fontkit ile açıyor ve başlığın her harfini bir dış çizgiye çeviriyor. Dış çizgiler arkalarında sayfanın rengiyle bir SVG’ye giriyor. Sharp bu SVG’yi PNG’ye çeviriyor.

~~~ts title=og.ts note="kısaltıldı"
const font = fontkit.create(ttf).getVariation({ wdth: 80, wght: 840 });
for (const glyph of font.layout(title).glyphs) {
  d += glyph.path.scale(size / font.unitsPerEm, -size / font.unitsPerEm).toSVG();
}
~~~

Fontlarımız woff2 dosyaları. fontkit woff2 dosyalarında eksenleri uygulayamıyor. Bu yüzden sunucu her dosyayı bir kez açıyor ve sonucu bellekte tutuyor.

## Tek şablon

Her sayfa aynı düzeni alıyor: üstte küçük bir etiket ve Anybody ile yazılmış başlık. Başlığın sonunda sayfanın imleci duruyor. Görseller içeriklerine göre saklanıyor. Başlık değişirse yenisi çiziliyor ve hiçbir şey iki kez çizilmiyor.`,

  /* ---------------- Hareketi azaltmak ---------------- */
  'hareketi-azaltmak-kapatmak-degil': `Sistem ayarlarında hareketi azaltmayı seçen biri hareketin hiç olmamasını istemiyor olabilir. İstediği şey sürpriz olmaması. Bu yüzden bu sitede azaltılmış hareket kapatmak anlamına gelmiyor.

## Ne değişiyor

- İmleçler yerlerine süzülmek yerine oraya oturuyor ve kıpırdamıyor.
- İmleçlerin küçük sahneleri oynamıyor.
- Hizmetler sayfasındaki çizim tahtası çizilmiş olarak açılıyor.
- Geçişler bir anda bitiyor ama durum değişiklikleri yine görünüyor.

~~~css title=base.css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .001ms !important;
    transition-duration: .001ms !important;
  }
}
~~~

## Ne değişmiyor

Bilgi aynı kalıyor. Bir şey hareketle anlatılıyorsa hareketsiz hâli de aynı şeyi söylemeli. Süreç sayfasındaki zaman çizelgesi oynatılamasa da her haftayı gösteriyor.

Stüdyo sayfasında aynı ayarı sadece bu site için açıp kapatabileceğin bir anahtar da var.`,

  /* ---------------- What a sailing club taught us ---------------- */
  'what-a-sailing-club-taught-us': `The sailing club came to us with a list of features. By the second meeting the list was one sentence long. Fewer phone calls.

## Where the calls came from

Members called to ask if the boats were out. Parents called to ask when lessons ended. Everyone called when the wind changed. Each call was a question the website could have answered.

## What we built

A page that says which boats are on the water right now. A lesson timetable that knows about the weather. One button for the people on shore to say a lesson is cancelled.

The calls did not stop. They got shorter. That was the brief all along.`,

  'bir-yelken-kulubunun-bize-ogrettikleri': `Yelken kulübü bize bir özellik listesiyle geldi. İkinci toplantıda liste tek bir cümleye inmişti. Daha az telefon.

## Telefonlar nereden geliyordu

Üyeler teknelerin denizde olup olmadığını sormak için arıyordu. Veliler derslerin ne zaman bittiğini soruyordu. Rüzgâr değişince herkes arıyordu. Her arama web sitesinin cevaplayabileceği bir soruydu.

## Ne yaptık

Şu an hangi teknelerin suda olduğunu söyleyen bir sayfa. Havayı bilen bir ders programı. Kıyıdakilerin bir dersin iptal olduğunu söyleyebileceği tek bir düğme.

Telefonlar susmadı. Kısaldılar. Brief baştan beri buydu.`,

  /* ---------------- Two languages and one build ---------------- */
  'two-languages-and-one-build': `This site is written in Turkish first. Every string in the code is the Turkish sentence itself and English is looked up from a catalog.

~~~ts
t('Proje başlat')         // Start a project
t('{n} sayfa', { n: 3 })  // 3 pages
~~~

## The catalog checks itself

A script reads every source file with a JavaScript parser and finds every call to the translation function. It adds missing sentences to the English catalog and fails when one is missing or no longer used. It also fails on a comma.

## One build per language

The browser code is built twice. Each build replaces the Turkish sentences with the right language so no catalog ships to the browser. If an English sentence is missing the build stops before anything reaches the server.`,

  'iki-dil-ve-tek-derleme': `Bu site önce Türkçe yazılıyor. Koddaki her metin Türkçe cümlenin kendisi. İngilizcesi bir katalogdan bulunuyor.

~~~ts
t('Proje başlat')         // Start a project
t('{n} sayfa', { n: 3 })  // 3 pages
~~~

## Katalog kendini denetliyor

Bir betik her kaynak dosyayı bir JavaScript ayrıştırıcısıyla okuyor ve çeviri fonksiyonuna yapılan her çağrıyı buluyor. Eksik cümleleri İngilizce kataloğa ekliyor. Bir cümle eksikse ya da artık kullanılmıyorsa hata veriyor. Virgül görürse de hata veriyor.

## Her dil için bir derleme

Tarayıcı kodu iki kez derleniyor. Her derleme Türkçe cümleleri doğru dille değiştiriyor ve böylece tarayıcıya hiçbir katalog gitmiyor. İngilizce bir cümle eksikse derleme sunucuya bir şey ulaşmadan duruyor.`,

  /* ---------------- Friday demo ---------------- */
  'our-friday-demo-template': `Every Friday we show the week’s work to the client. Thirty minutes and a recording for anyone who could not come. Here is the script we follow.

1. Five minutes. What we said we would do this week and what we did.
2. Fifteen minutes. The work itself in a browser. Unfinished parts included.
3. Five minutes. Questions we need answered before Monday.
4. Five minutes. What next week looks like.

## Rules

- Show the real thing. No slides of the thing.
- Say what is not working before anyone finds it.
- End on time even when it is going well.

The recording goes into the shared folder the same day with the questions written underneath.`,
};
