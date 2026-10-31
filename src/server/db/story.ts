/**
 * The case study of a project (projects.story · jsonb). One document with both languages inline
 * ({ tr · en }) because the parts line up one to one between languages: a version · a swatch ·
 * a number. Every section is optional: the case page shows only what a project has.
 *
 * Validated with zod on the way in (seed · panel) and on the way out (the page), so a broken
 * document never reaches a visitor. Images are media ids.
 */
import { z } from 'zod';
import { THEMES, type ThemeId } from '../themes';

const L = z.object({ tr: z.string().min(1), en: z.string().min(1) });
const Crew = z.enum(['design', 'code', 'motion']);
const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const MediaId = z.number().int().positive();

const Tile = z.discriminatedUnion('kind', [
  /** Colour swatches · click to copy. */
  z.object({ kind: z.literal('palette'), kick: L, title: L, swatches: z.array(z.object({ name: L, hex: Hex, ink: Hex })).min(2).max(6) }),
  /** A type specimen that changes width on hover (set in Anybody). */
  z.object({ kind: z.literal('type'), kick: L, title: L, spec: z.tuple([L, L]) }),
  /** A detail shot. */
  z.object({ kind: z.literal('image'), kick: L, title: L, image: MediaId, wide: z.boolean().default(false) }),
  /** Drawn tiles from the sample project. */
  z.object({ kind: z.literal('wind'), kick: L, title: L, value: z.string(), unit: L }),
  z.object({ kind: z.literal('steps'), kick: L, title: L, steps: z.tuple([L, L, L]) }),
  z.object({ kind: z.literal('tide'), kick: L, title: L, word: L, note: L }),
]);

export const StorySchema = z.object({
  /** Page colours: one of the site themes (src/styles/themes.css). */
  theme: z.enum(Object.keys(THEMES) as [ThemeId, ...ThemeId[]]).default('ink'),
  weeks: z.number().int().positive().optional(),
  liveSince: Day.optional(),
  team: z.array(Crew).default([]),
  scope: L.optional(),
  /** Labels on the cover. */
  tags: z.array(L).default([]),
  /** What the team says in the hero (one line each). */
  bubbles: z.array(z.object({ who: Crew, text: L })).max(3).default([]),
  history: z
    .object({
      heading: L,
      intro: L,
      /** A drawn site that changes with each version · used when versions have no image. */
      mock: z.enum(['sail']).optional(),
      versions: z
        .array(z.object({ v: z.string().max(12), date: Day, who: Crew, title: L, summary: L, comment: L, image: MediaId.optional() }))
        .min(2)
        .max(10),
    })
    .optional(),
  brief: z.object({ heading: L, before: L, after: L, quote: z.object({ text: L, cite: L }).optional() }).optional(),
  details: z.object({ tiles: z.array(Tile).min(1).max(8) }).optional(),
  results: z.object({ kick: L, numbers: z.array(z.object({ value: L, label: L })).min(1).max(3), stack: z.array(z.string()).default([]) }).optional(),
  /** People who worked on it. `label` names the client row (the crew rows are named by their cursor). */
  credits: z.object({ rows: z.array(z.object({ who: z.enum(['design', 'code', 'motion', 'client']), label: L.optional(), name: L, did: L, count: L })).min(1) }).optional(),
});

export type Story = z.output<typeof StorySchema>;
export type StoryInput = z.input<typeof StorySchema>;
export type StoryTile = Story extends { details?: { tiles: (infer T)[] } } ? T : never;

/** Media ids a story points at (resolved in one query by the page). */
export function storyMedia(s: Story): number[] {
  const ids = [...(s.history?.versions.flatMap((v) => (v.image ? [v.image] : [])) ?? []), ...(s.details?.tiles.flatMap((t) => (t.kind === 'image' ? [t.image] : [])) ?? [])];
  return [...new Set(ids)];
}
