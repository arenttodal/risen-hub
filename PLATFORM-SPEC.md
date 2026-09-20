# Risen Platform Architecture v1

## 1. Product goal

Risen is the shared operating system for the farm. It should answer four questions quickly:

1. What needs attention now?
2. What can we do with the people, time and money available?
3. What documentation or funding work is missing?
4. What should be communicated publicly?

The product serves Arn and Walid first, then association members and volunteers, while exposing a deliberately limited public surface for crowdfunding and progress.

## 2. Information architecture

| Module    | Purpose                                   | Primary objects                            |
| --------- | ----------------------------------------- | ------------------------------------------ |
| Overview  | Focus, exceptions and next actions        | alerts, deadlines, activity                |
| Projects  | Canonical container for outcomes          | project, milestone, budget                 |
| Work      | Operational execution                     | task, repair, purchase, dugnad             |
| Funding   | Fundraising intelligence and applications | scheme, application, angle, requirement    |
| Farm      | Physical and historical source of truth   | building, area, condition, asset, document |
| Events    | Festival, residencies and gatherings      | event, shift, RSVP, programme              |
| Community | Association and collective decisions      | member, proposal, vote, decision           |
| Public    | Controlled publishing and crowdfunding    | public project, update, campaign           |
| Josefa    | Cross-platform query and action layer     | conversation, citation, proposed action    |

## 3. Core relational model

`Project` is the central aggregate. It links to tasks, costs, budgets, funding applications, documents, media, events, public updates and decisions. Building and area records describe physical places and may link to many projects.

Minimum IDs and relations:

- `project.id`
- `work_item.project_id`
- `budget_line.project_id`
- `application.project_id`
- `funding_angle.project_ids[]`
- `document.project_ids[]` and optional `building_id`
- `event.project_ids[]`
- `public_update.project_id`

Every publishable object must include visibility and publication state. Public pages must use a public projection/query, never unrestricted internal records.

## 4. Recommended technical foundation

- Vinext/React/TypeScript retained from the public prototype
- server routes for mutations and AI
- relational database (Cloudflare D1 for Sites, or Postgres/Supabase if selected later)
- object storage for photos, PDFs, offers and plans
- schema validation at all API boundaries
- migrations checked into source control
- provider-neutral assistant service with tool permissions

Do not choose Supabase merely for login. Make the persistence decision after validating expected file volume, offline needs, hosting and collaboration model.

## 5. Josefa

Josefa, named after the woman who owned Risen approximately 100 years ago, operates across modules. She should retrieve scoped records, cite the records used and propose actions before writing.

First tools:

- `search_risen(query, filters)`
- `get_project(project_id)`
- `list_ready_work(people, duration, date)`
- `audit_application(application_id)`
- `classify_funding_angle(text, project_ids)`
- `draft_application_section(application_id, section)`
- `draft_public_update(project_id, activity_ids)`
- `propose_task(input)`

Write tools require confirmation. Public publishing and destructive changes always require explicit confirmation. Assistant responses involving schemes must expose sources and verification dates.

## 6. Funding module

The Funding module contains:

- overview by project and readiness
- funding scheme database
- applications with reusable answer blocks
- funding angles / idea bank
- deadlines and verification state
- document requirements
- project-specific budgets and financing plans
- documented volunteer hours

Funding angle classification:

- core argument
- strong supporting argument
- relevant context
- weak fit
- currently ineligible cost
- needs professional verification

The initial Walid angle is stored as: separate hot work, dust and workshop activity from historic buildings intended for preservation and cultural use. Do not label current conditions unsafe without professional documentation.

## 7. Work module

One capture flow creates tasks, repairs, purchases or dugnad candidates. Required fields are deliberately small: title, project/place, type and priority. Details can be added later.

Useful saved views:

- Inbox
- Ready now
- Needs attention
- Next dugnad
- Purchases
- By building
- By person

The planning helper should filter by available people, skills, duration, weather dependency and required materials.

## 8. Public/internal model

Initial routes:

- `/` public narrative and projects
- `/projects/[slug]` public project/crowdfunding page
- `/updates/[slug]` public progress story
- `/hub` internal overview
- `/hub/projects`, `/hub/work`, `/hub/funding`, etc.

No login is required during the MVP. Before real private data is added, implement authentication and server-side authorization; hiding links is not security.

## 9. Migration map

| Existing prototype                     | Decision                                   |
| -------------------------------------- | ------------------------------------------ |
| Public imagery and narrative direction | Keep and evolve                            |
| Public project cards and ledgers       | Adapt to shared project data               |
| Public preview RSVP                    | Defer until event model is ready           |
| Internal sidebar and calendar concepts | Adapt, reduce density                      |
| Duplicate module-specific project data | Rebuild around canonical Project           |
| Local-only persistence                 | Replace after schema validation            |
| Funding research and templates         | Import with sources and verification dates |
| Risen Assistant concept                | Build as global platform layer             |

## 10. Delivery roadmap

### Phase 1 — foundation

- complete routing and shared shell
- database schema and seed/migration strategy
- CRUD for projects and work items
- global capture and search
- responsive/error/empty states

### Phase 2 — funding operations

- scheme and deadline records
- applications, answer blocks and requirements
- funding angles inbox
- budgets and volunteer-hour ledger
- source verification workflow

### Phase 3 — collaboration

- Google sign-in
- admin/member/volunteer roles
- assignments, comments, notifications and votes
- file upload and version history

### Phase 4 — public publishing

- select fields/updates for publication
- crowdfunding campaigns and payment integration
- public project progress derived from internal data
- communication drafts generated from completed work

### Phase 5 — assistant actions

- retrieval with citations
- application readiness audits
- weekend/dugnad planning
- safe, confirmed write actions
- recurring deadline and stale-data checks

## 11. Immediate next tickets

1. Convert navigation placeholders to real nested routes.
2. Define database schema for projects, work items, buildings and visibility.
3. Add universal quick capture.
4. Build project detail with tabs: Overview, Work, Funding, Budget, Files, Public.
5. Build Work inbox and dugnad planner.
6. Import funding schemes with source metadata and mark 10/15 September 2026 deadlines passed.
7. Build funding-angle capture and classification.
8. Add document requirement checklist and readiness score.
9. Add server-side assistant endpoint with mock provider adapter.
10. Replace public hard-coded projects with public project projections.

## 12. Guardrails for agents

Before coding, inspect current files and `git status`. Preserve existing public behavior and user data. Make small commits by domain. Never silently rewrite the visual system, introduce a second source of truth, fabricate funding facts, or expose secrets. When a choice changes hosting, persistence, security or data ownership, document it in an ADR under `docs/decisions/`.
