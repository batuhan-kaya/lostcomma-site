/**
 * Notes · short copy that is not in the database. Tag keys live on notes.tags · their labels are here.
 */
import { msg } from '../msg';

export const TAGS = {
  code: msg('Kod'),
  design: msg('Tasarım'),
  motion: msg('Hareket'),
  type: msg('Tipografi'),
  i18n: msg('i18n'),
  tooling: msg('Alet çantası'),
  studio: msg('Stüdyo'),
  performance: msg('Performans'),
  a11y: msg('Erişilebilirlik'),
} as const;

export type TagKey = keyof typeof TAGS;

/** The topic tabs under the find box. Every tag is in the Topics box beside the list. */
export const TABS: TagKey[] = ['code', 'design', 'motion', 'i18n', 'tooling', 'studio'];

export function isTag(k: string): k is TagKey {
  return k in TAGS;
}
