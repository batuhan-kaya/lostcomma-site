/**
 * Marks a Turkish source string for translation without translating it yet.
 * The i18n extractor picks up msg('…') exactly like t('…').
 * Use it for copy that lives in data (nav items · next bands) and is passed to t() later.
 */
export function msg(source: string): string {
  return source;
}
