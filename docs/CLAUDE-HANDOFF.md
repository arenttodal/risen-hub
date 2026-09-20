# Claude handoff

Living record of where Risen Hub actually is, what was decided and why, and
what to do next. Update this file whenever an architectural decision changes.

Read `CLAUDE.md` first for the non-negotiable rules, then
`docs/PLATFORM-SPEC.md` for the full plan. This file is the state of play
between the two.

Last updated: 2026-09-20.

## Note on this file's history

This document did not exist before 2026-09-20. A session was asked to follow
its "Immediate next session checklist", but no such file had ever been
committed — `git log --all` showed only two commits, `Add files via upload`
and `Add hosting.json configuration file`, neither containing it. There was
also no uncommitted Josefa/editorial design diff to review; the working tree
was clean. The work in that session was therefore driven by the explicit task
list and by `docs/PLATFORM-SPEC.md` section 11.

## Verification commands

```bash
npm install
npm run typecheck   # tsc --noEmit
npm run lint        # oxlint, scoped to project sources
npm test            # node --test, needs Node >= 22.18
npm run build       # vinext build — the definition-of-done gate
npm run dev         # http://localhost:3000
```

`npm run db:local` applies migrations and the seed to the local Miniflare D1.
It needs `npm run build` to have run at least once, because it reuses the
Wrangler config the build generates.

## Current state

### Routing

The hub is real nested routes, not component state. `app/hub/layout.tsx` holds
the shell, so the sidebar, topbar and assistant panel persist across
navigation instead of remounting.

| Route | State |
|---|---|
| `/` | Public page. Unchanged. Working preview with sample copy. |
| `/api/rsvp` | Working. Was permanently broken before D1 was bound. |
| `/hub` | Overview, reads through the repository. |
| `/hub/projects` | Project list from the canonical records. |
| `/hub/projects/[slug]` | Detail: summary, place, milestones, related work, budget. |
| `/hub/work` | Intentional empty state. |
| `/hub/funding` | Intentional empty state. |
| `/hub/farm` | Intentional empty state. |
| `/hub/events` | Intentional empty state. |
| `/hub/community` | Intentional empty state. |
| `/hub/public` | Intentional empty state. |

`components/risen/hub-nav.ts` is the single source of truth for the nav. The
active item is resolved by longest matching prefix, so `/hub/projects/laven`
keeps `Projects` highlighted.

Empty states are not "coming soon" placeholders. Each names the records the
module will own and offers one concrete next action, so no route dead-ends.

### Persistence

Cloudflare D1, via Drizzle. See `docs/decisions/0001-d1-persistence.md`.

Tables: `places`, `projects`, `milestones`, `work_items`, `activity_log`, plus
the pre-existing `rsvps`. Migration `drizzle/0001_furry_tyrannus.sql` is purely
additive and does not touch `rsvps`.

`lib/risen/repository.ts` is the only read path. It uses D1 when a binding
exists and otherwise returns the seed and reports `source: 'seed'`, which
`DataSourceNotice` renders as a visible banner. A bound but empty database
reports "no projects" rather than quietly falling back to the seed.

`data/risen.ts` is the seed dataset: a bootstrap for an empty database and the
fallback for a missing one. It is not a second source of truth, and modules
must not read it directly instead of going through the repository.

## Decisions made, with reasons

1. **Route segments stay English; interface copy stays Norwegian.** The spec
   fixes the URLs in section 8; `CLAUDE.md` rule 7 fixes the product language.
   The sidebar labels are still English, inherited from the prototype — see
   the open question below.
2. **D1 binding enabled.** `.openai/hosting.json` had `"d1": null`, so every
   database call failed and the public RSVP had never worked. Setting it to
   `"DB"` is what `db/index.ts` documents and what fixed the endpoint.
3. **One repository, honest about provenance.** A silent seed fallback would
   pass illustrative numbers off as live records, which rule 8 forbids. The
   fallback is therefore labelled on screen.
4. **`category` rather than `area` on projects.** The seed used `area` for what
   is an editorial grouping (`Kulturarena`), which collided with `places` being
   the actual physical areas. Projects now carry `category` and an optional
   `place_id`.
5. **Priority ordering lives in the domain module.** Sorting the `priority`
   text column alphabetically yields urgent, normal, low, high. `byPriority`
   in `lib/risen/types.ts` ranks it properly and is unit tested.
6. **Actor columns before authentication.** `activity_log` already carries
   `actor_id`, `actor_name` and `actor_role`, per rule 5, so the trail does not
   need backfilling when sign-in arrives.
7. **Tests on Node's built-in runner.** No test dependency was added. This
   needs Node >= 22.18 for type stripping; `engines` still allows 22.13 for the
   build, so `npm test` will fail on 22.13–22.17.

## Next, in order

1. **Write path for Projects and Work.** Everything is read-only today. This is
   the blocker for most of what follows. Mutations must write `activity_log`
   rows and be reversible or confirmed.
2. **Universal quick capture** (spec ticket 3) — title, project or place, type,
   priority, nothing more.
3. **Work module screens** (`/hub/work`): Inbox, Ready now, Needs attention,
   Next dugnad. The records already exist; only the views are missing.
4. **Project detail tabs** (spec ticket 4). The detail page currently uses
   sections; tabs were deferred because most of them would have been empty.
   Add them as nested routes once Funding and Files have content.
5. **Funding module.** Add `source_url`, `verified_at` and a status to the
   scheme records before importing anything. Rule 8 is not optional here, and
   the 10/15 September 2026 deadlines must be marked passed.
6. **Public projection.** `/` still renders hard-coded projects. Replace them
   with a published-fields-only query over `projects` (spec ticket 10). Do not
   let the public route read internal rows directly.
7. **Authentication.** Only after the above. Hiding links is not security.

## Open questions for a human

- **Production migrations.** How `drizzle/*.sql` reaches the deployed D1 is
  unresolved. See the open question in ADR 0001. Settle it before any real
  data is entered.
- **Nav language.** Sidebar labels are English (`Overview`, `Projects`, `Work`)
  while all content is Norwegian. Rule 7 says Norwegian is the internal product
  language. Left unchanged to avoid rewriting the visual system unasked, but it
  is inconsistent and should be decided.
- **Deadlines.** The four in `data/risen.ts` have no source or verification
  date. They are labelled as unverified in the interface. They need real
  sources or removal before anyone plans against them.
- **`next.config.ts` and `next-env.d.ts`** are vestigial; the build is `vinext`.
  Harmless, but they mislead. Remove them or keep them deliberately.

## Guardrails that caught something

- `vite.config.ts` defers `import('@cloudflare/vite-plugin')` until after the
  Wrangler log-path environment variables are set, because Wrangler snapshots
  that path at import time. Do not hoist that import to the top of the file.
- The repository had no `.gitignore`, so `node_modules/`, `dist/`, `.next/`,
  `.vinext/` and `.wrangler/` were all untracked-but-committable. Added.
- `npm run lint` linted `node_modules` and produced thousands of warnings from
  dependencies. `.oxlintrc.json` now scopes it.
