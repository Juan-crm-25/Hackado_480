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
  - code that reads data files (VTT, JSON) is not in the import graph: search the test files for the name of the module or data you changed and run those.
- Run the full suite (`npm test`), `npx tsc --noEmit` and `npm run lint` once before opening or updating a PR.
- Tests that need the database use a throwaway database in the local Docker container `hackado-db` (`npm run db:up`), created and dropped by the test itself, never the developer's `hackado` database and never production. Setup: [`docs/bbdd/README.md`](docs/bbdd/README.md), section 5.

## API architecture (read before creating an endpoint)

Full reference: [`docs/arquitectura.md`](docs/arquitectura.md).

- `src/app/api/**/route.ts` is a thin HTTP adapter built with `ruta()` from `src/server/compartido/http`: session → access level → Zod validation → service → JSON. No business logic, no DB queries, no AI calls there.
- Business logic lives in `src/server/<module>/servicio.ts`, DB queries only in `src/server/<module>/repositorio.ts`, input schemas in `esquemas.ts`. Every file in `src/server/` starts with `import "server-only"`.
- Two separate checks: role (`publico`, `usuario`, `alumno`, `profesor`, `admin`; admin ⊃ profesor ⊃ alumno) in `ruta()`; ownership/enrollment of the specific resource in the service (`requerirAccesoCurso()`, `requerirProfesorDelCurso()` from `src/server/matriculas`). The global `profesor` role never grants access to every course: teacher endpoints also check the teacher teaches THAT course. `admin` always passes both checks, on every course, without an enrollment. Missing session → 401, not allowed → 403.
- Enrollments are keyed by email and only linked to a user whose email is verified. The Stripe webhook is idempotent and transactional. Forum AI validation runs with `after()` and never overwrites a teacher's decision. Details: `docs/arquitectura.md`.
- `src/proxy.ts` (Next 16 name for middleware) only does optimistic cookie checks and redirects for pages. It is never the authorization layer.
- Errors are `ErrorApp` with a `codigo`; `ruta()` maps them to HTTP status and `{ error, codigo, detalles? }`.
- Existing endpoints keep working; migrate them to this structure one per PR without breaking `src/lib/types.ts`.
