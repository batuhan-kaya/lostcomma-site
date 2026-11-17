/**
 * npm run mock -- list                  the photo slots of the service mocks and which are filled
 * npm run mock -- <name> <file>         crop a photo to its slot · writes src/images/<name>.webp
 * npm run mock -- <name> <file> --top   keep the top of the photo (portraits) · default: centre
 *
 * The slots live in src/server/pages/home/pictures.ts. Commit the .webp · the build hashes it.
 */
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { PICTURES, type PictureName } from '../src/server/pages/home/pictures';

const root = resolve(import.meta.dirname, '..');
const dir = join(root, 'src/images');
const [name, file, ...flags] = process.argv.slice(2);

if (!name || name === 'list') {
  for (const [n, p] of Object.entries(PICTURES)) {
    const out = join(dir, n + '.webp');
    const has = existsSync(out) ? `${Math.round(statSync(out).size / 1024)} kB` : '·';
    console.log(`${n.padEnd(12)} ${`${p.w} × ${p.h}`.padEnd(11)} ${has.padEnd(7)} ${p.what}`);
  }
  process.exit(0);
}

if (!(name in PICTURES) || !file) {
  console.error('usage: npm run mock -- <name> <file> [--top]\n       npm run mock -- list');
  process.exit(1);
}

const slot = PICTURES[name as PictureName];
mkdirSync(dir, { recursive: true });
const out = join(dir, name + '.webp');
const info = await sharp(resolve(file))
  .rotate()
  .resize(slot.w, slot.h, { fit: 'cover', position: flags.includes('--top') ? 'top' : 'attention' })
  .webp({ quality: 'q' in slot ? slot.q : 80, effort: 6 })
  .toFile(out);
console.log(`${name}: ${info.width} × ${info.height} · ${Math.round(info.size / 1024)} kB → src/images/${name}.webp`);
