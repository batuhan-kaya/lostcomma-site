import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface StoredBrief {
  id: string;
  at: string;
  lang: 'tr' | 'en';
  types: string[];
  time: string | null;
  budget: string | null;
  name: string;
  email: string;
  message: string;
}

/** Where briefs go. A file until the database arrives (phase 3) · mail follows in phase 9. */
export interface Inbox {
  add(brief: StoredBrief): Promise<void>;
}

/** One JSON object per line. Append only · survives restarts on the data volume. */
export class FileInbox implements Inbox {
  constructor(private readonly file: string) {}
  async add(brief: StoredBrief): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });
    await appendFile(this.file, JSON.stringify(brief) + '\n', 'utf8');
  }
}

export class MemoryInbox implements Inbox {
  readonly items: StoredBrief[] = [];
  async add(brief: StoredBrief): Promise<void> {
    this.items.push(brief);
  }
}
