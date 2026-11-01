/**
 * The panel in the browser (docs/PANEL.md). Everything works as plain forms without it · this adds:
 * unsaved-change guard and ⌘S · slugs from names · the comma check while typing · confirm dialogs ·
 * list search ("/") · the image picker · drag and drop uploads with progress · live note preview
 * with a small toolbar · the case study editor (panel/story.ts).
 */
import { fold } from '../shared/find';
import { slugify } from '../shared/slug';
import { mountStory } from './panel/story';

const $ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<E>(s);
const $$ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<E>(s)];
const csrf = document.body.dataset.csrf ?? '';

document.documentElement.classList.add('p-js');

/* ---------------- messages ---------------- */

const flash = $('[data-flash]');
if (flash) window.setTimeout(() => flash.classList.add('gone'), 5000);
$('[data-errors]')?.focus();

/* ---------------- dialogs ---------------- */

function dialog(o: { title: string; body: HTMLElement | string; ok: string; danger?: boolean; small?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = `p-dialog${o.small ? ' small' : ''}`;
    const head = document.createElement('div');
    head.className = 'p-dhead';
    const b = document.createElement('b');
    b.textContent = o.title;
    head.append(b);
    const body = document.createElement('div');
    body.className = 'p-dbody';
    if (typeof o.body === 'string') {
      const p = document.createElement('p');
      p.textContent = o.body;
      body.append(p);
    } else body.append(o.body);
    const foot = document.createElement('div');
    foot.className = 'p-dfoot';
    const no = document.createElement('button');
    no.type = 'button';
    no.className = 'p-btn ghost';
    no.textContent = 'Vazgeç';
    const yes = document.createElement('button');
    yes.type = 'button';
    yes.className = `p-btn${o.danger ? ' danger' : ''}`;
    yes.textContent = o.ok;
    foot.append(no, yes);
    d.append(head, body, foot);
    document.body.append(d);
    let answer = false;
    no.addEventListener('click', () => d.close());
    yes.addEventListener('click', () => {
      answer = true;
      d.close();
    });
    d.addEventListener('close', () => {
      d.remove();
      resolve(answer);
    });
    d.showModal();
    (o.danger ? no : yes).focus();
  });
}

for (const form of $$<HTMLFormElement>('form[data-confirm]')) {
  form.addEventListener('submit', async (e) => {
    if (form.dataset.confirmed) return;
    e.preventDefault();
    const danger = !!$('.danger', form);
    const ok = await dialog({ title: danger ? 'Emin misin?' : 'Onayla', body: form.dataset.confirm ?? '', ok: $('button[type="submit"]', form)?.textContent?.trim() || 'Devam', danger, small: true });
    if (!ok) return;
    form.dataset.confirmed = '1';
    form.requestSubmit();
  });
}

/* ---------------- unsaved changes · ⌘S ---------------- */

const guarded = $$<HTMLFormElement>('form[data-dirty-guard]');
let dirty = false;
let leaving = false;
for (const form of guarded) {
  const mark = () => {
    dirty = true;
    $('[data-dirty]', form)?.removeAttribute('hidden');
  };
  form.addEventListener('input', mark);
  form.addEventListener('change', mark);
  form.addEventListener('submit', () => {
    leaving = true;
    $('button[type="submit"]', form)?.classList.add('busy');
  });
}
window.addEventListener('beforeunload', (e) => {
  if (dirty && !leaving) e.preventDefault();
});
document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 's' && (e.metaKey || e.ctrlKey) && guarded.length) {
    e.preventDefault();
    guarded[0]!.requestSubmit();
  }
  // "/" jumps to the list search.
  if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
    const f = $<HTMLInputElement>('[data-filter]');
    if (f) {
      e.preventDefault();
      f.focus();
    }
  }
});

/* ---------------- list search ---------------- */

for (const input of $$<HTMLInputElement>('[data-filter]')) {
  const target = $(input.dataset.filter!);
  if (!target) continue;
  const rows = $$('[data-row]', target);
  input.addEventListener('input', () => {
    const q = fold(input.value.trim());
    for (const r of rows) r.hidden = !!q && !fold(r.textContent ?? '').includes(q);
  });
}

