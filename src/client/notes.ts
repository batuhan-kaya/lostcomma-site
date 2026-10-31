/**
 * Notes · find in file. The find box marks what it finds in titles and excerpts (Turkish letters
 * forgiven unless "Aa" is on) · a language filter · topic tabs · line numbers save a note for later
 * (this browser only). The search lives in the address (?q=) so it can be shared.
 * Without JS the page is the full list of links.
 */
import { segments, contains } from '../shared/find';
import { getCrew, type Name } from './lib/crew';
import { t } from './lib/t';

interface Note {
  id: number;
  title: string;
  excerpt: string;
  tags: string[];
  langs: string[];
  who: Name;
  /** Tag labels in the page language (the search reads them too). */
  more: string;
}

const $ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<E>(s);
const $$ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<E>(s)];

const data = JSON.parse(document.getElementById('page-data')?.textContent ?? '{}') as { notes: Note[]; tags: Record<string, string> };
const lang = document.documentElement.lang;
const crew = getCrew();
const KEY = 'lc-saved-notes';

const state = { q: '', cs: false, nl: 'all', tab: 'all' };
let saved = new Set<number>();
try {
  saved = new Set((JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown[]).filter((v): v is number => typeof v === 'number'));
} catch {
  /* private mode · nothing saved */
}

const input = $<HTMLInputElement>('[data-q]');
const countEl = $('[data-count]');
const rows = $$('.nr[data-i]');
const noneEl = $('[data-none]');
const titleEl = $('[data-ltitle]');
const metaEl = $('[data-lmeta]');
const savedN = $('[data-savedn]');
/** The visitor has used the find box or a filter: the team keeps its hands off from then on. */
let typed = false;
for (const el of $$('[data-find], [data-tabs], .tagc, [data-rows]')) {
  el.addEventListener('pointerdown', () => (typed = true));
  el.addEventListener('keydown', () => (typed = true));
}

function matches(n: Note): boolean {
  if (state.tab === 'saved' ? !saved.has(n.id) : state.tab !== 'all' && !n.tags.includes(state.tab)) return false;
  if (state.nl !== 'all' && !n.langs.includes(state.nl)) return false;
  return contains(`${n.title} ${n.excerpt} ${n.more} ${n.who}`, state.q, state.cs);
}

function mark(el: HTMLElement, text: string): void {
  const parts = segments(text, state.q, state.cs).map((s) => {
    if (!s.hit) return document.createTextNode(s.t);
    const m = document.createElement('mark');
    m.textContent = s.t;
    return m;
  });
  el.replaceChildren(...parts);
}

const notesWord = (n: number) => (n === 1 ? t('1 not') : t('{n} not', { n }));

function render(): void {
  let vis = 0;
  for (const row of rows) {
    const n = data.notes[Number(row.dataset.i)];
    if (!n) continue;
    const on = matches(n);
    row.hidden = !on;
    if (!on) continue;
    vis++;
    const [title, excerpt] = $$('[data-f]', row);
    if (title) mark(title, n.title);
    if (excerpt) mark(excerpt, n.excerpt);
  }
  const total = data.notes.length;
  if (countEl) countEl.textContent = state.q.trim() ? (vis ? t('{m} nottan {n}', { n: vis, m: total }) : t('Sonuç yok')) : notesWord(total);
  if (noneEl) noneEl.hidden = vis > 0;
  if (titleEl) titleEl.textContent = state.tab === 'all' ? t('Bütün notlar') : state.tab === 'saved' ? t('Sonraya kaydedilenler') : (data.tags[state.tab] ?? state.tab);
  if (metaEl) metaEl.textContent = `${notesWord(vis)} · ${state.nl === 'all' ? t('iki dil') : state.nl === 'en' ? 'English' : 'Türkçe'}`;
  for (const b of $$('[data-tab]')) {
    const on = b.dataset.tab === state.tab;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  }
  for (const b of $$('[data-nl]')) {
    const on = b.dataset.nl === state.nl;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  }
}

/* ---------------- find ---------------- */

let urlTimer = 0;
function setQuery(q: string, fromUser: boolean): void {
  state.q = q;
  if (input && input.value !== q) input.value = q;
  render();
  if (!fromUser) return;
  window.clearTimeout(urlTimer);
  urlTimer = window.setTimeout(() => {
    const url = q.trim() ? `${location.pathname}?q=${encodeURIComponent(q.trim())}` : location.pathname;
    history.replaceState(null, '', url);
  }, 300);
}

