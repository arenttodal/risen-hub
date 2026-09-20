# Risen Hub

One platform for the Risen farm: projects, day-to-day work, funding, farm
documentation, events, community and public storytelling.

## Routes

- `/` — public-facing Risen page, preserved from the existing prototype
- `/api/rsvp` — preview RSVP for the sample dugnad weekends
- `/hub` — internal overview
- `/hub/projects`, `/hub/projects/[slug]` — canonical project records
- `/hub/work`, `/hub/funding`, `/hub/farm`, `/hub/events`, `/hub/community`,
  `/hub/public` — routed, with empty states describing what each will own

## Run locally

```bash
npm install
npm run db:local  # apply migrations and seed the local D1 database
npm run dev
```

Open `http://localhost:3000/hub` for the internal platform.

Without `npm run db:local` the app still runs: reads fall back to the seed
dataset and the interface says so on screen.

Deploys bind D1 only when `CLOUDFLARE_D1_DATABASE_ID` is set to a real database
id; otherwise the build skips the binding rather than failing. See
`docs/decisions/0001-d1-persistence.md`.

## Checks

```bash
npm run typecheck
npm run lint
npm test          # needs Node >= 22.18
npm run build
```

## Data

`db/schema.ts` holds the schema; migrations are generated with
`npm run db:generate` and checked into `drizzle/`. All reads go through
`lib/risen/repository.ts`.

All dates, budgets, progress and funding numbers in `data/risen.ts` are
illustrative seed data. Do not expose API keys in client code. Read
`CLAUDE.md`, `docs/CLAUDE-HANDOFF.md` and `docs/PLATFORM-SPEC.md` before
extending the product.
