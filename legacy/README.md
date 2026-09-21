# Legacy source: Småbruk Støttehub

The static MVP this platform replaces, recovered on 20 September 2026 and kept
here verbatim as the source of truth for the import.

`app.js` holds the dataset: 6 project areas, 16 funding schemes, 21 document
requirements and 15 application templates. Nothing here is edited — the
importer normalises it instead, so re-running the import against a corrected
source stays possible.

## What is and is not in here

The archive carries the declared seed data only. The farm profile, budgets,
applications and task lists the owner typed into the old app lived in browser
localStorage and were never part of the export, so they cannot be recovered.
The importer must not invent them.

## Provenance and dates

`app.js` line 1 pins the snapshot: `const TODAY='2026-09-08'`. Every fact here
was current on **8 September 2026** and has not been checked since. Two
deadlines in the file have already passed relative to 20 September 2026:

- ARENA (Kulturrådet) — 15 September 2026
- Regionalt kulturfond, arrangement — 15 September 2026

Imported records therefore carry `legacy_mvp_2026_09_08` provenance and an
`unverified` or `stale` verification state. A date is never shifted forward to
make the interface look current; an expired deadline is shown as expired.
