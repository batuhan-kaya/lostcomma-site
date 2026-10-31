/**
 * One RSS feed per language: the notes written in that language with their full text.
 * Interactive blocks (the playground) become a link back to the note.
 */
import type { NoteCard } from '../data/content';
import { esc } from '../html';
import type { Lang, T } from '../i18n';
import { href } from '../routes';
import { renderNote } from './render';

const RFC822 = (d: Date) => d.toUTCString();

/** "]]>" cannot appear inside CDATA: split it across two sections. */
const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;

export function rssXml(site: string, lang: Lang, t: T, notes: (NoteCard & { body: string })[], now: Date): string {
  const self = site + href(lang, 'rss');
  const home = site + href(lang, 'notes');
  const items = notes.map((n) => {
    const url = site + href(lang, 'note', { slug: n.slug });
    const body = renderNote(n.body, { lang, t, author: n.author.crew, feed: { url } }).html.value;
    return [
      '<item>',
      `<title>${esc(n.title)}</title>`,
      `<link>${esc(url)}</link>`,
      `<guid isPermaLink="true">${esc(url)}</guid>`,
      `<pubDate>${RFC822(n.publishedAt)}</pubDate>`,
      `<dc:creator>${esc(`${n.author.name} · ${n.author.crew}`)}</dc:creator>`,
      ...n.tags.map((tag) => `<category>${esc(tag)}</category>`),
      `<description>${esc(n.excerpt)}</description>`,
      `<content:encoded>${cdata(body)}</content:encoded>`,
      '</item>',
    ].join('');
  });
  const updated = notes[0]?.publishedAt ?? now;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '<channel>',
    `<title>Lost Comma · Notes</title>`,
    `<link>${esc(home)}</link>`,
    `<description>${esc(t('Tasarım ve kod üzerine yazdıklarımız.'))}</description>`,
    `<language>${lang}</language>`,
    `<atom:link href="${esc(self)}" rel="self" type="application/rss+xml"/>`,
    `<lastBuildDate>${RFC822(updated)}</lastBuildDate>`,
    ...items,
    '</channel>',
    '</rss>',
    '',
  ].join('\n');
}
