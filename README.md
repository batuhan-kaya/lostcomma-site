# lostcomma.co

Studio site for Lost Comma. Node 22 · Fastify 5 · TypeScript · PostgreSQL · server-rendered HTML with small client modules.

- Build plan and phases: [docs/PLAN.md](docs/PLAN.md)
- Conventions and commands: [CLAUDE.md](CLAUDE.md)
- Images still needed: [docs/GORSELLER.md](docs/GORSELLER.md)

```bash
npm ci
npm run dev        # http://localhost:3000 · database in data/pglite with the sample content (no Docker needed)
npm run check      # typecheck · i18n · unit · build · e2e
```

Production: copy `.env.example` to `.env` · set `POSTGRES_PASSWORD` · `docker compose up -d --build`.
The site listens on 127.0.0.1:3300 behind the reverse proxy. Postgres has no published port.
