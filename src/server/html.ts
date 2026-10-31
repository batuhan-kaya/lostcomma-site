/**
 * Tiny HTML templating. Every interpolated value is escaped unless it is
 * already Safe (the result of another html`` call or raw()).
 */
export class Safe {
  constructor(readonly value: string) {}
  toString(): string {
    return this.value;
  }
}

export type Value = Safe | string | number | boolean | null | undefined | readonly Value[];

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC[c] ?? c);
}

function render(v: Value): string {
  if (v === null || v === undefined || v === false || v === true) return '';
  if (v instanceof Safe) return v.value;
  if (Array.isArray(v)) return v.map(render).join('');
  return esc(String(v));
}

export function html(strings: TemplateStringsArray, ...values: Value[]): Safe {
  let out = strings[0] ?? '';
  for (let i = 0; i < values.length; i++) out += render(values[i]) + (strings[i + 1] ?? '');
  return new Safe(out);
}

/** Trusted markup only (rendered markdown from our own content · inline SVG we wrote). */
export function raw(s: string): Safe {
  return new Safe(s);
}

/** Join class names and skip falsy ones. */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}
