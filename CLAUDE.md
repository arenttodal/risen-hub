# Risen coding instructions

This file is the working brief for Claude Code, Codex and other contributors.

## Product rule

Risen is one platform, not a bundle of separate apps. A project such as `Låven` exists once and is referenced by work items, budgets, applications, documents, events, donations and public updates.

## Non-negotiable architecture

1. Preserve the public/internal boundary. Public routes only read explicitly published fields.
2. Every domain object has `visibility: private | members | public` where relevant.
3. Do not build Funding, Work or Public with duplicate project records.
4. Keep AI calls server-side. Never expose provider keys in React components.
5. Do not add authentication yet, but keep actor/role fields ready for `admin`, `member`, `volunteer`, `public`.
6. Prefer calm, minimal interfaces. Reduce cognitive load: one clear next action, progressive disclosure, useful defaults.
7. Norwegian is the internal product language. Public content may later be localized.
8. Funding deadlines and eligibility claims require `sourceUrl`, `verifiedAt` and status; never present stale research as current.

## Development order

1. Shared domain schema and persistence.
2. Projects and Work workflows.
3. Funding hub and document requirements.
4. Assistant retrieval/actions with confirmations.
5. Public publishing controls.
6. Authentication and permissions.

## Definition of done

- responsive and keyboard accessible
- no regression to public route
- no duplicated source-of-truth records
- loading, empty and error states included
- mutations are reversible or confirmed
- tests cover domain rules and critical actions
- `npm run build` passes

See `docs/PLATFORM-SPEC.md` for the complete plan.
