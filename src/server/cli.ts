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
 *   bookings                                      the next calls (Start)
 *   mail test <address>                           send one message through MAIL_URL now
 *   mail outbox                                   the last messages and whether they went out
 *   mail retry                                    send what is still waiting in the outbox now
 *   panel password                                set the panel password (asks for it · or reads stdin)
 *   panel totp off                                turn two-step sign in off (lost phone)
 *   panel signout                                 sign every browser out of the panel
 */
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { parseArgs } from 'node:util';
import { desc, eq } from 'drizzle-orm';
import { prepareDatabase } from './app';
import { loadConfig } from './config';
import { ticketNo, upcomingBookings } from './data/bookings';
import { openDatabase, safeUrl } from './db';
import { media, outbox, people, projects } from './db/schema';
import { seed } from './db/seed';
import { createMailer, Postman } from './mail';
import { endAllSessions, passwordProblem, setPassword } from './panel/auth';
import { panelUser, audit } from './db/schema';
import { when } from './mail/messages';
import { cityOf, localHm } from '../shared/booking';
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
  media list
  bookings
  mail test <address>
  mail outbox
  mail retry
  panel password
  panel totp off
  panel signout`;

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

/** Asks twice without echo on a terminal · reads the first line of stdin otherwise. */
async function askPassword(): Promise<string> {
  const { createInterface } = await import('node:readline');
  if (!process.stdin.isTTY) {
    const rl = createInterface({ input: process.stdin });
    for await (const line of rl) return line;
    return '';
  }
  const ask = (q: string) =>
    new Promise<string>((resolve) => {
      const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
      const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
      out._writeToOutput = (s: string) => {
        if (s.includes(q)) out.output.write(s);
      };
      rl.question(q, (a) => {
        rl.close();
        process.stdout.write('\n');
        resolve(a);
      });
    });
  const a = await ask('New panel password: ');
  const b = await ask('Once more: ');
  if (a !== b) throw new MediaError('the two passwords are not the same');
  return a;
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
    case 'bookings': {
      const list = await upcomingBookings(db, new Date());
      if (!list.length) console.log('no calls booked');
      for (const b of list) {
        const theirs = b.tz === 'Europe/Istanbul' ? '' : `  (${localHm(b.startsAt, b.tz)} ${cityOf(b.tz)})`;
        console.log(`${ticketNo(b.no)}  ${when(b.startsAt, 'tr')}${theirs}  ${b.name} <${b.email}>  ${b.lang}  ${b.about.join(' ')}${b.note ? `\n         ${b.note}` : ''}`);
      }
      break;
    }
    case 'mail': {
      if (sub === 'test' && rest[0]) {
        const mailer = createMailer(config.MAIL_URL);
        if (!mailer) throw new MediaError('MAIL_URL is not set');
        await mailer.send({ kind: 'test', to: rest[0], from: config.MAIL_FROM, subject: 'Lost Comma deneme', text: 'Bu bir deneme. Bunu okuyorsan e-posta ayarları doğru.' });
        console.log(`sent to ${rest[0]}`);
      } else if (sub === 'outbox') {
        for (const m of await db.select().from(outbox).orderBy(desc(outbox.id)).limit(30)) {
          console.log(`${m.id}\t${m.status}\t${m.tries}\t${m.kind}\t${m.to}\t${m.subject}${m.lastError ? `\t${m.lastError}` : ''}`);
        }
      } else if (sub === 'retry') {
        await new Postman(db, createMailer(config.MAIL_URL), config.MAIL_FROM).kick(true);
        console.log('outbox retried');
      } else {
        console.log(USAGE);
        process.exitCode = 1;
      }
      break;
    }
    case 'panel': {
      if (sub === 'password') {
        const pw = await askPassword();
        const problem = passwordProblem(pw);
        if (problem) throw new MediaError(problem);
        await setPassword(db, pw);
        await endAllSessions(db);
        await db.insert(audit).values({ action: 'password', entity: 'account', summary: 'Şifre komut satırından değişti' });
        console.log('panel password set · every browser was signed out');
      } else if (sub === 'totp' && rest[0] === 'off') {
        await db.update(panelUser).set({ totpSecret: null, totpPending: null, totpLastStep: null });
        await db.insert(audit).values({ action: 'totp-off', entity: 'account', summary: 'İki adımlı doğrulama komut satırından kapandı' });
        console.log('two-step sign in is off');
      } else if (sub === 'signout') {
        await endAllSessions(db);
        console.log('every browser was signed out of the panel');
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
