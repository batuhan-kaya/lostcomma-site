# lostcomma.co

Studio site for Lost Comma. Node 22 · Fastify 5 · TypeScript · server-rendered HTML with small client modules.

- Build plan and phases: [docs/PLAN.md](docs/PLAN.md)
- Conventions and commands: [CLAUDE.md](CLAUDE.md)

```bash
npm ci
npm run dev        # http://localhost:3000
npm run check      # typecheck · i18n · unit · build · e2e
```

Production: `docker compose up -d --build` (listens on 127.0.0.1:3300 behind the reverse proxy).
