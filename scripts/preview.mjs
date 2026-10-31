// npm run preview · the built site on :3000 with the sample content in a fresh local database.
// Used by GitHub Codespaces (docs/ONIZLEME.md). Production runs from Docker instead.
import { rmSync } from 'node:fs';
import { spawn } from 'node:child_process';

const port = process.env.PORT ?? '3000';
const { CODESPACE_NAME: name, GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: domain } = process.env;
// The brief only accepts posts from the site's own address: in a codespace that is the forwarded URL.
const site = name && domain ? `https://${name}-${port}.${domain}` : `http://localhost:${port}`;

// Start from the sample content every time, so a preview always matches its branch.
rmSync('data/preview', { recursive: true, force: true });

const env = {
  ...process.env,
  NODE_ENV: 'production',
  HOST: '0.0.0.0',
  PORT: port,
  SITE_URL: site,
  DATA_DIR: 'data/preview',
  DATABASE_URL: 'pglite://data/preview/pglite',
  SEED: 'sample',
};
console.log(`\n  Lost Comma preview → ${site}\n`);
const server = spawn('node', ['dist/server/index.js'], { stdio: 'inherit', env });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.kill(sig));
server.on('exit', (code) => process.exit(code ?? 0));
