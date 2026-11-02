/**
 * The case study editor. The story is one JSON document (src/server/db/story.ts · checked with zod on
 * the server). This turns the textarea into fields: every section can be switched on and off ·
 * lists can grow · shrink and move · detail tiles change kind. The textarea stays the source of
 * truth (it is what the form posts) and "JSON" shows it as text again.
 */
type Opt = [string, string];
type N =
  | { t: 'L'; label: string; area?: boolean; opt?: boolean; hint?: string }
  | { t: 'text'; label: string; opt?: boolean; hint?: string; max?: number }
  | { t: 'num'; label: string; opt?: boolean }
  | { t: 'date'; label: string; opt?: boolean }
  | { t: 'color'; label: string }
  | { t: 'bool'; label: string }
  | { t: 'select'; label: string; options: Opt[]; opt?: boolean }
  | { t: 'multi'; label: string; options: Opt[] }
  | { t: 'media'; label: string; opt?: boolean }
  | { t: 'obj'; label: string; fields: [string, N][]; opt?: boolean; hint?: string }
  | { t: 'list'; label: string; item: N; min?: number; max?: number; add: string }
  | { t: 'tuple'; label: string; items: N[] }
  | { t: 'union'; label: string; variants: Record<string, { label: string; fields: [string, N][] }> }
  | { t: 'strings'; label: string; hint?: string };

type V = unknown;
type Obj = Record<string, V>;

const CREW: Opt[] = [
  ['design', 'Tasarım'],
  ['code', 'Kod'],
  ['motion', 'Hareket'],
];
const THEMES: Opt[] = ['ink', 'paper', 'milk', 'navy', 'blue', 'night', 'pink', 'lab', 'lime', 'sun'].map((x) => [x, x]);
const kt: [string, N][] = [
  ['kick', { t: 'L', label: 'Üst etiket' }],
  ['title', { t: 'L', label: 'Başlık' }],
];

