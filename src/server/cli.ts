/**
 * Maintenance commands. Same code in development (tsx) and in the production image (node dist/server/cli.js).
 * They use DATABASE_URL and DATA_DIR like the server. PGlite allows one process at a time: stop
 * `npm run dev` first when it uses a pglite:// database.
 *
 *   migrate                                       apply new migrations
 *   seed [--demo]                                 load the sample content (overwrites sample rows · keeps covers)
 *   media add <file> [--alt-tr ..] [--alt-en ..]  run an image through the pipeline
 *   media cover <project no> <file> [--alt-..]    … and make it that project's cover
 *   media list                                    every image with its key and size
 */
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { parseArgs } from 'node:util';
import { desc, eq } from 'drizzle-orm';
import { prepareDatabase } from './app';
import { loadConfig } from './config';
import { openDatabase, safeUrl } from './db';
import { media, projects } from './db/schema';
import { seed } from './db/seed';
import { addDemoCover } from './media/demo';
import { ingestImage, MediaError, mediaDirs } from './media/ingest';

const USAGE = `usage:
  migrate
  seed [--demo]
  media add <file> [--alt-tr "…"] [--alt-en "…"]
  media cover <project no> <file> [--alt-tr "…"] [--alt-en "…"]
  media list`;

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: { demo: { type: 'boolean' }, 'alt-tr': { type: 'string' }, 'alt-en': { type: 'string' }, help: { type: 'boolean', short: 'h' } },
});

const [command, sub, ...rest] = positionals;
if (!command || flags.help) {
  console.log(USAGE);
  process.exit(command ? 0 : 1);
}

const config = loadConfig();
const database = await openDatabase(config.DATABASE_URL);
const { db } = database;
const dirs = mediaDirs(config.DATA_DIR);
const alt = () => ({ ...(flags['alt-tr'] ? { tr: flags['alt-tr'] } : {}), ...(flags['alt-en'] ? { en: flags['alt-en'] } : {}) });

async function add(file: string) {
  const image = await ingestImage(db, dirs, await readFile(file), { alt: alt(), source: basename(file) });
  console.log(`${image.key}  ${image.width}×${image.height}  widths ${image.widths.join(' ')}  ${image.color}`);
  return image;
}

try {
  await prepareDatabase(database, { ...config, SEED: 'none' });
  switch (command) {
    case 'migrate':
      console.log(`migrated ${safeUrl(config.DATABASE_URL)}`);
      break;
    case 'seed':
      await seed(db);
      if (flags.demo) await addDemoCover(db, dirs);
      console.log('seeded sample content' + (flags.demo ? ' and the demo cover' : ''));
      break;
    case 'media': {
      if (sub === 'add' && rest[0]) {
        await add(rest[0]);
      } else if (sub === 'cover' && rest[0] && rest[1]) {
        const no = Number(rest[0]);
        const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.no, no));
        if (!project) throw new MediaError(`no project with number ${rest[0]}`);
        const image = await add(rest[1]);
        await db.update(projects).set({ coverId: image.id }).where(eq(projects.id, project.id));
        console.log(`cover of project ${String(no).padStart(3, '0')}`);
      } else if (sub === 'list') {
        for (const m of await db.select().from(media).orderBy(desc(media.createdAt))) {
          console.log(`${m.id}\t${m.key}\t${m.width}×${m.height}\t${m.source}\t${m.alt.tr ?? ''} / ${m.alt.en ?? ''}`);
        }
      } else {
        console.log(USAGE);
        process.exitCode = 1;
      }
      break;
    }
    default:
      console.log(USAGE);
      process.exitCode = 1;
  }
} catch (err) {
  console.error(err instanceof MediaError ? `error: ${err.message}` : err);
  process.exitCode = 1;
} finally {
  await database.close();
}
