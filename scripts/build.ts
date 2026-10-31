/**
 * npm run build           production build into dist/
 * tsx scripts/build.ts --watch   client JS + CSS rebuild on change (used by npm run dev)
 *
 * Client JS is built once per language: the English build swaps every t('Türkçe') literal
 * for its translation (scripts/lib/i18n.ts). CSS pulls the woff2 files out of node_modules
 * and gives them content hashes. Everything lands in dist/public/manifest.json.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import * as esbuild from 'esbuild';
import { inlineTranslations, toJs } from './lib/i18n';

const LANGS = ['tr', 'en'] as const;
type Lang = (typeof LANGS)[number];

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const pub = join(dist, 'public');
const assetsDir = join(pub, 'assets');
const watch = process.argv.includes('--watch');

interface Manifest {
  css: Record<string, string>;
  js: Record<string, Partial<Record<Lang, string>>>;
  fonts: Record<string, string>;
}
const manifest: Manifest = { css: {}, js: {}, fonts: {} };

const readEn = () => JSON.parse(readFileSync(join(root, 'i18n/en.json'), 'utf8')) as Record<string, string>;

function entries(dir: string, ext: string): string[] {
  const full = join(root, dir);
  if (!existsSync(full)) return [];
  return readdirSync(full)
    .filter((f) => f.endsWith(ext) && !f.startsWith('_'))
    .map((f) => join(full, f));
}

const jsEntries = () => entries('src/client', '.ts');
const cssEntries = () => [join(root, 'src/styles/app.css'), ...entries('src/styles/pages', '.css')];

const url = (file: string) => '/assets/' + relative(assetsDir, resolve(root, file)).split('\\').join('/');

function i18nPlugin(lang: Lang): esbuild.Plugin {
  return {
    name: 'i18n-' + lang,
    setup(b) {
      b.onLoad({ filter: /[\\/]src[\\/]client[\\/].*\.ts$/ }, (args) => {
        let code = toJs(readFileSync(args.path, 'utf8'), args.path);
        const warnings: esbuild.PartialMessage[] = [];
        if (lang === 'en') {
          const r = inlineTranslations(code, readEn());
          code = r.code;
          for (const m of r.missing) warnings.push({ text: `missing en translation: ${m}` });
        }
        return { contents: code, loader: 'js', resolveDir: dirname(args.path), warnings };
      });
    },
  };
}

function recordJs(lang: Lang, meta: esbuild.Metafile) {
  for (const [out, info] of Object.entries(meta.outputs)) {
    if (!info.entryPoint || !out.endsWith('.js')) continue;
    const name = basename(info.entryPoint).replace(/\.ts$/, '');
    (manifest.js[name] ??= {})[lang] = url(out);
  }
}

function fontKey(file: string): string {
  return basename(file)
    .replace(/\.woff2$/, '')
    .replace(/-(standard|wght)-normal$/, '')
    .replace(/^martian-mono/, 'martian');
}

function recordCss(meta: esbuild.Metafile) {
  for (const [out, info] of Object.entries(meta.outputs)) {
    if (info.entryPoint && out.endsWith('.css')) manifest.css[basename(info.entryPoint).replace(/\.css$/, '')] = url(out);
    if (out.endsWith('.woff2')) {
      const input = Object.keys(info.inputs)[0];
      if (input) manifest.fonts[fontKey(input)] = url(out);
    }
  }
}

function writeManifest() {
  mkdirSync(pub, { recursive: true });
  writeFileSync(join(pub, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

const jsOptions = (lang: Lang): esbuild.BuildOptions => ({
  entryPoints: jsEntries(),
  outdir: assetsDir,
  entryNames: `[name].${lang}-[hash]`,
  chunkNames: `chunks/[name].${lang}-[hash]`,
  bundle: true,
  splitting: true,
  format: 'esm',
  target: ['es2020', 'safari15'],
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  metafile: true,
  logLevel: 'warning',
  plugins: [i18nPlugin(lang)],
});

const cssOptions: esbuild.BuildOptions = {
  entryPoints: cssEntries(),
  outdir: assetsDir,
  entryNames: '[name]-[hash]',
  assetNames: 'fonts/[name]-[hash]',
  bundle: true,
  minify: !watch,
  metafile: true,
  logLevel: 'warning',
  loader: { '.woff2': 'file', '.svg': 'file', '.png': 'file', '.jpg': 'file', '.webp': 'file' },
};

function copyPublic() {
  const src = join(root, 'public');
  if (existsSync(src)) cpSync(src, pub, { recursive: true });
}

async function buildOnce() {
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(assetsDir, { recursive: true });
  copyPublic();

  const [tr, en, css] = await Promise.all([
    esbuild.build(jsOptions('tr')),
    esbuild.build(jsOptions('en')),
    esbuild.build(cssOptions),
  ]);
  const missing = en.warnings.filter((w) => w.text.startsWith('missing en'));
  if (missing.length) {
    console.error(missing.map((w) => w.text).join('\n'));
    throw new Error('client strings without English translation');
  }
  recordJs('tr', tr.metafile!);
  recordJs('en', en.metafile!);
  recordCss(css.metafile!);
  writeManifest();

  await esbuild.build({
    entryPoints: { index: join(root, 'src/server/index.ts'), cli: join(root, 'src/server/cli.ts') },
    outdir: join(dist, 'server'),
    platform: 'node',
    target: 'node22',
    format: 'esm',
    bundle: true,
    packages: 'external',
    sourcemap: true,
    logLevel: 'warning',
  });

  const size = (n: string) => (existsSync(n) ? readFileSync(n).length : 0);
  const rows = [
    ...Object.entries(manifest.css).map(([k, v]) => [`css ${k}`, v]),
    ...Object.entries(manifest.js).flatMap(([k, v]) => LANGS.map((l) => [`js ${k}.${l}`, v[l] ?? ''])),
  ];
  for (const [k, v] of rows) console.log(`${k?.padEnd(16)} ${String(size(join(pub, v ?? ''))).padStart(7)} B  ${v}`);
  console.log(`fonts            ${Object.keys(manifest.fonts).length} files`);
}

async function buildWatch() {
  mkdirSync(assetsDir, { recursive: true });
  copyPublic();
  const onEnd = (record: (m: esbuild.Metafile) => void): esbuild.Plugin => ({
    name: 'manifest',
    setup(b) {
      b.onEnd((r) => {
        if (r.metafile) {
          record(r.metafile);
          writeManifest();
          console.log('[build] ' + new Date().toLocaleTimeString('en-GB'));
        }
      });
    },
  });
  const ctxs = await Promise.all([
    ...LANGS.map((l) => {
      const o = jsOptions(l);
      return esbuild.context({ ...o, plugins: [...(o.plugins ?? []), onEnd((m) => recordJs(l, m))] });
    }),
    esbuild.context({ ...cssOptions, plugins: [onEnd(recordCss)] }),
  ]);
  await Promise.all(ctxs.map((c) => c.watch()));
  console.log('[build] watching src/client and src/styles');
}

await (watch ? buildWatch() : buildOnce());
