# Risen Hub — Claude Code handoff and full build specification

Last updated: 20 September 2026 (revised after the routing, schema and visual-system session)

## 0. Mission

Continue the existing `arenttodal/risen-hub` application into one coherent operating system for Risen farm. Do not rebuild from scratch. Preserve the working public page, Cloudflare Worker deployment, RSVP endpoint and current visual identity while replacing placeholders incrementally with real workflows.

The platform must answer:

1. What needs attention now?
2. What can we do with the people, time and money available?
3. What documentation, funding or decisions are missing?
4. What is safe and useful to publish publicly?

The global assistant is named **Josefa**, after the woman who owned Risen approximately 100 years ago. Never call the user-facing assistant “Risen Assistant”, “AI Assistant” or “Assistant” by itself.

## 1. Current state — inspect before changing

Live production route: `https://risen-hub.arentto.workers.dev/hub`

Repository facts:

- Vinext + React 19 + TypeScript + Vite.
- Cloudflare Worker deployment is working.
- D1 binding is named `DB`.
- Migrations live in `drizzle/`. `0000` creates the RSVP table; `0001` adds
  `places`, `projects`, `milestones`, `work_items` and `activity_log`.
- `/` is the public prototype and still renders hard-coded projects.
- `/hub` and every module are real routes under a shared layout
  (`app/hub/layout.tsx`). Sidebar navigation no longer uses local state.
- `/hub/projects` and `/hub/projects/[id]` read real records.
- Work, Funding, Farm, Events, Community and Public are routed with deliberate
  empty states that name the records they will own.
- All reads go through `lib/risen/repository.ts`. With no D1 binding it falls
  back to the seed in `data/risen.ts` and labels it on screen.
- Josefa is a client-side placeholder; no model endpoint exists. She states
  plainly that nothing was retrieved rather than implying a real answer.
- Search and some overview actions are still inert.
- Authentication is intentionally absent.
- `npm run build`, `npm run lint`, `npm run typecheck` and `npm test` all pass.
- `npm run db:local` migrates and seeds the local Miniflare D1 standalone.

### Deploy: D1 needs a real database id

Setting `.openai/hosting.json` `"d1": "DB"` on its own **breaks the deploy**.
`vite.config.ts` used to write the placeholder id
`00000000-0000-4000-8000-000000000000` into the built wrangler config, and
Cloudflare rejects it with error 10181.

`vite.config.ts` now emits the binding only when it has a real id:
`CLOUDFLARE_D1_DATABASE_ID` set as a build variable. Unset, `vite dev` uses the
placeholder (Miniflare accepts any id) and `vite build` emits no binding at all
plus a warning. A deployed worker without the binding falls back to the seed and
says so, which is a visible failure rather than a failed deploy.

To turn D1 on in production, see `docs/decisions/0001-d1-persistence.md`.
Migrations still have to be applied to the remote database by hand.

At the beginning of every session:

```bash
git status --short
npm clean-install
npm run build
```

Do not overwrite existing uncommitted changes. In particular, inspect `vite.config.ts`: it has been changed to remove the unavailable `.openai/hosting.json` dependency for Cloudflare builds.

## 2. Product principles

### One source of truth

`Project` is the central aggregate. Låven must exist once, not as separate records in Work, Funding and Public. Tasks, budgets, applications, documents, events, decisions and public updates reference its ID.

### Internal and public are separate projections

Public routes must never query unrestricted internal objects. An item becomes public only through an explicit publication record or approved public projection.

### Calm, ADHD-friendly workflow

- One dominant next action per view.
- Capture quickly; organize later.
- Default views show exceptions and readiness, not every field.
- Progressive disclosure instead of dense forms.
- Every record shows what is missing and what happens next.
- Avoid dashboards made only of statistics.

### Norwegian-first

Internal UI language is Norwegian. Existing English module labels can be migrated deliberately, but do not create a random mixture. Recommended final labels: Oversikt, Prosjekter, Arbeid, Finansiering, Gården, Arrangement, Fellesskap, Offentlig.

## 3. Visual system v3 — Evenant, mandatory

> **This supersedes visual system v2**, which specified Newsreader and IBM Plex,
> a rust `#c45732` accent and a 0–4 px panel radius. That system was replaced
> during the September 2026 build at the owner's direction: *"Follow the
> Evenant/Inter style guide from here on"* and *"keep the green accents, that is
> good to keep it specific to Risen. But the type etc needs to change."* The old
> section is recorded here only so nobody reintroduces it by reading an old
> copy. What follows is what `app/globals.css` and `app/hub.css` actually
> implement.

