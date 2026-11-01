/** Site ayarları: the placeholders filled from the panel (prices · the next free month · address · phone). */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { SETTINGS, type Localized } from '../../data/settings';
import { html } from '../../html';
import { back, bodyOf, COMMA, hasComma, log, send, str, type Kit } from '../kit';
import { csrfField, errorSummary, input, pair, saveBar, section, type Errors } from '../ui';

const GROUPS = [
  { key: 'prices', title: 'Hizmet fiyatları', hint: 'Her hizmetin üç basamağı. Hizmetler sayfasındaki "Başlangıç fiyatı" ilk basamaktır. İki dilde ayrı yaz: para birimi farklı olabilir (₺90.000 · €2.500). Virgül yerine nokta ya da boşluk kullan.' },
  { key: 'plans', title: 'Süreç planları', hint: 'Süreç sayfasının altındaki iki plan. Üçüncüsü "iş başına".' },
  { key: 'studio', title: 'Stüdyo', hint: 'Boş bırakılan alan sayfada yer tutucu olarak kalır ve Pano\'daki hazırlık listesinde görünür.' },
  { key: 'legal', title: 'Yasal sayfalar', hint: 'Gizlilik · KVKK ve Çerezler sayfalarında yazar. Boş olan yer tutucu olarak kalır.' },
] as const;

export function registerSettings(p: FastifyInstance, k: Kit): void {
  const page = async (req: FastifyRequest, reply: FastifyReply, o: { values?: Record<string, string>; errors?: Errors; status?: number } = {}) => {
    const v = (key: string, l?: 'tr' | 'en') => {
      const name = l ? `${key}_${l}` : key;
      if (o.values && name in o.values) return o.values[name]!;
      const raw = k.settings.raw(key);
      if (raw === undefined) return '';
      return typeof raw === 'string' ? raw : (raw[l ?? 'tr'] ?? '');
    };
    const e = o.errors ?? {};
    return send(k, req, reply, {
      title: 'Site ayarları',
      section: 'settings',
      status: o.status,
      body: html`${errorSummary(e)}
<form method="post" action="/panel/settings" class="p-form" data-dirty-guard>${csrfField(req.panel!.csrf)}
${GROUPS.map((g) =>
  section(
    g.title,
    html`${SETTINGS.filter((s) => s.group === g.key).map((s) =>
      s.kind === 'localized'
        ? pair(s.key, s.label, { tr: v(s.key, 'tr'), en: v(s.key, 'en') }, e, { copy: true, hint: s.hint, attrs: html` placeholder="${s.key.startsWith('price') ? '[FİYAT]' : ''}"` })
        : s.kind === 'month'
          ? input(s.key, s.label, v(s.key), { type: 'month', error: e[s.key], hint: s.hint })
          : input(s.key, s.label, v(s.key), { error: e[s.key], hint: s.hint, copy: true, type: s.key === 'studio.phone' ? 'tel' : s.key === 'legal.email' ? 'email' : 'text' }),
    )}`,
    { id: g.key, hint: g.hint },
  ),
)}
${saveBar()}
</form>`,
    });
  };

  p.get('/settings', (req, reply) => page(req, reply));

  p.post('/settings', async (req, reply) => {
    const b = bodyOf(req);
    const values: Record<string, string> = {};
    const e: Errors = {};
    const next = new Map<string, string | Localized | null>();
    for (const s of SETTINGS) {
      if (s.kind === 'localized') {
        const tr = str(b, `${s.key}_tr`).trim();
        const en = str(b, `${s.key}_en`).trim();
        values[`${s.key}_tr`] = tr;
        values[`${s.key}_en`] = en;
        if (hasComma(tr)) e[`${s.key}_tr`] = COMMA;
        if (hasComma(en)) e[`${s.key}_en`] = COMMA;
        if (tr.length > 60) e[`${s.key}_tr`] = 'Kısa tut (60 karakter).';
        if (en.length > 60) e[`${s.key}_en`] = 'Kısa tut (60 karakter).';
        next.set(s.key, tr || en ? { tr, en } : null);
      } else {
        const x = str(b, s.key).trim();
        values[s.key] = x;
        if (s.kind === 'month' && x && !/^\d{4}-(0[1-9]|1[0-2])$/.test(x)) e[s.key] = 'Bir ay seç.';
        if (s.kind === 'text' && hasComma(x)) e[s.key] = COMMA;
        if (x.length > 120) e[s.key] = 'Çok uzun.';
        next.set(s.key, x || null);
      }
    }
    if (Object.keys(e).length) return page(req, reply, { values, errors: e, status: 422 });
    const before = k.settings.snapshot();
    const changed: string[] = [];
    for (const [key, value] of next) {
      const was = JSON.stringify(before[key] ?? null);
      if (was === JSON.stringify(value)) continue;
      await k.settings.set(key, value);
      changed.push(SETTINGS.find((s) => s.key === key)!.label);
    }
    if (changed.length) await log(k, req, { action: 'update', entity: 'settings', summary: `Site ayarları: ${changed.join(' · ')}`.slice(0, 300), before, after: k.settings.snapshot() });
    return back(reply, '/panel/settings', 'saved');
  });
}
