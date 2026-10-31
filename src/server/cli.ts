/**
 * Maintenance commands. Same code in development (tsx) and in the production image (node dist/server/cli.js).
 * They use DATABASE_URL and DATA_DIR like the server. PGlite allows one process at a time: stop
 * `npm run dev` first when it uses a pglite:// database.
 *
 *   migrate                                       apply new migrations
 *   seed [--demo]                                 load the sample content (overwrites sample rows · keeps covers)
 *   media add <file> [--alt-tr ..] [--alt-en ..]  run an image through the pipeline
 *   media cover <project no> <file> [--alt-..]    … and make it that project's cover
 *   media portrait <design|code|motion> <file>    … and make it that teammate's portrait (Studio)
 *   media loop <project no> <mp4> --poster <image> [--webm <file>] [--alt-..]
 *                                                 a ready-made loop (motion work · docs/GORSELLER.md)
 *   media list                                    every image with its key and size
 */
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { parseArgs } from 'node:util';
import { desc, eq } from 'drizzle-orm';
import { prepareDatabase } from './app';
import { loadConfig } from './config';
import { openDatabase, safeUrl } from './db';
import { media, people, projects } from './db/schema';
import { seed } from './db/seed';
import { addDemoCover, addDemoLoop } from './media/demo';
import { ingestImage, MediaError, mediaDirs } from './media/ingest';
import { ingestLoop } from './media/video';

const USAGE = `usage:
  migrate
  seed [--demo]
  media add <file> [--alt-tr "…"] [--alt-en "…"]
  media cover <project no> <file> [--alt-tr "…"] [--alt-en "…"]
  media portrait <design|code|motion> <file> [--alt-tr "…"] [--alt-en "…"]
  media loop <project no> <file.mp4> --poster <image> [--webm <file.webm>] [--alt-tr "…"] [--alt-en "…"]
  media list`;

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: { demo: { type: 'boolean' }, 'alt-tr': { type: 'string' }, 'alt-en': { type: 'string' }, poster: { type: 'string' }, webm: { type: 'string' }, help: { type: 'boolean', short: 'h' } },
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
      if (flags.demo) await addDemoLoop(db, dirs);
      console.log('seeded sample content' + (flags.demo ? ' and the demo cover and loop' : ''));
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
      } else if (sub === 'portrait' && rest[0] && rest[1]) {
        const crew = rest[0];
        if (crew !== 'design' && crew !== 'code' && crew !== 'motion') throw new MediaError('portrait needs design · code or motion');
        const [person] = await db.select({ id: people.id }).from(people).where(eq(people.crew, crew));
        if (!person) throw new MediaError(`no teammate for ${crew}`);
        const image = await add(rest[1]);
        await db.update(people).set({ portraitId: image.id }).where(eq(people.id, person.id));
        console.log(`portrait of ${crew}`);
      } else if (sub === 'loop' && rest[0] && rest[1]) {
        const no = Number(rest[0]);
        const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.no, no));
        if (!project) throw new MediaError(`no project with number ${rest[0]}`);
        if (!flags.poster) throw new MediaError('a loop needs a poster: --poster first-frame.jpg');
        const { video, warnings } = await ingestLoop(db, dirs, {
          mp4: await readFile(rest[1]),
          webm: flags.webm ? await readFile(flags.webm) : undefined,
          poster: await readFile(flags.poster),
          alt: alt(),
          source: basename(rest[1]),
        });
        await db.update(projects).set({ loopId: video.id }).where(eq(projects.id, project.id));
        console.log(`${video.key}  ${video.width}×${video.height}  ${(video.durationMs / 1000).toFixed(1)} s${video.webm ? '  + webm' : ''}`);
        for (const w of warnings) console.log(`warning: ${w}`);
        console.log(`loop of project ${String(no).padStart(3, '0')}`);
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