### Design intent

Warm paper, hairline structure, oversized tabular numbers, one accent colour.
Borders carry the structure; the shadow should be deniable. It should read as a
working instrument for a historic farm, not a SaaS dashboard.

Still avoid, unchanged from v2: soft purple, indigo or violet gradients; generic
hero layouts; sparkles, robot symbols and AI clichés; cards nested inside cards;
evenly distributed pastel colours; shadows used as the primary hierarchy
mechanism.

### Typography

- One family: `Inter`, via `--sans`. No serif display face.
- Headings are tightly tracked and heavy rather than large and light:
  `letter-spacing: -0.02em` to `-0.04em`, weights 600–700.
- **Every figure is tabular.** `.tnum` sets `font-variant-numeric: tabular-nums`
  with `letter-spacing: -0.02em`, and any number on screen wears it.
- Uppercase labels are small, rare and no more than `0.04em` tracking.

### Colour tokens

Defined on `:root` in `app/globals.css`:

```css
--bg: #F6F5F2;        /* warm paper, the page */
--card: #FFFFFF;
--line: #EBE9E3;      /* structural hairline */
--line2: #F1EFEA;     /* row separator, one step quieter */
--ink: #15151A;
--ink2: #43424A;
--mute: #8C8981;
--faint: #B4B0A8;
--accent: #2F4A37;    /* Risen forest green */
--accent-s: #E9EFE9;  /* the accent at panel strength */
--accent-deep: #22301F;  /* sidebar */
--pos: #16A34A;  --pos-bg: #E8F5EC;
--neg: #DC2626;  --neg-bg: #FCECEA;
--warn-bg: #FFF8E8;  --warn-line: #F0DFAE;  --warn-ink: #6B4E12;
```

Rules:

- **One accent, and for Risen it is the forest green.** It selects, links and
  fills primary buttons. It never also means "good".
- `--pos` and `--neg` judge direction only, and every delta carries an arrow or
  a word so colour is never the sole signal.
- `--accent-deep` owns the sidebar; `--bg` owns everything else.

### Shape

Three radii, no others:

| Token | Value | Used for |
| --- | --- | --- |
| `--r-card` | 20px | Panels and cards |
| `--r-in` | 14px | Tiles, inputs, notices |
| — | 999px | Anything you can click: buttons, pills, chips, toggles |

`--sh` is a single near-invisible shadow. Structure comes from `--line`.

### Josefa visual identity

Unchanged from v2: book metaphor rather than robot or sparkle, a right-side
drawer on desktop and a full-height sheet on mobile, structured notes with
citations rather than chat bubbles, ruled text rows rather than pills, and the
header label `Josefa` with the quiet descriptor `Risen-assistenten`.

### Design acceptance criteria

- No purple or blue AI gradient anywhere.
- Only the three radii above appear in `/hub`.
- No `Sparkles` or `Bot` icon in Josefa UI.
- Every number carries `.tnum`.
- A screenshot stays recognisably Risen with the icons removed.
- Desktop, tablet and 390 px mobile all work, with no horizontal page scroll.

## 4. Target route architecture

```text
/
/projects/[slug]
/updates/[slug]
/events/[slug]
/hub
/hub/projects
/hub/projects/[id]
/hub/work
/hub/funding
/hub/funding/applications/[id]
/hub/farm
/hub/farm/[buildingOrAreaId]
/hub/events
/hub/community
/hub/public
```

Replace local `active` state in `HubShell` with real routes. Keep a shared server-rendered hub layout. Active navigation derives from pathname. Each route must support direct loading, refresh and browser back/forward.

## 5. Data model and D1

Use Drizzle with Cloudflare D1. Extend the existing schema through new numbered migrations; never edit an already-applied production migration.

Minimum tables:

### Identity and access-ready tables

- `users`: id, email, display_name, avatar_url, created_at, updated_at.
- `memberships`: id, user_id, role (`admin|member|volunteer`), status.
- Actor fields on mutations may initially be nullable/system until auth is enabled.

### Farm source of truth

- `places`: id, slug, name, type (`building|area|room|land`), parent_id, description, condition, visibility.
- `assets`: id, place_id, name, category, condition, notes.
- `documents`: id, title, file_key/url, mime_type, source, verified_at, visibility, created_at.
- `document_links`: document_id plus one typed relation target.

### Projects and work

