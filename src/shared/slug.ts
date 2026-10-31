/** URL-safe ids for headings (and later slugs from the panel). Turkish letters become their plain twins. */
const PLAIN: Record<string, string> = { ı: 'i', ş: 's', ğ: 'g', ü: 'u', ö: 'o', ç: 'c' };

export function slugify(text: string): string {
  return text
    .toLocaleLowerCase('tr')
    .replace(/[ışğüöç]/g, (c) => PLAIN[c] ?? c)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}