/* ---------------- slugs from names ---------------- */

for (const slug of $$<HTMLInputElement>('input[data-slug]')) {
  const lang = slug.dataset.slug || slug.name.split('_').pop();
  const form = slug.form;
  const source = form && $$<HTMLInputElement>('input[data-slug-source]', form).find((s) => (s.dataset.slugSource || s.name.split('_').pop()) === lang);
  if (!source) continue;
  // Only follow the name while the address was never typed by hand (or matches the name).
  let auto = !slug.value || slug.value === slugify(source.value);
  slug.addEventListener('input', () => (auto = !slug.value));
  source.addEventListener('input', () => {
    if (!auto) return;
    slug.value = slugify(source.value);
  });
}

/* ---------------- the comma rule ---------------- */

const prose = (s: string) => s.replace(/^(~~~|```)[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, '').replace(/`[^`\n]*`/g, '');
for (const field of $$<HTMLInputElement | HTMLTextAreaElement>('[data-lint]')) {
  const msg = document.createElement('p');
  msg.className = 'p-lintmsg';
  msg.hidden = true;
  msg.textContent = 'Virgül var · marka kuralı: virgülsüz yaz.';
  field.insertAdjacentElement('afterend', msg);
  const check = () => {
    const text = field.dataset.lint === 'prose' ? prose(field.value) : field.value;
    const bad = text.includes(',');
    field.classList.toggle('p-lintbad', bad);
    msg.hidden = !bad;
  };
  field.addEventListener('input', check);
  check();
}

/* ---------------- colour swatches ---------------- */

for (const s of $$('[data-color]')) s.style.background = s.dataset.color ?? '';

/* ---------------- note languages ---------------- */

for (const col of $$('[data-langcol]')) {
  const box = $<HTMLInputElement>(`input[name="has_${col.dataset.langcol}"]`, col);
  if (!box) continue;
  const sync = () => col.classList.toggle('off', !box.checked);
  box.addEventListener('change', sync);
  sync();
}

/* ---------------- the image picker ---------------- */

for (const wrap of $$('[data-pick-wrap]')) {
  const select = $<HTMLSelectElement>('select[data-pick]', wrap);
  if (!select) continue;
  const show = () => {
    const opt = select.selectedOptions[0];
    const old = $('[data-pick-img]', wrap);
    const src = opt?.dataset.src;
    let next: HTMLElement;
    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.width = 120;
      img.height = Math.round((120 * Number(opt!.dataset.h)) / Number(opt!.dataset.w)) || 76;
      next = img;
    } else {
      next = document.createElement('span');
      next.className = 'p-noimg';
      next.textContent = 'Görsel yok';
    }
    next.dataset.pickImg = '';
    old?.replaceWith(next);
  };
  select.addEventListener('change', show);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'p-btn ghost p-pickbtn';
  btn.textContent = 'Kitaplıktan seç';
  select.insertAdjacentElement('afterend', btn);
  btn.addEventListener('click', async () => {
    const grid = document.createElement('ul');
    grid.className = 'p-grid-pick';
    let chosen = select.value;
    for (const opt of [...select.options]) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(opt.value === chosen));
      if (opt.dataset.src) {
        const img = document.createElement('img');
        img.src = opt.dataset.src;
        img.alt = '';
        img.loading = 'lazy';
        b.append(img);
      }
      const label = document.createElement('span');
      label.textContent = opt.textContent ?? '';
      b.append(label);
      b.addEventListener('click', () => {
        chosen = opt.value;
        for (const x of $$('button', grid)) x.setAttribute('aria-pressed', String(x === b));
      });
      b.addEventListener('dblclick', () => {
        chosen = opt.value;
        (grid.closest('dialog') as HTMLDialogElement | null)?.querySelector<HTMLButtonElement>('.p-dfoot .p-btn:last-child')?.click();
      });
      li.append(b);
      grid.append(li);
    }
    if (await dialog({ title: 'Görsel seç', body: grid, ok: 'Seç' })) {
      select.value = chosen;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
}

/* ---------------- uploads ---------------- */

function send(url: string, data: FormData, onProgress: (p: number) => void): Promise<{ status: number; json: Record<string, unknown> }> {
  return new Promise((resolve) => {
    const x = new XMLHttpRequest();
    x.open('POST', url);
    x.setRequestHeader('x-csrf', csrf);
    x.setRequestHeader('accept', 'application/json');
    x.upload.addEventListener('progress', (e) => e.lengthComputable && onProgress(e.loaded / e.total));
    x.addEventListener('load', () => {
      let json: Record<string, unknown> = {};
      try {
        json = JSON.parse(x.responseText) as Record<string, unknown>;
      } catch {
        /* not json */
      }
      resolve({ status: x.status, json });
    });
    x.addEventListener('error', () => resolve({ status: 0, json: {} }));
    x.send(data);
  });
}

for (const form of $$<HTMLFormElement>('form[data-upload]')) {
  const input = $<HTMLInputElement>('input[type="file"]', form)!;
  const list = $('[data-uploads]', form)!;
  const run = async (files: File[]) => {
    if (!files.length) return;
    let ok = 0;
    for (const file of files) {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = file.name;
      const state = document.createElement('span');
      state.className = 'mono';
      state.textContent = 'yükleniyor';
      const bar = document.createElement('progress');
      bar.max = 1;
      bar.value = 0;
      li.append(name, state, bar);
      list.append(li);
      const data = new FormData();
      data.append('files', file);
      const r = await send(form.action, data, (p) => (bar.value = p));
      const failed = (r.json.failed as { error: string }[] | undefined)?.[0];
      if (r.status === 200 && !failed) {
        ok++;
        state.textContent = 'tamam';
        state.className = 'mono ok';
        bar.value = 1;
      } else {
        state.textContent = failed?.error ?? (r.status === 413 ? 'Dosya çok büyük.' : 'Yüklenemedi.');
        state.className = 'bad';
      }
    }
    if (ok) {
      const done = document.createElement('li');
      done.innerHTML = '<span>Bitti.</span>';
      const again = document.createElement('a');
      again.href = '/panel/media?m=uploaded';
      again.className = 'p-btn ghost';
      again.textContent = 'Kitaplığı yenile';
      done.append(again);
      list.append(done);
    }
  };
  input.addEventListener('change', () => run([...(input.files ?? [])]));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void run([...(input.files ?? [])]);
  });
  for (const ev of ['dragenter', 'dragover']) form.addEventListener(ev, (e) => (e.preventDefault(), form.classList.add('over')));
  for (const ev of ['dragleave', 'drop']) form.addEventListener(ev, () => form.classList.remove('over'));
  form.addEventListener('drop', (e) => {
    e.preventDefault();
    void run([...((e as DragEvent).dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/') || /\.(heic|heif|avif)$/i.test(f.name)));
  });
}

/* ---------------- notes: live preview · toolbar ---------------- */

const SNIPPETS: Record<string, (sel: string) => string> = {
  h2: (s) => `\n## ${s || 'Ara başlık'}\n`,
  code: (s) => `\n~~~ts title=dosya.ts\n${s || '// kod'}\n~~~\n`,
  playground: () => '\n~~~playground spring\n~~~\n',
  figure: () => '\n~~~figure host\nEtiket | metin\nEtiket | metin\n~~~\n',
  note: (s) => `${s}[^1]\n\n[^1]: Dipnot metni.\n`,
  link: (s) => `[${s || 'bağlantı metni'}](https://)`,
};

for (const area of $$<HTMLTextAreaElement>('textarea[data-md-source]')) {
  const lang = area.dataset.mdSource!;
  const pane = $(`[data-md-preview="${lang}"]`);
  const bar = $(`[data-mdbar="${lang}"]`);
  const minutes = $(`[data-minutes="${lang}"]`);
  const author = $<HTMLSelectElement>('select[name="authorId"]');
  if (pane) pane.hidden = false;
  if (bar) bar.hidden = false;
  let timer = 0;
  let seq = 0;
  const render = async () => {
    if (!pane) return;
    const mine = ++seq;
    const crew = author?.selectedOptions[0]?.textContent?.split(' · ').pop() ?? 'design';
    const res = await fetch('/panel/notes/render', { method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf': csrf }, body: JSON.stringify({ body: area.value, lang, author: crew }) }).catch(() => null);
    if (!res || mine !== seq) return;
    const out = (await res.json().catch(() => ({}))) as { ok?: boolean; html?: string; minutes?: number; error?: string };
    if (out.ok && typeof out.html === 'string') {
      // Our own renderer's markup (markdown with raw HTML off).
      pane.innerHTML = out.html || '<p class="p-hint">Boş.</p>';
      if (minutes) minutes.textContent = `${out.minutes ?? 0} dk okuma`;
    } else {
      pane.textContent = out.error ?? 'Önizleme yapılamadı.';
    }
  };
  area.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(render, 450);
  });
  void render();
  for (const b of $$<HTMLButtonElement>('button[data-md]', bar ?? document.createElement('div'))) {
    b.addEventListener('click', () => {
      const s = area.selectionStart;
      const e = area.selectionEnd;
      const text = SNIPPETS[b.dataset.md!]!(area.value.slice(s, e));
      area.setRangeText(text, s, e, 'end');
      area.focus();
      area.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
}

/* ---------------- the case study editor ---------------- */

const story = $<HTMLTextAreaElement>('textarea[data-story]');
if (story) mountStory(story);

/* ---------------- statistics (docs/ISTATISTIK.md) ---------------- */

// "Right now on the site" refreshes every 15 seconds while the tab shows.
const liveBox = $('[data-live]');
if (liveBox?.dataset.src) {
  window.setInterval(async () => {
    if (document.hidden) return;
    try {
      const res = await fetch(liveBox.dataset.src!, { credentials: 'same-origin' });
      if (res.ok) liveBox.innerHTML = await res.text();
    } catch {
      /* offline: try again next time */
    }
  }, 15_000);
}

// "Do not count this browser": your own visits stay out of the numbers (src/client/lib/stats.ts).
const OFF_KEY = 'lc-stats-off';
for (const b of $$<HTMLButtonElement>('[data-statsoff]')) {
  const show = () => {
    let off = false;
    try {
      off = localStorage.getItem(OFF_KEY) === '1';
    } catch {
      /* storage blocked */
    }
    b.textContent = off ? 'Bu tarayıcı sayılmıyor ✓' : 'Bu tarayıcıyı sayma';
    b.setAttribute('aria-pressed', String(off));
  };
  b.addEventListener('click', () => {
    try {
      if (localStorage.getItem(OFF_KEY) === '1') localStorage.removeItem(OFF_KEY);
      else localStorage.setItem(OFF_KEY, '1');
    } catch {
      /* storage blocked */
    }
    show();
  });
  show();
}

// The click map: the page in a frame at its real width · scaled to the column · dots on top.
for (const map of $$('[data-map]')) {
  const frame = $<HTMLIFrameElement>('[data-map-frame]', map);
  const dots = $<SVGSVGElement>('[data-map-dots]', map);
  if (!frame || !dots) continue;
  const width = Number(dots.dataset.frame) || 1440;
  let height = 2400;
  const fit = () => {
    const s = Math.min(1, map.clientWidth / width);
    for (const el of [frame, dots] as (HTMLElement | SVGSVGElement)[]) {
      el.style.height = `${height}px`;
      el.style.transform = `scale(${s.toFixed(4)})`;
    }
    dots.setAttribute('viewBox', `0 0 ${width} ${height}`);
    map.style.height = `${Math.round(height * s)}px`;
  };
  frame.addEventListener('load', () => {
    try {
      height = Math.max(600, Math.min(20_000, frame.contentDocument?.documentElement.scrollHeight ?? height));
    } catch {
      /* another origin: keep the default */
    }
    fit();
  });
  addEventListener('resize', fit, { passive: true });
  fit();
}