- `projects`: id, slug, name, summary, status, place_id, owner_id, start_date, target_date, visibility, public_summary, created_at, updated_at.
- `project_milestones`: id, project_id, title, status, due_at, sort_order.
- `work_items`: id, project_id, place_id, type (`task|repair|purchase|dugnad`), title, description, status, priority, assignee_id, duration_minutes, weather_dependency, due_at, created_at, updated_at.
- `work_requirements`: work_item_id, requirement type, value.
- `activity_log`: id, actor_id, entity_type, entity_id, action, payload_json, created_at.

### Money and funding

- `budget_lines`: id, project_id, category, description, estimated_nok, actual_nok, funding_status.
- `funding_schemes`: id, name, provider, source_url, eligibility_summary, deadline_rule, verified_at, status.
- `applications`: id, scheme_id, project_id, status, deadline_at, requested_nok, owner_id, readiness_score, updated_at.
- `application_sections`: id, application_id, key, title, body, status, source_notes.
- `application_requirements`: id, application_id, title, status, document_id, required.
- `funding_angles`: id, title, description, strength, verification_status, missing, source_url, verified_at.
- `funding_angle_projects`: angle_id, project_id.
- `volunteer_entries`: id, project_id, user_id/name, date, minutes, work_item_id, notes.

### Events and community

- `events`: id, project_id, slug, title, description, starts_at, ends_at, capacity, visibility, publication_status.
- Keep existing `rsvps`; migrate later to reference `event_id` while preserving current data.
- `event_shifts`: id, event_id, title, starts_at, ends_at, capacity, skill.
- `shift_signups`: id, shift_id, user_id/name/email, status.
- `proposals`: id, title, body, status, created_by, closes_at, visibility.
- `votes`: proposal_id, user_id, choice, created_at, unique proposal/user.
- `decisions`: id, proposal_id, title, summary, decided_at.

### Public publishing

- `publications`: id, entity_type, entity_id, slug, status (`draft|review|published|archived`), payload_json, published_at, approved_by.
- `public_updates`: id, project_id, slug, title, body, visibility, published_at.
- `campaigns`: id, project_id, target_nok, raised_nok, status, provider_reference.

### Josefa

- `assistant_threads`: id, user_id, title, created_at, updated_at.
- `assistant_messages`: id, thread_id, role, body, citations_json, created_at.
- `assistant_actions`: id, thread_id, tool, input_json, preview_json, status (`proposed|confirmed|executed|rejected|failed`), actor_id, created_at.

All mutations require Zod or equivalent validation. Add indexes for foreign keys, status, deadlines and slugs. Use ISO UTC timestamps. Monetary values are integer NOK, never float.

## 6. API/service architecture

Keep database access server-side. UI components call typed server endpoints/services.

Required service boundaries:

- `project-service`: list, get, create, update, publish projection.
- `work-service`: capture, assign, status transition, ready-work query.
- `funding-service`: schemes, applications, requirements, readiness calculation.
- `farm-service`: places, assets, documents.
- `event-service`: events, capacity, RSVP and shifts.
- `publication-service`: preview, approve, publish, archive.
- `josefa-service`: retrieval, citations, tool proposal and confirmed execution.

Return a consistent envelope for mutation errors. Do not swallow D1 errors into a permanent “temporarily unavailable” state without logging a safe diagnostic server-side.

## 7. Feature build order

### Phase A — stabilize foundation

1. Preserve current build and deployment.
2. Finish visual system v2 across public and hub surfaces.
3. Convert sidebar to real routes and shared layout.
4. Add reusable page header, ruled section, empty state, error state, skeleton and confirmation dialog.
5. Add D1 schema and seed command for non-production placeholder data.
6. Add tests for public/internal projection and core status transitions.

Exit: every module has a real URL and a deliberate empty state; build/lint/tests pass.

### Phase B — Projects as the backbone

1. `/hub/projects`: searchable table/list with status, place, owner, next action and readiness.
2. Quick-create project with only name, place and outcome required.
3. `/hub/projects/[id]` tabs: Oversikt, Arbeid, Finansiering, Budsjett, Filer, Offentlig.
4. Project overview shows goal, next milestone, blockers, budget and recent activity.
5. Replace overview placeholder project rows with D1 data.

Exit: a project can be created, edited and linked to work/budget without duplicated records.

### Phase C — Work and dugnad

1. Universal `Ny sak` capture available from every hub route.
2. Work inbox with filters: Inbox, Klar nå, Trenger avklaring, Neste dugnad, Innkjøp, Sted, Person.
3. Status flow: inbox → planned → ready → in_progress → blocked → done.
4. Dugnad planner filters by people, time, skills, weather and available materials.
5. Completion can create an activity entry and draft public update.

