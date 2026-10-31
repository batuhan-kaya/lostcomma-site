/**
 * Notifications. Every message first goes into the outbox table · a Postman sends what is
 * pending through the configured mailer and retries failures a few times. Without MAIL_URL nothing
 * is sent (the messages wait in the outbox · `npm run mail -- outbox` lists them).
 *
 *   MAIL_URL   smtps://user:pass@smtp.example.com:465 · smtp://…:587 (STARTTLS) · log:// (prints them)
 *   MAIL_FROM  "Lost Comma <hello@lostcomma.co>"
 *   MAIL_TO    the studio inbox for briefs and bookings
 */
import { and, asc, eq, gt, lt } from 'drizzle-orm';
import nodemailer from 'nodemailer';
import type { Db } from '../db';
import { outbox } from '../db/schema';

export interface Mail {
  kind: 'brief' | 'booking' | 'booking-guest' | 'booking-cancel' | 'test';
  to: string;
  replyTo?: string | null;
  subject: string;
  text: string;
  /** A calendar invitation sent as invite.ics. */
  ics?: string | null;
}

export interface Mailer {
  send(m: Mail & { from: string }): Promise<void>;
}

/** Collects mail in memory (tests). */
export class MemoryMailer implements Mailer {
  readonly sent: (Mail & { from: string })[] = [];
  fail = false;
  async send(m: Mail & { from: string }): Promise<void> {
    if (this.fail) throw new Error('mail server said no');
    this.sent.push(m);
  }
}

export function createMailer(url: string | undefined, log: (msg: string) => void = console.log): Mailer | null {
  if (!url) return null;
  if (url.startsWith('log:')) {
    return { send: async (m) => log(`[mail] ${m.kind} → ${m.to} · ${m.subject}\n${m.text}`) };
  }
  const transport = nodemailer.createTransport(url);
  return {
    async send(m) {
      await transport.sendMail({
        from: m.from,
        to: m.to,
        replyTo: m.replyTo ?? undefined,
        subject: m.subject,
        text: m.text,
        icalEvent: m.ics ? { filename: 'invite.ics', method: m.ics.includes('METHOD:CANCEL') ? 'CANCEL' : 'PUBLISH', content: m.ics } : undefined,
      });
    },
  };
}

export async function enqueue(db: Db, mails: Mail[], at: Date = new Date()): Promise<void> {
  if (!mails.length) return;
  await db.insert(outbox).values(mails.map((m) => ({ kind: m.kind, to: m.to, replyTo: m.replyTo ?? null, subject: m.subject, text: m.text, ics: m.ics ?? null, createdAt: at })));
}

/** Gives up after this many tries · never sends mail older than two days (stale news). */
const MAX_TRIES = 5;
const STALE_MS = 2 * 86_400_000;

export class Postman {
  private running: Promise<void> | null = null;
  private again = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly db: Db,
    private readonly mailer: Mailer | null,
    private readonly from: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  get on(): boolean {
    return !!this.mailer;
  }

  /** Sends what is new (and with `retry` what failed before). Calls while a round runs queue one more round. */
  kick(retry = false): Promise<void> {
    if (!this.mailer) return Promise.resolve();
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = this.round(retry).finally(() => {
      this.running = null;
      if (this.again) {
        this.again = false;
        void this.kick();
      }
    });
    return this.running;
  }

  /** Resolves once nothing is being sent (tests). */
  async drain(): Promise<void> {
    while (this.running) await this.running;
  }

  /** Retries every few minutes in the background. */
  start(everyMs = 5 * 60_000): void {
    if (!this.mailer || this.timer) return;
    this.timer = setInterval(() => void this.kick(true), everyMs);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async round(retry: boolean): Promise<void> {
    const now = this.now();
    await this.db
      .update(outbox)
      .set({ status: 'skipped', lastError: 'older than two days' })
      .where(and(eq(outbox.status, 'pending'), lt(outbox.createdAt, new Date(now.getTime() - STALE_MS))));
    const waiting = await this.db
      .select()
      .from(outbox)
      .where(and(eq(outbox.status, 'pending'), gt(outbox.createdAt, new Date(now.getTime() - STALE_MS)), retry ? undefined : eq(outbox.tries, 0)))
      .orderBy(asc(outbox.id))
      .limit(20);
    for (const m of waiting) {
      try {
        await this.mailer!.send({ kind: m.kind as Mail['kind'], to: m.to, replyTo: m.replyTo, subject: m.subject, text: m.text, ics: m.ics, from: this.from });
        await this.db.update(outbox).set({ status: 'sent', sentAt: this.now(), tries: m.tries + 1, lastError: null }).where(eq(outbox.id, m.id));
      } catch (err) {
        const tries = m.tries + 1;
        await this.db
          .update(outbox)
          .set({ tries, lastError: String((err as Error).message ?? err).slice(0, 500), status: tries >= MAX_TRIES ? 'failed' : 'pending' })
          .where(eq(outbox.id, m.id));
      }
    }
  }
}
