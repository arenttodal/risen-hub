# Legacy import inventory

What the Småbruk Støttehub archive in `legacy/smabruk-stottehub/` actually
contains, where each part lands in Risen, and what it cannot tell us.

Counted from the source, not from the old README: **6 funding areas,
16 funding schemes, 21 document requirements, 15 application templates.**

## Provenance

`app.js` line 1 pins the snapshot: `const TODAY='2026-09-08'`. Every fact below
was current on **8 September 2026** and has not been rechecked since. Imported
records therefore carry `legacy_mvp_2026_09_08` as provenance and land
`unverified`, per CLAUDE.md rule 8: a deadline or eligibility claim needs
`sourceUrl`, `verifiedAt` and a status, and stale research is never presented as
current.

Two deadlines had already passed by 20 September 2026:

| Scheme | Deadline in source |
| --- | --- |
| `arena` — Bygg og infrastruktur (Kulturrådet) | 2026-09-15T13:00:00+02:00 |
| `mrf-arr` — Regionalt kulturfond, arrangement | 2026-09-15T23:59:00+02:00 |

These import as `passed`. **No date is moved forward to make the interface look
current.** An expired deadline is shown as expired.

## Mapping

| Legacy | Count | Risen destination |
| --- | --- | --- |
| `projects` (thematic areas) | 6 | `funding_angles` |
| `funds` | 16 | `funding_schemes` |
| `docs` | 21 | `document_requirements` |
| `templateLibrary` | 15 | `application_templates` |
| `funds[].area` | 27 pairs | `funding_scheme_angles` |
| `funds[].needs` | 79 pairs | `funding_scheme_documents` |
| `funds[].template` | 16 | `funding_schemes.template_key` |

### Why the six areas become angles, not projects

CLAUDE.md rule 3 forbids a second set of project records. The six legacy areas
are not places or pieces of work — they are ways of arguing for the farm, which
is exactly what `funding_angles` is for, and `funding_angle_projects` already
links an angle to the real projects it argues for. Creating `Kulturmiljø &
bygningsvern` as a *project* would put a second Låven in the database.

The link from an angle to a Risen project is left for a person to make. The
archive does not contain it, and guessing it would be inventing a claim.

### Fields with no column yet

`cycle`, `support`, `match` and `status` (a human urgency note such as
`HASTER`) have no equivalent on `funding_schemes`. Migration `0004` adds
`cycle`, `support_rate`, `match_rule` and `priority_note` for them. They are
free text in the source and stay free text — `Normalt ca. 30 %` is not a number
and must not be parsed into one.

## What the archive does not contain

The old app kept everything the owner typed in browser `localStorage`, and that
was never part of the export. **None of it is recoverable and none of it may be
invented:**

- the farm profile (name, address, gnr/bnr, buildings, organisation number)
- budgets and budget lines
- application drafts and their answers
- document upload status — which requirements are actually met
- task lists and deadlines the owner set
- contacts, people and partner organisations

The importer writes the declared catalogue only. Everything above stays empty
until a person enters it.

## Known gaps in the source

**13 document requirements are referenced by schemes but missing from the
21-document catalogue.** This is a defect in the legacy data, not in the
import:

| Requirement id | Referenced by |
| --- | --- |
| `eierskap` | kmf, mrpre, inno |
| `skadebeskrivelse` | kmfsecure |
| `problemstilling` | mrpre |
| `prosjektbeskrivelse` | arena, mrf-arr, mrdev, teft, rauma-kultur, gjensidige |
| `tilbud` | kulturrom |
| `visjon` | gjenklang |
| `behovsanalyse` | gjenklang |
| `partnerskap` | mrdev |
| `kart` | smil |
| `miljoeffekt` | smil |
| `medlemmer` | rauma-kultur |
| `driftsmodell` | inno |
| `takbeskrivelse` | taetak |

The importer creates these as requirements with `source: 'referenced'` and a
name derived from the id, leaving the description null. Dropping the link would
lose a real requirement; writing a description would be inventing one. The UI
shows them as `beskrivelse mangler i kildedata`.

Every template referenced by a scheme exists, and every template is used by at
least one scheme. Templates contain `[GÅRDSNAVN]`-style placeholders and are
imported verbatim, placeholders included — filling them in is the owner's job,
not the importer's.

## Re-running

The import is idempotent. Every row upserts on a deterministic id derived from
its source key (`scheme-kmf`, `angle-heritage`, `doc-bilder`, `tmpl-vern`), and
each upsert is guarded by `WHERE provenance = 'legacy_mvp_2026_09_08'` so it can
only ever rewrite its own rows.

**Refreshed on every run** — these are catalogue data and the archive owns them:
name, provider, source URL, description, deadline, cycle, support rate, match
rule, priority note, template key.

**Never touched** — these are the farm's own work:

| Field | Why |
| --- | --- |
| `verified_at` | Only a person can have checked a source. |
| `project_id` | The archive does not know which Risen project a scheme is for. |
| `status`, once verified | See below. |
| document `obtained` state | What the farm actually has is not in the archive. |

`status` is the one field pulled two ways. A deadline that has passed since the
last run must stop claiming to be open, but a scheme someone has actually
checked must not be demoted back to `unverified` by a re-import. So the
archive's computed status applies only while `verified_at` is null; after that
the person's own status stands.

Nothing is ever deleted. A record dropped from the source keeps its row and can
be retired by hand.

## Overlap with the demo seed

`data/risen.ts` seeds four placeholder schemes (`fs-teft`, `fs-kulturfond`,
`fs-spillemidler`, `fs-kulturrom`) with no source URL and summaries that say
*Antatt frist … Ikke bekreftet*. All four are superseded by real records in this
import. They have a different id and different provenance, so the import leaves
them alone rather than deleting them — retiring them is a decision for the farm,
not for a script that runs unattended.