const STORY: { t: 'obj'; label: string; fields: [string, N][] } = {
  t: 'obj',
  label: 'Hikâye',
  fields: [
    ['theme', { t: 'select', label: 'Sayfa rengi', options: THEMES }],
    ['weeks', { t: 'num', label: 'Süre (hafta)', opt: true }],
    ['liveSince', { t: 'date', label: 'Yayına çıktığı gün', opt: true }],
    ['team', { t: 'multi', label: 'Ekip', options: CREW }],
    ['scope', { t: 'L', label: 'Kapsam', opt: true, hint: 'Web uygulaması · Veri tasarımı' }],
    ['tags', { t: 'list', label: 'Kapaktaki etiketler', item: { t: 'L', label: 'Etiket' }, add: 'Etiket ekle' }],
    ['bubbles', { t: 'list', label: 'Ekibin baloncukları (en fazla 3)', max: 3, add: 'Baloncuk ekle', item: { t: 'obj', label: 'Baloncuk', fields: [['who', { t: 'select', label: 'Kim', options: CREW }], ['text', { t: 'L', label: 'Söz' }]] } }],
    [
      'history',
      {
        t: 'obj',
        label: 'Sürüm geçmişi',
        opt: true,
        hint: 'İlk eskizden yayına: her sürüm bir kare.',
        fields: [
          ['heading', { t: 'L', label: 'Başlık' }],
          ['intro', { t: 'L', label: 'Giriş', area: true }],
          ['mock', { t: 'select', label: 'Çizili site (görsel yoksa)', options: [['', 'Yok'], ['sail', 'Yelken kulübü çizimi']], opt: true }],
          [
            'versions',
            {
              t: 'list',
              label: 'Sürümler (2 ile 10)',
              min: 2,
              max: 10,
              add: 'Sürüm ekle',
              item: {
                t: 'obj',
                label: 'Sürüm',
                fields: [
                  ['v', { t: 'text', label: 'Sürüm adı', max: 12, hint: 'v0.1' }],
                  ['date', { t: 'date', label: 'Tarih' }],
                  ['who', { t: 'select', label: 'Kim yaptı', options: CREW }],
                  ['title', { t: 'L', label: 'Başlık' }],
                  ['summary', { t: 'L', label: 'Özet', area: true }],
                  ['comment', { t: 'L', label: 'Yorum' }],
                  ['image', { t: 'media', label: 'Görsel', opt: true }],
                ],
              },
            },
          ],
        ],
      },
    ],
    [
      'brief',
      {
        t: 'obj',
        label: 'Brief · önce ve sonra',
        opt: true,
        fields: [
          ['heading', { t: 'L', label: 'Başlık' }],
          ['before', { t: 'L', label: 'Önce', area: true }],
          ['after', { t: 'L', label: 'Sonra', area: true }],
          ['quote', { t: 'obj', label: 'Müşteriden alıntı', opt: true, fields: [['text', { t: 'L', label: 'Alıntı', area: true }], ['cite', { t: 'L', label: 'Kimden' }]] }],
        ],
      },
    ],
    [
      'details',
      {
        t: 'obj',
        label: 'Detay karoları',
        opt: true,
        fields: [
          [
            'tiles',
            {
              t: 'list',
              label: 'Karolar (1 ile 8)',
              min: 1,
              max: 8,
              add: 'Karo ekle',
              item: {
                t: 'union',
                label: 'Karo',
                variants: {
                  image: { label: 'Görsel', fields: [...kt, ['image', { t: 'media', label: 'Görsel' }], ['wide', { t: 'bool', label: 'Geniş (iki sütun)' }]] },
                  palette: { label: 'Renk paleti', fields: [...kt, ['swatches', { t: 'list', label: 'Renkler (2 ile 6)', min: 2, max: 6, add: 'Renk ekle', item: { t: 'obj', label: 'Renk', fields: [['name', { t: 'L', label: 'Adı' }], ['hex', { t: 'color', label: 'Renk' }], ['ink', { t: 'color', label: 'Üstündeki yazı' }]] } }]] },
                  type: { label: 'Yazı örneği', fields: [...kt, ['spec', { t: 'tuple', label: 'İki satır', items: [{ t: 'L', label: 'Satır 1' }, { t: 'L', label: 'Satır 2' }] }]] },
                  steps: { label: 'Üç adım (çizim)', fields: [...kt, ['steps', { t: 'tuple', label: 'Adımlar', items: [{ t: 'L', label: 'Adım 1' }, { t: 'L', label: 'Adım 2' }, { t: 'L', label: 'Adım 3' }] }]] },
                  wind: { label: 'Rüzgâr (çizim)', fields: [...kt, ['value', { t: 'text', label: 'Değer' }], ['unit', { t: 'L', label: 'Birim' }]] },
                  tide: { label: 'Gelgit (çizim)', fields: [...kt, ['word', { t: 'L', label: 'Kelime' }], ['note', { t: 'L', label: 'Not' }]] },
                },
              },
            },
          ],
        ],
      },
    ],
    [
      'results',
      {
        t: 'obj',
        label: 'Sonuçlar',
        opt: true,
        fields: [
          ['kick', { t: 'L', label: 'Üst etiket' }],
          ['numbers', { t: 'list', label: 'Sayılar (1 ile 3)', min: 1, max: 3, add: 'Sayı ekle', item: { t: 'obj', label: 'Sayı', fields: [['value', { t: 'L', label: 'Değer', hint: '%38' }], ['label', { t: 'L', label: 'Ne' }]] } }],
          ['stack', { t: 'strings', label: 'Kullanılanlar', hint: 'Boşlukla ya da satır satır: Astro TypeScript Figma' }],
        ],
      },
    ],
    [
      'credits',
      {
        t: 'obj',
        label: 'Emek verenler',
        opt: true,
        fields: [
          [
            'rows',
            {
              t: 'list',
              label: 'Satırlar',
              min: 1,
              add: 'Satır ekle',
              item: {
                t: 'obj',
                label: 'Satır',
                fields: [
                  ['who', { t: 'select', label: 'Kim', options: [...CREW, ['client', 'Müşteri']] }],
                  ['label', { t: 'L', label: 'Etiket (müşteri satırı)', opt: true }],
                  ['name', { t: 'L', label: 'Ad' }],
                  ['did', { t: 'L', label: 'Ne yaptı' }],
                  ['count', { t: 'L', label: 'Sayı', hint: '42 commit' }],
                ],
              },
            },
          ],
        ],
      },
    ],
  ],
};

