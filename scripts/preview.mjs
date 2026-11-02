// npm run preview · the built site on :3000 with the sample content in a fresh local database.
// Used by GitHub Codespaces (docs/ONIZLEME.md). Production runs from Docker instead.
import { randomBytes } from 'node:crypto';
import { rmSync } from 'node:fs';
import { spawn } from 'node:child_process';

const port = process.env.PORT ?? '3000';
const { CODESPACE_NAME: name, GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: domain } = process.env;
const codespace = Boolean(name && domain);
// Forms only accept posts from the site's own address: in a codespace that is the forwarded URL.
const site = codespace ? `https://${name}-${port}.${domain}` : `http://localhost:${port}`;
// The panel needs a password · a fresh one each time unless PANEL_PASSWORD is given.
const password = process.env.PANEL_PASSWORD || randomBytes(6).toString('base64url');

// Start from the sample content every time, so a preview always matches its branch.
rmSync('data/preview', { recursive: true, force: true });

const env = {
  ...process.env,
  NODE_ENV: 'production',
  HOST: '0.0.0.0',
  PORT: port,
  SITE_URL: site,
  // Codespaces rewrites every request's Origin to the local address: the forms · the panel and
  // the statistics accept it in the preview (src/server/origin.ts).
  EXTRA_ORIGINS: codespace ? `localhost:${port}` : '',
  DATA_DIR: 'data/preview',
  DATABASE_URL: 'pglite://data/preview/pglite',
  SEED: 'sample',
  PANEL_PASSWORD: password,
};
console.log(`\n  Lost Comma preview → ${site}\n  Panel → ${site}/panel · şifre: ${password}\n`);
const server = spawn('node', ['dist/server/index.js'], { stdio: 'inherit', env });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.kill(sig));
server.on('exit', (code) => process.exit(code ?? 0));
