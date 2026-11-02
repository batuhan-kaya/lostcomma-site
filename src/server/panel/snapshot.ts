/**
 * Before and after states for the log (Kayıt) and the way back ("Bu hale dön"). A snapshot is
 * plain JSON: the row and its language rows. Restoring writes it back · a deleted item comes back
 * with its old id. Clashes (a number or a board frame someone else has now) are reported.
 */
import { and, eq, ne } from 'drizzle-orm';
import type { Db } from '../db';
import { briefs, notes, noteText, people, peopleText, projects, projectText } from '../db/schema';

type Row = Record<string, unknown>;
export interface Snap {
  row: Row;
  texts: Row[];
}

const strip = (r: Row) => {
  const { createdAt: _c, updatedAt: _u, ...rest } = r;
  return rest;
};

export async function projectSnap(db: Db, id: number): Promise<Snap | null> {
  const [row] = await db.select().from(projects).where(eq(projects.id, id));
  if (!row) return null;
  const texts = await db.select().from(projectText).where(eq(projectText.projectId, id));
  return { row: strip(row), texts };
}

export async function noteSnap(db: Db, id: number): Promise<Snap | null> {
  const [row] = await db.select().from(notes).where(eq(notes.id, id));
  if (!row) return null;
  const texts = await db.select().from(noteText).where(eq(noteText.noteId, id));
  return { row: strip(row), texts };
}

export async function personSnap(db: Db, id: number): Promise<Snap | null> {
  const [row] = await db.select().from(people).where(eq(people.id, id));
  if (!row) return null;
  const texts = await db.select().from(peopleText).where(eq(peopleText.personId, id));
  return { row: strip(row), texts };
}

export async function briefSnap(db: Db, id: string): Promise<Snap | null> {
  const [row] = await db.select().from(briefs).where(eq(briefs.id, id));
  return row ? { row: row as Row, texts: [] } : null;
}

const date = (v: unknown) => (v === null || v === undefined ? null : new Date(String(v)));

export class RestoreError extends Error {}

/** Writes a snapshot back. Returns notes about anything that had to change on the way. */
export async function restore(db: Db, entity: string, snap: Snap): Promise<string[]> {
  const notesOut: string[] = [];
  const id = snap.row.id as number;
  try {
    await db.transaction(async (tx) => {
      if (entity === 'project') {
        const v = { ...snap.row } as typeof projects.$inferInsert;
        if (v.boardSlot !== null && v.boardSlot !== undefined) {
          const [other] = await tx.select({ id: projects.id }).from(projects).where(and(eq(projects.boardSlot, v.boardSlot), ne(projects.id, id)));
          if (other) {
            v.boardSlot = null;
            notesOut.push('Panodaki çerçevesi artık başka bir işte. Bu iş panoya konmadı.');
          }
        }
        const [had] = await tx.select({ id: projects.id }).from(projects).where(eq(projects.id, id));
        if (had) await tx.update(projects).set({ ...v, id: undefined }).where(eq(projects.id, id));
        else await tx.insert(projects).values(v);
        await tx.delete(projectText).where(eq(projectText.projectId, id));
        if (snap.texts.length) await tx.insert(projectText).values(snap.texts as (typeof projectText.$inferInsert)[]);
      } else if (entity === 'note') {
        const v = { ...snap.row, publishedAt: date(snap.row.publishedAt) } as typeof notes.$inferInsert;
        const [had] = await tx.select({ id: notes.id }).from(notes).where(eq(notes.id, id));
        if (had) await tx.update(notes).set({ ...v, id: undefined }).where(eq(notes.id, id));
        else await tx.insert(notes).values(v);
        await tx.delete(noteText).where(eq(noteText.noteId, id));
        if (snap.texts.length) await tx.insert(noteText).values(snap.texts as (typeof noteText.$inferInsert)[]);
      } else if (entity === 'person') {
        const v = { ...snap.row } as typeof people.$inferInsert;
        await tx.update(people).set({ ...v, id: undefined, crew: undefined }).where(eq(people.id, id));
        await tx.delete(peopleText).where(eq(peopleText.personId, id));
        if (snap.texts.length) await tx.insert(peopleText).values(snap.texts as (typeof peopleText.$inferInsert)[]);
      } else if (entity === 'brief') {
        const v = { ...snap.row, createdAt: date(snap.row.createdAt)! } as typeof briefs.$inferInsert;
        await tx.insert(briefs).values(v).onConflictDoUpdate({ target: briefs.id, set: { ...v, id: undefined } });
      } else {
        throw new RestoreError('Bu kayıt geri alınamıyor.');
      }
    });
  } catch (err) {
    if (err instanceof RestoreError) throw err;
    const msg = String((err as Error).message ?? err);
    if (/project_text_slug|note_text_slug/.test(msg)) throw new RestoreError('Adreslerden biri artık başka bir içerikte kullanılıyor. Önce onu değiştir.');
    if (/projects_no_unique|no_unique|"no"/.test(msg)) throw new RestoreError('Bu numara artık başka bir işte. Önce onu değiştir.');
    throw new RestoreError(`Geri alınamadı: ${msg.slice(0, 160)}`);
  }
  return notesOut;
}

export const RESTORABLE = new Set(['project', 'note', 'person', 'brief']);
