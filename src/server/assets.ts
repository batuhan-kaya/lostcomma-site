import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Lang } from './i18n';

/** Written by scripts/build.ts. Client JS is built once per language. */
export interface Manifest {
  css: Record<string, string>;
  js: Record<string, Record<Lang, string>>;
  fonts: Record<string, string>;
}

const EMPTY: Manifest = { css: {}, js: {}, fonts: {} };

export class Assets {
  private cached: Manifest | null = null;
  constructor(
    private readonly dir: string,
    private readonly live: boolean,
  ) {}

  manifest(): Manifest {
    if (this.cached && !this.live) return this.cached;
    try {
      this.cached = JSON.parse(readFileSync(join(this.dir, 'manifest.json'), 'utf8')) as Manifest;
    } catch {
      this.cached = EMPTY;
    }
    return this.cached;
  }

  css(name: string): string | undefined {
    return this.manifest().css[name];
  }

  js(name: string, lang: Lang): string | undefined {
    return this.manifest().js[name]?.[lang];
  }

  font(name: string): string | undefined {
    return this.manifest().fonts[name];
  }
}
