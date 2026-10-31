import { defineConfig } from 'drizzle-kit';

// Only used to generate migrations (npm run db:generate). No database connection needed.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  casing: 'snake_case',
  strict: true,
});