Exit: the user can capture a repair in under 20 seconds and plan a weekend from ready work.

### Phase D — Funding operations

1. Scheme library with source URL, verification date and stale indicator.
2. Application detail with sections, requirements, attachments, budget and readiness score.
3. Funding-angle inbox with classification and project linking.
4. Volunteer-hour ledger and project financing summary.
5. Deadline calendar and overdue/stale handling.

Never invent eligibility, deadlines or safety claims. Mark unverified material explicitly.

Exit: TEFT-like applications can be tracked from idea to submitted with a visible missing-items list.

### Phase E — Farm, files and history

1. Place hierarchy for farm, buildings, rooms and land.
2. Condition log with dated photos and professional assessments.
3. Document library with typed links and verification metadata.
4. Historical timeline suitable for both internal evidence and public storytelling.
5. Add R2 only when actual file upload is implemented; D1 stores metadata, not binary files.

Exit: a document or image is stored once and can support projects, applications and public updates.

### Phase F — Events and community

1. Event CRUD, programme, capacity, RSVP and volunteer shifts.
2. Preserve existing public RSVP compatibility during migration.
3. Association members, proposals, voting and recorded decisions.
4. Notification preferences, but no unsolicited messaging.

Exit: one event can be published, accept RSVP and allocate volunteer shifts.

### Phase G — Controlled public publishing

1. Replace hard-coded public projects with publication projections.
2. Public project page includes story, transparent budget, milestones and updates.
3. Internal preview shows exactly what the public will see.
4. Publishing requires explicit confirmation and logs approver/time.
5. Add crowdfunding provider only after legal/payment requirements are decided; never store card data.

Exit: internal changes cannot leak automatically and approved updates publish without duplicate entry.

### Phase H — Josefa

Build Josefa after Projects, Work and Funding expose stable read services.

First tools:

- `search_risen(query, filters)`
- `get_project(project_id)`
- `list_ready_work(people, duration, date, weather)`
- `audit_application(application_id)`
- `classify_funding_angle(text, project_ids)`
- `draft_application_section(application_id, section)`
- `draft_public_update(project_id, activity_ids)`
- `propose_work_item(input)`

Rules:

- Provider keys only on the server.
- Retrieval answers cite exact Risen records and external sources where relevant.
- Read tools may run immediately.
- Every write is first shown as a proposed diff/action.
- User confirmation is required before execution.
- Publishing, deleting and permission changes always require explicit confirmation.
- Josefa states uncertainty and never fabricates farm history or funding facts.

Exit: Josefa can answer “Hva bør vi prioritere denne helgen?” from real data and propose, but not silently perform, changes.

### Phase I — Authentication and permissions

Implement before storing real private/member data.

1. Obtain final domain.
2. Configure Google OAuth callback URLs for production and preview.
3. Use a server-managed session with secure, HTTP-only cookies.
4. Roles: admin, member, volunteer, public.
5. Enforce authorization in services and queries, never only in UI.
6. Add audit logging for publishing, funding submissions, votes and role changes.

Cloudflare Access can protect the whole preview during development, but it does not replace application-level authorization for per-role data.

## 8. Global search and capture

Search opens as a keyboard-accessible command surface and searches projects, work, places, funding, documents and events. Results are grouped by object type and show the reason for the match.

Quick capture accepts natural short input but always resolves to a typed record. Minimum fields: title, type and project/place. Unknown relations go to Inbox rather than being guessed.

Keyboard targets:

- `/` focuses search when not typing.
- `N` opens quick capture.
- `J` opens Josefa.
- `Esc` closes the topmost surface.

## 9. Testing and quality bar

For every phase:

- Typecheck/build succeeds.
- Critical service rules have unit tests.
- CRUD happy path and failure path are tested.
- Desktop and 375 px mobile are checked.
- Keyboard navigation and visible focus work.
- Empty, loading, offline/unavailable and permission-denied states exist.
- Public pages are checked for accidental private fields.
- Dates use Norwegian locale and correct timezone presentation.
- D1 migrations are additive and repeatable on a clean database.

Before handoff or commit:

```bash
npm run format
npm run lint
npm run build
git diff --check
git status --short
```

If scripts are missing, add the narrowest appropriate script instead of skipping verification.

## 10. Commit strategy

Make small commits that can be reviewed or reverted independently:

1. `style: establish editorial visual system and Josefa identity`
2. `feat: add routed hub shell`
3. `feat: add core D1 project schema`
4. `feat: implement project list and detail`
5. `feat: implement work capture and inbox`

