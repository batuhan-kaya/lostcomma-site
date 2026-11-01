/**
 * Values filled from the panel (docs/PANEL.md · Site ayarları): prices · the next free month ·
 * the studio address · the phone number. Kept in the `settings` table and cached in memory: pages
 * read them synchronously through ctx.settings. An empty value keeps the placeholder on the page
 * ([FİYAT] · [AY] · [ADRES] · [+90 telefon]) and shows up on the panel's launch checklist.
 */
import { eq } from 'drizzle-orm';
import { SERVICE_KEYS, SERVICES, type ServiceKey } from '../content/services';
import { PROCESS } from '../content/process';
import type { Db } from '../db';
import { settings } from '../db/schema';
import type { Lang } from '../i18n';

export type SettingKind = 'localized' | 'text' | 'month';

export interface SettingDef {
  key: string;
  kind: SettingKind;
  group: 'prices' | 'plans' | 'studio' | 'legal';
  /** Panel label (Turkish). */
  label: string;
  hint?: string;
  /** Where it shows on the site (a path in Turkish). */
  where: string;
}

export const priceKey = (k: ServiceKey, tier: number) => `price.${k}.${tier}`;
export const planKey = (i: number) => `price.plan.${i}`;

export const SETTINGS: SettingDef[] = [
  ...SERVICE_KEYS.flatMap((k) =>
    SERVICES.tr.services[k].tiers.map((tier, i) => ({
      key: priceKey(k, i),
      kind: 'localized' as const,
      group: 'prices' as const,
      label: `${SERVICES.tr.services[k].name} · ${tier.name}`,
      hint: i === 0 ? 'Hizmetler sayfasındaki başlangıç fiyatı da bu.' : undefined,
      where: i === 0 ? '/tr/hizmetler' : `/tr/hizmetler`,
    })),
  ),
  ...PROCESS.tr.plans.slice(0, 2).map((p, i) => ({ key: planKey(i), kind: 'localized' as const, group: 'plans' as const, label: `Süreç · ${p.n}`, where: '/tr/surec' })),
  { key: 'work.nextMonth', kind: 'month', group: 'studio', label: 'Bir sonraki boş yer', hint: 'İşler sayfası: "Bir sonraki boş yer … ayında açılıyor."', where: '/tr/isler' },
  { key: 'studio.address', kind: 'text', group: 'studio', label: 'Stüdyo adresi', hint: 'Sokak ve numara. Kadıköy · 34710 İstanbul satırı ayrıca yazılıyor.', where: '/tr/studyo' },
  { key: 'studio.phone', kind: 'text', group: 'studio', label: 'Telefon', hint: 'Örnek: +90 216 555 01 23', where: '/tr/basla' },
  { key: 'legal.controller', kind: 'text', group: 'legal', label: 'Veri sorumlusu', hint: 'Şirket kurulana kadar adın soyadın (Örnek: Batuhan Kaya). Şirket kurulunca unvanı.', where: '/tr/kvkk' },
  { key: 'legal.address', kind: 'text', group: 'legal', label: 'Yazışma adresi', hint: 'KVKK başvurularının gönderileceği açık adres. Boşsa stüdyo adresi yazılır.', where: '/tr/kvkk' },
  { key: 'legal.email', kind: 'text', group: 'legal', label: 'Başvuru e-postası', hint: 'KVKK başvuruları ve gizlilik soruları için. Boşsa hello@lostcomma.co yazılır.', where: '/tr/kvkk' },
  { key: 'legal.mail', kind: 'text', group: 'legal', label: 'E-posta servisi', hint: 'Bildirimlerin ve yazışmaların geçtiği servis ve ülkesi. Örnek: Google Workspace (ABD) · Zoho Mail (AB).', where: '/tr/kvkk' },
];

export const SETTING_KEYS = new Set(SETTINGS.map((s) => s.key));

export type Localized = Partial<Record<Lang, string>>;
type Value = string | Localized;

export class SettingsStore {
  private values = new Map<string, Value>();

  constructor(private readonly db: Db) {}

  async load(): Promise<void> {
    const rows = await this.db.select().from(settings);
    this.values = new Map(rows.filter((r) => SETTING_KEYS.has(r.key)).map((r) => [r.key, r.value as Value]));
  }

  raw(key: string): Value | undefined {
    return this.values.get(key);
  }

  /** The value in a language · null when empty. */
  text(key: string, lang: Lang): string | null {
    const v = this.values.get(key);
    if (v === undefined) return null;
    if (typeof v === 'string') return v.trim() || null;
    return v[lang]?.trim() || null;
  }

  /** "2027-01" → "Ocak" · "January". */
  month(key: string, lang: Lang): string | null {
    const v = this.values.get(key);
    if (typeof v !== 'string' || !/^\d{4}-\d{2}$/.test(v)) return null;
    const d = new Date(`${v}-15T12:00:00Z`);
    return new Intl.DateTimeFormat(lang === 'tr' ? 'tr-TR' : 'en-GB', { month: 'long', timeZone: 'UTC' }).format(d);
  }

  filled(key: string): boolean {
    const v = this.values.get(key);
    if (v === undefined) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    return !!(v.tr?.trim() && v.en?.trim());
  }

  async set(key: string, value: Value | null): Promise<void> {
    if (!SETTING_KEYS.has(key)) throw new Error(`unknown setting ${key}`);
    if (value === null || (typeof value === 'string' && !value.trim()) || (typeof value === 'object' && !value.tr?.trim() && !value.en?.trim())) {
      await this.db.delete(settings).where(eq(settings.key, key));
      this.values.delete(key);
      return;
    }
    await this.db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
    this.values.set(key, value);
  }

  snapshot(): Record<string, Value> {
    return Object.fromEntries(this.values);
  }
}
