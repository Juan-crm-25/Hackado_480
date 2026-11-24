<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Data rules (read before touching data or AI-generated content)

The database is the single source of truth. Full reference: [`docs/bbdd/README.md`](docs/bbdd/README.md).

- PostgreSQL (Neon, EU) with Drizzle. The schema lives in `src/lib/db/schema/` (one file per block) and migrations in `drizzle/`.
- To change the schema: edit the TypeScript schema → `npm run db:generate` → review the generated SQL → `npm run db:migrate`. One migration per PR; never edit an applied migration.
- Do not create new data files in `data/`. The existing ones are seed sources only and will be removed once the code reads from the database.
- Fill exactly the fields each table defines, with its types and formats. Do not add fields or store free-form JSON "just in case".
- AI never writes to the database or chooses ids. It returns JSON; code validates it (`src/lib/agentes/`), resolves foreign keys and inserts. If validation fails, nothing is saved.
- Generated material is created once: look it up first, generate only if missing, insert with `ON CONFLICT DO NOTHING`, always set `modelo` and `generado`.
- Images go to Cloudflare R2 (only the URL is stored). Videos stay on YouTube (only the link is stored). Payments use Stripe in test mode; enrollments from purchases are created only by the verified Stripe webhook.
- Schema changes are contract changes: one Drizzle migration per PR, and warn the team before merging.

## Testing rules (mandatory)

- **No feature or bug fix without tests.** Write the test first, run it and see it fail for the expected reason, then implement until it passes (TDD).
- **A change is not done until its tests pass.** Never report work as finished, commit it or open a PR with failing or unrun tests.
- **Run only the tests the change affects**, not the whole suite on every change:
  - the test file you wrote or changed: `npx vitest run src/lib/db/client.test.ts`
  - tests that import the files you changed: `npx vitest related --run <changed files>`
  - code that reads data files (VTT, JSON) is not in the import graph: find its tests by name (e.g. `grep -rl transcripcion src --include=*.test.ts`) and run them.
- Run the full suite (`npm test`), `npx tsc --noEmit` and `npm run lint` once before opening or updating a PR.
- Tests that need the database use a throwaway database in the local Docker container, never the developer's `hackado` database and never production.
