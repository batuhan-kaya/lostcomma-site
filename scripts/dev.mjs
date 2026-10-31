// npm run dev · client and CSS rebuild on change · server restarts on change · http://localhost:3000
import { spawn } from 'node:child_process';

const env = { ...process.env, NODE_ENV: 'development' };
const run = (args) => spawn('npx', args, { stdio: 'inherit', env });

const procs = [run(['tsx', 'scripts/build.ts', '--watch']), run(['tsx', 'watch', '--clear-screen=false', 'src/server/index.ts'])];

const stop = () => {
  for (const p of procs) p.kill('SIGTERM');
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