input?.addEventListener('input', () => {
  typed = true;
  setQuery(input.value, true);
});
input?.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && input.value) {
    e.preventDefault();
    setQuery('', true);
  }
});

// "/" jumps to the find box from anywhere on the page.
document.addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
  const el = e.target as HTMLElement | null;
  if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
  e.preventDefault();
  input?.focus();
});

const caseBtn = $('[data-case]');
caseBtn?.addEventListener('click', () => {
  state.cs = !state.cs;
  caseBtn.classList.toggle('on', state.cs);
  caseBtn.setAttribute('aria-pressed', String(state.cs));
  render();
});

for (const b of $$('[data-nl]')) {
  b.addEventListener('click', () => {
    state.nl = b.dataset.nl ?? 'all';
    render();
  });
}

for (const b of $$('[data-tab]')) {
  b.addEventListener('click', () => {
    const tab = b.dataset.tab ?? 'all';
    // A topic pressed again in the Topics box goes back to every note.
    state.tab = tab === state.tab && b.closest('.tagc') ? 'all' : tab;
    render();
  });
}

$('[data-reset]')?.addEventListener('click', () => {
  state.cs = false;
  state.nl = 'all';
  state.tab = 'all';
  caseBtn?.classList.remove('on');
  caseBtn?.setAttribute('aria-pressed', 'false');
  setQuery('', true);
  input?.focus();
});

/* ---------------- save for later ---------------- */

function paintSaved(): void {
  for (const row of rows) {
    const id = Number(row.dataset.id);
    const on = saved.has(id);
    row.classList.toggle('sv', on);
    $('[data-save]', row)?.setAttribute('aria-pressed', String(on));
  }
  if (savedN) savedN.textContent = String(saved.size);
}

for (const row of rows) {
  const btn = $<HTMLButtonElement>('[data-save]', row);
  if (!btn) continue;
  btn.disabled = false;
  btn.addEventListener('click', () => {
    const id = Number(row.dataset.id);
    if (saved.has(id)) saved.delete(id);
    else {
      saved.add(id);
      if (crew?.current === 'list') crew.once('sv', crew.hostOf('list'), t('sonraya kaydedildi'), 1600);
    }
    try {
      localStorage.setItem(KEY, JSON.stringify([...saved]));
    } catch {
      /* not kept · still works for this visit */
    }
    paintSaved();
    if (state.tab === 'saved') render();
  });
}

/* ---------------- start ---------------- */

const fromUrl = new URLSearchParams(location.search).get('q');
paintSaved();
if (fromUrl) {
  typed = true;
  setQuery(fromUrl, false);
} else render();

/* ---------------- the team ---------------- */

crew?.addScenes({
  // Code types a word into the find box · says what it found · clears it again.
  hero: async (c, signal) => {
    await c.sleep(3000, signal);
    if (typed || !input || state.q) return;
    await c.go('code', { el: input, fx: 0.3, fy: 0.62 }, signal);
    if (typed) return c.home('code');
    c.press('code');
    const word = t('yay');
    try {
      for (let i = 1; i <= word.length; i++) {
        if (typed) break;
        setQuery(word.slice(0, i), false);
        await c.sleep(150, signal);
      }
      if (!typed) {
        const n = rows.filter((r) => !r.hidden).length;
        c.say('code', n === 1 ? t('bir sonuç · imleçler hakkındaki not') : t('{n} sonuç', { n }), 2400);
        await c.sleep(2800, signal);
      }
    } finally {
      if (!typed) setQuery('', false);
    }
    c.home('code');
    await c.sleep(1800, signal);
    c.once('h2', 'motion', lang === 'en' ? t('bazı notlar sadece Türkçe') : t('bazı notlar sadece İngilizce'), 2400);
  },
  feat: async (c, signal) => {
    await c.sleep(1200, signal);
    c.once('f1', c.hostOf('feat'), t('en yenisi bu'), 2000);
  },
  list: async (c, signal) => {
    await c.sleep(1400, signal);
    c.once('l1', c.hostOf('list'), t('birini kaydetmek için satır numarasına tıkla'), 2600);
  },
});