Never combine schema migration, broad visual rewrite and unrelated feature work in one commit.

## 11. Immediate next session checklist

Items 1-9 below were worked in order. Status as of this revision:

1. ~~Review uncommitted visual/Josefa diff; preserve the Cloudflare
   `vite.config.ts` fix.~~ **No such diff existed** — the working tree was
   clean and `git log --all` held only the two upload commits. The
   `vite.config.ts` change described in section 1 was also not in the
   repository; it still imported `.openai/hosting.json`. That import is now
   guarded rather than removed (see the deploy note in section 1).
2. ~~Run formatter, lint and build.~~ Done. `npm run lint` used to scan
   `node_modules`; `.oxlintrc.json` scopes it now.
3. ~~Verify `/` and `/hub` at desktop and mobile widths.~~ Done, by screenshot
   at 1440px and 390px, checking for console errors and horizontal overflow.
4. ~~Apply visual tokens to remaining public-page Arial/Georgia literals.~~ Done.
5. ~~Replace sidebar state with real `/hub/*` routes.~~ Done.
6. ~~Shared hub layout and a useful empty state for every module.~~ Done.
7. ~~Migrate core tables.~~ Done as `drizzle/0001`. Note: the table is named
   `milestones`, matching this checklist, not `project_milestones` as section 5
   writes it. Reconcile the two before building on it.
8. ~~Seed the demo projects and tasks.~~ Done, via `npm run db:local`.
9. ~~Implement `/hub/projects` and `/hub/projects/[id]`.~~ Done, read-only.
10. Keep updating this document.

### Next, in order

1. **Write path for Projects and Work.** Everything is read-only. This blocks
   most of Phase B and all of Phase C. Mutations must write `activity_log` and
   be reversible or confirmed.
2. **Universal `Ny sak` capture** (section 8), available from every hub route.
3. **Work inbox and dugnad planner** (Phase C). The records exist; the views do not.
4. **Project detail tabs** (Oversikt, Arbeid, Finansiering, Budsjett, Filer,
   Offentlig). The detail page uses sections today because most tabs would be
   empty; add them as nested routes once there is content.
5. **Schema gap against section 5.** Still missing: `users`, `memberships`,
   `assets`, `documents`, `document_links`, `budget_lines`, `funding_schemes`,
   `applications`, `application_sections`, `application_requirements`,
   `funding_angles`, `volunteer_entries`, `events`, `event_shifts`,
   `shift_signups`, `proposals`, `votes`, `decisions`, `publications`,
   `public_updates`, `campaigns`, and the three `assistant_*` tables. Also:
   `projects` currently carries `budget_nok`/`funded_nok`, which section 5 puts
   in `budget_lines`, and `places` uses `kind` where section 5 says `type` and
   has no `parent_id`. Add these additively in `0002`+; never edit `0001`.
6. **Funding module.** Add `source_url`, `verified_at` and status before
   importing anything. The four deadlines in `data/risen.ts` have no source and
   are labelled unverified in the interface; the 10/15 September 2026 deadlines
   must be marked passed.
7. **Public projection.** `/` still renders hard-coded projects; replace with a
   published-fields-only query (Phase G).
8. **Josefa's server endpoint**, only after the read services are stable.
9. **Authentication**, last.

### Open questions for a human

- **Remote migrations.** Applying `drizzle/*.sql` to the deployed D1 is manual.
  Automate it in the deploy command before real data is entered.
- **`next.config.ts` and `next-env.d.ts`** are vestigial; the build is `vinext`.
- **Public page language.** The public prototype is still English while the hub
  is Norwegian. Section 2 covers the internal UI only, so this is undecided.

## 12. Do not do yet

- Do not add Google OAuth before the domain and role model are ready.
- Do not connect an AI provider before server-side retrieval and permission boundaries exist.
- Do not add payments before publication and campaign ownership are defined.
- Do not import large funding datasets without source and verification metadata.
- Do not redesign the public site independently from the shared visual tokens.
- Do not delete the existing RSVP flow during event migration.

## 13. Definition of platform complete

Risen v1 is complete when Arn and collaborators can:

1. create a project once;
2. connect its place, work, budget, documents and funding;
3. plan and record dugnad work;
4. manage an application with evidence and readiness;
5. run an event with RSVP and shifts;
6. make and preserve community decisions;
7. publish an approved public projection and progress update;
8. ask Josefa questions across those records with citations;
9. confirm any action Josefa proposes before it writes;
10. use the system securely on desktop and mobile without private data leaking publicly.
