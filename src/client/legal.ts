/**
 * The legal pages' own interactions (src/server/pages/legal):
 *   privacy · your record · what /api/stats/me holds about this visit today · delete it · do not count me
 *   kvkk    · use your right · the ticked rights become an application email (nothing is sent to us)
 *   cookies · in your browser now · our cookie and local storage keys · delete one by one
 */
import { setStatsOff, statsOff } from './lib/stats';
import { t } from './lib/t';

const $ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<E>(s);
const $$ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<E>(s)];
const lang = document.documentElement.lang === 'en' ? 'en' : 'tr';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/* ---------------- privacy · your record ---------------- */

interface Mine {
  declined: boolean;
  visits: { id: string; startedAt: string; country: string; device: string; source: string; views: { path: string; at: string; ms: number; scroll: number }[]; events: number }[];
}

const DEVICE: Record<string, string> = { phone: t('telefon'), tablet: t('tablet'), desktop: t('masaüstü') };
const hm = (iso: string) => new Intl.DateTimeFormat(lang === 'tr' ? 'tr-TR' : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }).format(new Date(iso));
const secs = (ms: number) => (ms < 60_000 ? t('{n} sn', { n: Math.round(ms / 1000) }) : t('{n} dk', { n: Math.round(ms / 60_000) }));
const country = (cc: string) => {
  try {
    return cc ? (new Intl.DisplayNames([lang], { type: 'region' }).of(cc) ?? cc) : t('bilinmiyor');
  } catch {
    return cc;
  }
};

function receipt(box: HTMLElement): void {
  const body = $('[data-rbody]', box)!;
  const acts = $('[data-racts]', box)!;
  const forget = $<HTMLButtonElement>('[data-forget]', box)!;
  const off = $<HTMLButtonElement>('[data-nocount]', box)!;
  acts.hidden = false;

  const note = (text: string) => body.replaceChildren(el('p', 'rnote', text));
  const showOff = () => {
    const o = statsOff();
    off.textContent = o ? t('Beni yeniden say') : t('Beni sayma');
    off.setAttribute('aria-pressed', String(o));
  };

  const render = (m: Mine) => {
    if (m.declined) return note(t('Tarayıcın izlenmek istemediğini söylüyor. Seni saymıyoruz.'));
    if (!m.visits.length) return note(statsOff() ? t('Saymamamızı istedin. Bugün hakkında bir kaydımız yok.') : t('Bugün hakkında bir kaydımız yok.'));
    const out: HTMLElement[] = [];
    let total = 0;
    m.visits.forEach((v, i) => {
      const head = el('p', 'rv mono', `${t('Ziyaret {n}', { n: i + 1 })} · ${hm(v.startedAt)} · ${country(v.country)} · ${DEVICE[v.device] ?? v.device}${v.source ? ` · ${v.source}` : ''}`);
      const list = el('ol', 'rpages');
      for (const w of v.views) {
        total += w.ms;
        const li = el('li');
        li.append(el('span', 'mono', w.path), el('span', 'rt mono', `${secs(w.ms)} · %${w.scroll}`));
        list.append(li);
      }
      out.push(head, list);
      if (v.events) out.push(el('p', 'rv mono', t('{n} tıklama ya da olay', { n: v.events })));
    });
    out.push(el('p', 'rsum mono', `${t('Toplam')} · ${secs(total)}`));
    body.replaceChildren(...out);
  };

  const load = async () => {
    try {
      const res = await fetch('/api/stats/me', { credentials: 'same-origin', cache: 'no-store' });
      render((await res.json()) as Mine);
    } catch {
      note(t('Kaydına şu an ulaşamadık. Biraz sonra yeniden dene.'));
    }
  };

  forget.addEventListener('click', async () => {
    forget.disabled = true;
    try {
      const res = await fetch('/api/stats/forget', { method: 'POST', credentials: 'same-origin' });
      const r = (await res.json()) as { removed?: number };
      note(r.removed ? t('Silindi. Bu sayfada kalırsan yeni bir kayıt başlar · istemiyorsan Beni sayma düğmesine bas.') : t('Silinecek bir kayıt yoktu.'));
    } catch {
      note(t('Silemedik. Biraz sonra yeniden dene.'));
    }
    forget.disabled = false;
  });
  off.addEventListener('click', () => {
    setStatsOff(!statsOff());
    showOff();
    void load();
  });
  showOff();
  note(t('Bakılıyor…'));
  // This page's own view reaches the server after a moment.
  window.setTimeout(load, statsOff() ? 0 : 2000);
}

