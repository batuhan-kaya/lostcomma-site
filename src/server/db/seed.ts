/**
 * Loads content into the database. Idempotent: running it twice gives the same rows.
 * People match on their cursor · projects on their number · notes on any of their slugs.
 * Covers and portraits that were added later are kept.
 */
import { and, count, eq, inArray, or } from 'drizzle-orm';
import type { Db } from './index';
import { SAMPLE, type SampleContent } from './sample';
import { notes, noteText, people, peopleText, projects, projectText } from './schema';

export async function seed(db: Db, content: SampleContent = SAMPLE): Promise<void> {
  await db.transaction(async (tx) => {
    const personId = new Map<string, number>();
    for (const [sort, person] of content.people.entries()) {
      const row = { crew: person.crew, name: person.name, keys: person.keys, sort };
      const [saved] = await tx
        .insert(people)
        .values(row)
        .onConflictDoUpdate({ target: people.crew, set: { name: row.name, keys: row.keys, sort } })
        .returning({ id: people.id });
      personId.set(person.crew, saved!.id);
      for (const lang of ['tr', 'en'] as const) {
        const text = { personId: saved!.id, lang, ...person.text[lang] };
        await tx
          .insert(peopleText)
          .values(text)
          .onConflictDoUpdate({ target: [peopleText.personId, peopleText.lang], set: text });
      }
    }

    // Board slots are unique: free the ones this content uses before handing them out again.
    const nos = content.projects.map((p) => p.no);
    if (nos.length) await tx.update(projects).set({ boardSlot: null }).where(inArray(projects.no, nos));
    for (const project of content.projects) {
      const row = {
        no: project.no,
        discipline: project.discipline,
        year: project.year,
        status: project.status,
        boardSlot: project.boardSlot ?? null,
        art: project.art ?? null,
      };
      const [saved] = await tx.insert(projects).values(row).onConflictDoUpdate({ target: projects.no, set: row }).returning({ id: projects.id });
      for (const lang of ['tr', 'en'] as const) {
        const t = project.text[lang];
        const text = { projectId: saved!.id, lang, slug: t.slug, name: t.name, kind: t.kind, summary: t.summary ?? '', client: t.client ?? '' };
        await tx
          .insert(projectText)
          .values(text)
          .onConflictDoUpdate({ target: [projectText.projectId, projectText.lang], set: text });
      }
    }

    for (const note of content.notes) {
      const authorId = personId.get(note.author);
      if (!authorId) throw new Error(`seed: no person for note author ${note.author}`);
      const texts = (['tr', 'en'] as const).flatMap((lang) => {
        const t = note.text[lang];
        return t ? [{ lang, slug: t.slug, title: t.title, excerpt: t.excerpt, body: t.body ?? '' }] : [];
      });
      const [found] = await tx
        .select({ id: noteText.noteId })
        .from(noteText)
        .where(or(...texts.map((t) => and(eq(noteText.lang, t.lang), eq(noteText.slug, t.slug)))))
        .limit(1);
      const row = { authorId, tags: note.tags, publishedAt: new Date(note.date + 'T09:00:00+03:00') };
      const id = found ? found.id : (await tx.insert(notes).values(row).returning({ id: notes.id }))[0]!.id;
      if (found) await tx.update(notes).set(row).where(eq(notes.id, id));
      for (const t of texts) {
        const text = { noteId: id, ...t };
        await tx
          .insert(noteText)
          .values(text)
          .onConflictDoUpdate({ target: [noteText.noteId, noteText.lang], set: text });
      }
    }
  });
}

/** Seeds only a database without projects, so content edited later is never overwritten on boot. */
export async function seedIfEmpty(db: Db, content: SampleContent = SAMPLE): Promise<boolean> {
  const [row] = await db.select({ n: count() }).from(projects);
  if ((row?.n ?? 0) > 0) return false;
  await seed(db, content);
  return true;
}
