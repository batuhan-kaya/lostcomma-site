/**
 * Client translation. The build swaps every t('Türkçe') literal for the page language,
 * so at runtime t() only fills {placeholders}.
 */
export function t(source: string, vars?: Record<string, string | number>): string {
  if (!vars) return source;
  return source.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