/* ---------------- kvkk · use your right ---------------- */

const RIGHTS: Record<string, string> = {
  learn: t('Hakkımda hangi kişisel verileri işlediğinizi öğrenmek istiyorum.'),
  why: t('Verilerimi hangi amaçla ve nasıl işlediğinizi öğrenmek istiyorum.'),
  who: t('Verilerimi yurt içinde ya da yurt dışında kimlere aktardığınızı öğrenmek istiyorum.'),
  fix: t('Yanlış ya da eksik işlenen verilerimin düzeltilmesini istiyorum.'),
  delete: t('Kişisel verilerimin silinmesini istiyorum.'),
  object: t('Kişisel verilerimin işlenmesine itiraz ediyorum.'),
};

function letter(box: HTMLElement): void {
  const to = box.dataset.to ?? '';
  const link = $<HTMLAnchorElement>('[data-mail]', box)!;
  const name = $<HTMLInputElement>('[data-lname]', box)!;
  const update = () => {
    const picked = $$<HTMLInputElement>('input[name="right"]:checked', box).map((c) => RIGHTS[c.value]!);
    const lines = [
      t('Merhaba'),
      '',
      t('KVKK m. 11 kapsamında başvuruyorum.'),
      '',
      t('Taleplerim:'),
      ...(picked.length ? picked : [t('(talebini buraya yaz)')]).map((p) => `- ${p}`),
      '',
      `${t('Ad soyad')}: ${name.value.trim()}`,
      `${t('T.C. kimlik no (yabancıysan uyruk ve pasaport no)')}: `,
      `${t('Cevap için e-posta')}: `,
      '',
      t('Teşekkürler'),
    ];
    link.href = `mailto:${to}?subject=${encodeURIComponent(t('KVKK başvurusu'))}&body=${encodeURIComponent(lines.join('\n'))}`;
    link.classList.toggle('ready', picked.length > 0);
  };
  box.addEventListener('input', update);
  update();
}

/* ---------------- cookies · in your browser now ---------------- */

function has(kind: string, k: string): boolean {
  if (kind === 'cookie') return document.cookie.split(';').some((c) => c.trim().startsWith(`${k}=`));
  try {
    return localStorage.getItem(k) !== null;
  } catch {
    return false;
  }
}

function drop(kind: string, k: string): void {
  if (kind === 'cookie') document.cookie = `${k}=; path=/; max-age=0; samesite=lax`;
  else {
    try {
      localStorage.removeItem(k);
    } catch {
      /* storage blocked: nothing there */
    }
  }
}

function jar(box: HTMLElement): void {
  const count = $('[data-jcount]', box)!;
  const draw = () => {
    let n = 0;
    for (const li of $$('[data-item]', box)) {
      const here = has(li.dataset.kind!, li.dataset.item!);
      if (here) n++;
      li.classList.toggle('on', here);
      $('[data-state]', li)!.textContent = here ? t('var') : t('tutulmuyor');
      $<HTMLButtonElement>('[data-del]', li)!.hidden = !here;
    }
    count.textContent = n ? t('{n} kayıt', { n }) : t('boş');
  };
  box.addEventListener('click', (e) => {
    const li = (e.target as Element).closest<HTMLElement>('[data-del]')?.closest<HTMLElement>('[data-item]');
    if (!li) return;
    drop(li.dataset.kind!, li.dataset.item!);
    draw();
  });
  // Another tab may change them.
  addEventListener('storage', draw);
  draw();
}

/* ---------------- the contents list follows the reading ---------------- */

function toc(): void {
  const links = $$<HTMLAnchorElement>('[data-toc]');
  if (!links.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        for (const a of links) a.setAttribute('aria-current', String(a.hash === `#${e.target.id}`));
      }
    },
    { rootMargin: '-30% 0px -60% 0px' },
  );
  for (const a of links) {
    const s = document.getElementById(a.hash.slice(1));
    if (s) io.observe(s);
  }
}

toc();
const r = $('[data-rcpt]');
if (r) receipt(r);
const l = $('[data-letter]');
if (l) letter(l);
const j = $('[data-jar]');
if (j) jar(j);