interface MediaItem {
  id: number;
  src: string;
  source: string;
}

function blank(n: N): V {
  switch (n.t) {
    case 'L':
      return { tr: '', en: '' };
    case 'text':
    case 'date':
      return '';
    case 'color':
      return '#0E0E0F';
    case 'bool':
      return false;
    case 'select':
      return n.options[0]![0];
    case 'multi':
    case 'strings':
      return [];
    case 'num':
    case 'media':
      return undefined;
    case 'obj':
      return Object.fromEntries(n.fields.filter(([, f]) => !('opt' in f && f.opt)).map(([k, f]) => [k, blank(f)]));
    case 'list':
      return Array.from({ length: n.min ?? 0 }, () => blank(n.item));
    case 'tuple':
      return n.items.map(blank);
    case 'union': {
      const [kind, v] = Object.entries(n.variants)[0]!;
      return { kind, ...(blank({ t: 'obj', label: '', fields: v.fields }) as Obj) };
    }
  }
}

/** Drops optional parts left empty so the server sees only what was filled. */
function prune(n: N, v: V): V {
  const opt = 'opt' in n && n.opt;
  switch (n.t) {
    case 'L': {
      const l = (v ?? {}) as { tr?: string; en?: string };
      const out = { tr: (l.tr ?? '').trim(), en: (l.en ?? '').trim() };
      return opt && !out.tr && !out.en ? undefined : out;
    }
    case 'text':
    case 'date':
    case 'select': {
      const s = String(v ?? '').trim();
      return opt && !s ? undefined : s;
    }
    case 'num': {
      const x = Number(v);
      return v === '' || v === undefined || v === null || !Number.isFinite(x) ? undefined : x;
    }
    case 'media':
      return v ? Number(v) : undefined;
    case 'obj': {
      if (v === undefined || v === null) return undefined;
      const o = v as Obj;
      const out: Obj = {};
      for (const [k, f] of n.fields) {
        const x = prune(f, o[k]);
        if (x !== undefined) out[k] = x;
      }
      return out;
    }
    case 'list':
      return ((v ?? []) as V[]).map((x) => prune(n.item, x));
    case 'tuple':
      return n.items.map((f, i) => prune(f, ((v ?? []) as V[])[i]));
    case 'union': {
      const o = (v ?? {}) as Obj;
      const variant = n.variants[String(o.kind)] ?? Object.values(n.variants)[0]!;
      return { kind: o.kind, ...(prune({ t: 'obj', label: '', fields: variant.fields }, o) as Obj) };
    }
    case 'strings':
      return ((v ?? []) as string[]).map((s) => s.trim()).filter(Boolean);
    default:
      return v;
  }
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
let uid = 0;

export function mountStory(area: HTMLTextAreaElement): void {
  let state: Obj;
  try {
    state = area.value.trim() ? (JSON.parse(area.value) as Obj) : {};
  } catch {
    return; // Broken JSON stays as text: the server says what is wrong with it.
  }
  if (!('theme' in state)) state.theme = 'ink';
  let media: MediaItem[] = [];
  const host = el('div', 'st');
  const bar = el('div', 'st-bar');
  const modes = el('div', 'p-row');
  const asFields = el('button', 'st-mini', 'Alanlar');
  const asJson = el('button', 'st-mini', 'JSON');
  asFields.type = asJson.type = 'button';
  asFields.setAttribute('aria-pressed', 'true');
  asJson.setAttribute('aria-pressed', 'false');
  modes.append(asFields, asJson);
  const msg = el('p', 'st-msg');
  msg.hidden = true;
  bar.append(el('span', 'p-hint', 'Bölümleri aç · doldur · kaydet. Boş bırakılan isteğe bağlı alanlar gönderilmez.'), modes);
  const body = el('div', 'st');
  host.append(bar, msg, body);
  area.insertAdjacentElement('beforebegin', host);
  area.hidden = true;

  const write = () => {
    const out = prune(STORY, state) as Obj;
    // A story with nothing in it stays empty: the project keeps its short case page.
    const meaningful = Object.entries(out).some(([k, v]) => k !== 'theme' && !(Array.isArray(v) && !v.length)) || (out.theme !== undefined && out.theme !== 'ink');
    area.value = meaningful ? JSON.stringify(out, null, 2) : '';
    area.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const fieldWrap = (label: string, control: HTMLElement, hint?: string) => {
    const w = el('div', 'p-field');
    const id = `st-${++uid}`;
    control.id = id;
    const l = el('label', undefined, label);
    l.htmlFor = id;
    w.append(l, control);
    if (hint) w.append(el('p', 'p-hint', hint));
    return w;
  };

  /** One node · reads and writes through get/set. `redraw` rebuilds the nearest list or section. */
  function render(n: N, get: () => V, set: (v: V) => void, redraw: () => void): HTMLElement {
    switch (n.t) {
      case 'L': {
        const pair = el('div', 'p-pair');
        for (const lang of ['tr', 'en'] as const) {
          const input = n.area ? el('textarea', 'p-in') : el('input', 'p-in');
          if (input instanceof HTMLTextAreaElement) input.rows = 2;
          input.lang = lang;
          input.value = ((get() ?? {}) as Obj)[lang] as string ?? '';
          input.dataset.lint = '';
          input.addEventListener('input', () => {
            set({ ...((get() ?? { tr: '', en: '' }) as Obj), [lang]: input.value });
            write();
            input.classList.toggle('p-lintbad', input.value.includes(','));
          });
          const w = fieldWrap(`${n.label} ${lang.toUpperCase()}`, input, lang === 'tr' ? n.hint : undefined);
          pair.append(w);
        }
        return pair;
      }
      case 'text':
      case 'date':
      case 'num': {
        const input = el('input', 'p-in');
        input.type = n.t === 'date' ? 'date' : n.t === 'num' ? 'number' : 'text';
        if (n.t === 'text' && n.max) input.maxLength = n.max;
        input.value = get() === undefined || get() === null ? '' : String(get());
        input.addEventListener('input', () => {
          set(n.t === 'num' ? (input.value === '' ? undefined : Number(input.value)) : input.value);
          write();
        });
        return fieldWrap(n.label, input, 'hint' in n ? n.hint : undefined);
      }
      case 'color': {
        const wrap = el('div', 'st-color');
        const picker = el('input');
        picker.type = 'color';
        const text = el('input', 'p-in');
        text.pattern = '#[0-9A-Fa-f]{6}';
        picker.value = text.value = String(get() ?? '#0E0E0F');
        picker.addEventListener('input', () => {
          text.value = picker.value.toUpperCase();
          set(text.value);
          write();
        });
        text.addEventListener('input', () => {
          if (/^#[0-9A-Fa-f]{6}$/.test(text.value)) picker.value = text.value;
          set(text.value);
          write();
        });
        wrap.append(picker, text);
        return fieldWrap(n.label, wrap);
      }
      case 'bool': {
        const l = el('label', 'p-toggle');
        const box = el('input');
        box.type = 'checkbox';
        box.checked = !!get();
        box.addEventListener('change', () => {
          set(box.checked);
          write();
        });
        l.append(box, el('span', undefined, n.label));
        return l;
      }
      case 'select': {
        const s = el('select', 'p-in');
        for (const [v, label] of n.options) s.append(new Option(label, v, false, String(get() ?? '') === v));
        s.addEventListener('change', () => {
          set(s.value);
          write();
        });
        return fieldWrap(n.label, s);
      }
      case 'media': {
        const s = el('select', 'p-in');
        const fill = () => {
          s.replaceChildren(new Option('Yok', ''), ...media.map((m) => new Option(`#${m.id} · ${m.source}`, String(m.id), false, String(get() ?? '') === String(m.id))));
          if (get() && !media.some((m) => String(m.id) === String(get()))) s.append(new Option(`#${String(get())} · bulunamadı`, String(get()), false, true));
        };
        fill();
        s.addEventListener('change', () => {
          set(s.value ? Number(s.value) : undefined);
          write();
        });
        return fieldWrap(n.label, s, 'Görseller sayfasından yüklenenler.');
      }
      case 'multi': {
        const fs = el('fieldset', 'p-field p-checks');
        fs.append(el('legend', undefined, n.label));
        const row = el('div');
        for (const [v, label] of n.options) {
          const l = el('label', 'p-chip');
          const box = el('input');
          box.type = 'checkbox';
          box.checked = ((get() ?? []) as string[]).includes(v);
          box.addEventListener('change', () => {
            const cur = new Set((get() ?? []) as string[]);
            if (box.checked) cur.add(v);
            else cur.delete(v);
            set(n.options.map(([x]) => x).filter((x) => cur.has(x)));
            write();
          });
          l.append(box, el('span', undefined, label));
          row.append(l);
        }
        fs.append(row);
        return fs;
      }
      case 'strings': {
        const t = el('textarea', 'p-in');
        t.rows = 2;
        t.value = ((get() ?? []) as string[]).join('\n');
        t.addEventListener('input', () => {
          set(t.value.split(/[\n ]+/));
          write();
        });
        return fieldWrap(n.label, t, n.hint);
      }
      case 'tuple': {
        const box = el('div');
        box.append(el('p', 'p-hint', n.label));
        n.items.forEach((item, i) =>
          box.append(
            render(
              item,
              () => ((get() ?? []) as V[])[i],
              (v) => {
                const a = [...((get() ?? []) as V[])];
                a[i] = v;
                set(a);
              },
              redraw,
            ),
          ),
        );
        return box;
      }
      case 'obj': {
        const box = el('div');
        for (const [key, f] of n.fields) {
          const g = () => ((get() ?? {}) as Obj)[key];
          const s = (v: V) => set({ ...((get() ?? {}) as Obj), [key]: v });
          if (f.t === 'obj' && f.opt) box.append(section(f, g, s));
          else box.append(render(f, g, s, redraw));
        }
        return box;
      }
      case 'list': {
        const box = el('div');
        const draw = () => {
          box.replaceChildren(el('p', 'p-hint', n.label));
          const items = (get() ?? []) as V[];
          items.forEach((item, i) => {
            const card = el('div', 'st-item');
            const head = el('div', 'st-itemh mono');
            head.append(el('span', undefined, `${i + 1}`));
            const tools = el('div');
            const mk = (label: string, title: string, fn: () => void, danger = false) => {
              const b = el('button', `st-mini${danger ? ' danger' : ''}`, label);
              b.type = 'button';
              b.title = title;
              b.setAttribute('aria-label', title);
              b.addEventListener('click', () => {
                fn();
                write();
                draw();
              });
              tools.append(b);
            };
            const move = (to: number) => () => {
              const a = [...items];
              const [x] = a.splice(i, 1);
              a.splice(to, 0, x);
              set(a);
            };
            if (i > 0) mk('↑', 'Yukarı taşı', move(i - 1));
            if (i < items.length - 1) mk('↓', 'Aşağı taşı', move(i + 1));
            if (items.length > (n.min ?? 0)) mk('✕', 'Sil', () => set(items.filter((_, j) => j !== i)), true);
            head.append(tools);
            card.append(
              head,
              render(
                n.item,
                () => ((get() ?? []) as V[])[i],
                (v) => {
                  const a = [...((get() ?? []) as V[])];
                  a[i] = v;
                  set(a);
                },
                draw,
              ),
            );
            box.append(card);
          });
          if (n.max === undefined || items.length < n.max) {
            const add = el('button', 'p-btn ghost st-add', `+ ${n.add}`);
            add.type = 'button';
            add.addEventListener('click', () => {
              set([...((get() ?? []) as V[]), blank(n.item)]);
              write();
              draw();
            });
            box.append(add);
          }
        };
        draw();
        return box;
      }
      case 'union': {
        const box = el('div');
        const draw = () => {
          box.replaceChildren();
          const cur = (get() ?? {}) as Obj;
          const s = el('select', 'p-in');
          for (const [kind, v] of Object.entries(n.variants)) s.append(new Option(v.label, kind, false, cur.kind === kind));
          s.addEventListener('change', () => {
            const keep = { kick: cur.kick, title: cur.title };
            set({ ...(blank({ t: 'obj', label: '', fields: n.variants[s.value]!.fields }) as Obj), kind: s.value, ...Object.fromEntries(Object.entries(keep).filter(([, v]) => v)) });
            write();
            draw();
          });
          box.append(fieldWrap('Karo türü', s));
          const variant = n.variants[String(cur.kind)] ?? Object.values(n.variants)[0]!;
          box.append(render({ t: 'obj', label: '', fields: variant.fields }, get, set, draw));
        };
        draw();
        return box;
      }
    }
  }

  /** An optional block: a <details> with a switch that adds or removes it. */
  function section(n: Extract<N, { t: 'obj' }>, get: () => V, set: (v: V) => void): HTMLElement {
    const d = el('details', 'st-sec');
    const sum = el('summary', undefined, n.label);
    const state2 = el('small');
    sum.append(state2);
    d.append(sum);
    const inner = el('div', 'st-body');
    d.append(inner);
    const draw = () => {
      const on = get() !== undefined && get() !== null;
      state2.textContent = on ? 'açık' : 'kapalı';
      inner.replaceChildren();
      const l = el('label', 'p-toggle');
      const box = el('input');
      box.type = 'checkbox';
      box.checked = on;
      box.addEventListener('change', () => {
        set(box.checked ? blank({ ...n, opt: false }) : undefined);
        write();
        draw();
      });
      l.append(box, el('span', undefined, 'Bu bölüm sayfada olsun'));
      inner.append(l);
      if (n.hint) inner.append(el('p', 'p-hint', n.hint));
      if (on) inner.append(render({ ...n, opt: false }, get, set, draw));
    };
    draw();
    d.open = get() !== undefined && get() !== null;
    return d;
  }

  const drawAll = () => {
    body.replaceChildren();
    // The plain fields first · then each optional section.
    const plain = { t: 'obj' as const, label: '', fields: STORY.fields.filter(([, f]) => !(f.t === 'obj' && f.opt)) };
    const top = el('div', 'st-sec');
    const inner = el('div', 'st-body');
    inner.append(render(plain, () => state, (v) => (state = v as Obj), drawAll));
    top.append(inner);
    body.append(top);
    for (const [key, f] of STORY.fields) {
      if (f.t !== 'obj' || !f.opt) continue;
      body.append(
        section(
          f,
          () => state[key],
          (v) => {
            if (v === undefined) delete state[key];
            else state[key] = v;
          },
        ),
      );
    }
  };

  asJson.addEventListener('click', () => {
    area.hidden = false;
    body.hidden = true;
    asJson.setAttribute('aria-pressed', 'true');
    asFields.setAttribute('aria-pressed', 'false');
    area.focus();
  });
  asFields.addEventListener('click', () => {
    try {
      state = area.value.trim() ? (JSON.parse(area.value) as Obj) : { theme: 'ink' };
    } catch (err) {
      msg.textContent = `JSON okunamadı: ${(err as Error).message}`;
      msg.hidden = false;
      return;
    }
    msg.hidden = true;
    area.hidden = true;
    body.hidden = false;
    asFields.setAttribute('aria-pressed', 'true');
    asJson.setAttribute('aria-pressed', 'false');
    drawAll();
  });

  drawAll();
  void fetch('/panel/media.json')
    .then((r) => (r.ok ? r.json() : []))
    .then((list: MediaItem[]) => {
      media = list;
      drawAll();
    })
    .catch(() => undefined);
}
