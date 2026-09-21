# Overnight build report — 20 September 2026

Branch `claude/confident-brown-jhf5hu`. Eleven commits, `908c11f` through
`4fe2e81`. 189 tests across 43 suites pass, `npm run build`, `npm run lint` and
`npm run typecheck` are clean.

**Nothing was deployed and no destructive database operation was run.** Every
migration is additive, and the one script that writes to remote D1 requires
`--confirm` and now `--legacy` on top of it.

## What was built

### Phase 1 — work item domain model (`908c11f`)

Extended `work_items` with subtasks, ordering, estimates, dugnad suitability
and weather dependency. Migration `0003`, additive, with a hand-written data
migration that moves the old `doing` status to `in_progress` and backfills
`position` from `rowid`.

Estimates are stored in **hours**, not the minutes §13.1 of the spec asked for.
That was the owner's explicit correction: *"Estimated hours should be used over
minutes."* The migration was rebuilt around hours before it ran anywhere real.

### Phase 2 — master list (`38c77f0`)

Saved views, filters and grouping, all projections of one array. View state
lives in the URL so a filtered list can be shared and the back button works;
collapsed groups live in `localStorage`, because which groups you folded is a
personal presentation preference and does not belong in a link.

### Phase 3 — task detail (`e4568eb`)

A `?task=<id>` dialog with debounced autosave, subtasks, comments and the
activity trail. Focus is trapped and restored.

### Phase 4 — shopping lists and cost rollups (`a8bbdab`)

A project holds several lists; a list holds ordered items with quantity, unit
and price. Money is whole øre in integers throughout and quantity is scaled by
1000, so nothing is ever summed in floating point.

Each list shows estimated, purchased, remaining and forecast; the project panel
sums the lists. `budgetedOre` and `unbudgetedOre` split the same forecast
rather than adding to it, so a cost already carried by a budget line cannot be
counted twice.

Cancelling an item sets its status instead of deleting the row. A cancelled
line drops out of every total but stays on screen, so the decision *not* to buy
something is recorded rather than vanishing.

One thing the browser caught: totals round to whole kroner, but a unit price
entered as `289,90` was reading back as `290 kr`, which looks like lost data.
Unit prices and line sums now keep their øre; only totals round.

### Phase 5 — movable work board (`6295a53`)

Drag, keyboard and touch all move a card, and all three go through the same
pure planner in `lib/risen/work-board.ts`, so they cannot drift apart. The
keyboard route is grab, move, drop: Space picks up, arrows move, Space drops,
Escape puts it back.

Four defects found by driving it in a real browser, each fixed:

1. Arrow steps wrote to the server immediately, which made Escape a lie. The
   steps are now a preview and only the difference they add up to is sent — so
   three steps right is one write, not three.
2. A card that changes column is unmounted and remounted, taking focus with it.
   The second arrow key went nowhere and a move stopped halfway.
3. The board inherited the list's hide-completed filter, so a card dropped into
   **Ferdig** vanished as it landed.
4. Empty columns were dropped from the layout, removing the one drop target you
   most need.

Picking a card up also reveals four move buttons. That is not decoration: it is
the only route that works on a touch screen, where native drag does not fire
and there are no arrow keys.

### Legacy funding import (`1d5c46f`)

6 funding angles, 16 schemes, 21 document requirements and 15 application
templates, with 27 scheme-angle and 79 scheme-requirement links. The tests
assert those counts against the real archive rather than a fixture — a fixture
would keep passing after someone edited `legacy/`.

Full detail in `docs/LEGACY-IMPORT-INVENTORY.md`. The three rules the
normaliser will not bend, each with a test:

- **Nothing is invented.** 13 requirements are referenced by a scheme but never
  described in the archive. They import with a name derived from the id and a
  null description, flagged `referenced`. Dropping the link would lose a real
  requirement; writing a description would invent a funder's demand.
- **No date is moved.** Two deadlines had already passed and import as
  `passed`, timestamps untouched.
- **Nothing arrives verified.** Every row lands `unverified` with its source URL
  and a `legacy_mvp_2026_09_08` provenance stamp.

Re-running is safe: deterministic ids, upserts guarded by provenance, and
`verified_at` and `project_id` never refreshed. The first version got `status`
wrong and reset a verified scheme on re-import; caught by running the import
twice against a real database.

### Oversikt refocus (`ac44857`)

The page opened with a hand-written sentence — *"Gjør TEFT-søknaden sendeklar.
Fristen er 1. oktober. Tre dokumenter og to budsjettposter mangler"* — that no
data supported. Nothing counted those documents or those budget lines.

The headline is now chosen by `chooseFocus` in a fixed order of severity:
overdue work, then a deadline inside 30 days, then a blocker, then unverified
research, then ready work, then the inbox, then a plain statement that nothing
is pressing.

The funding total is replaced by the next deadline. "Prosjekter i bevegelse"
measures motion by open work rather than by the status field. The idea bank is
replaced by what is waiting on a decision.

## Two fabrications removed

Worth naming separately, because both were shipped code presenting invented
facts as real:

1. **The Oversikt headline** above.
2. **Four placeholder funding schemes** in the seed — TEFT, Regionalt
   kulturfond, Spillemidler kulturarena and Kulturrom / Gjenklang — with no
   source URL and summaries reading *Antatt frist … Ikke bekreftet*. All four
   are the same funders the import now brings in for real. Keeping both showed
   each funder twice, once fabricated. They are removed from the seed so new
   databases never get them. **Rows already written to a database are left
   alone** — the import deletes nothing.

The funding page's banner also claimed none of the schemes had a source. That
stopped being true the moment 16 sourced ones arrived; it now counts
sourceless, imported and expired separately and names the snapshot date.

## Migrations

| Tag | Contents | Shape |
| --- | --- | --- |
| `0003_amused_hellcat` | work item detail, comments, labels, shopping lists and items | additive + data migration |
| `0004_broken_blacklash` | funding catalogue columns, `document_requirements`, `application_templates`, two join tables | additive only |

Both are applied locally. **Neither has been applied to production.**

## What you need to do

Production D1 has neither migration and none of the funding catalogue. Nothing
in this branch is live until you run one of these.

**Terminal, one command:**

```bash
npm run db:remote -- --database risen-hub --confirm --legacy
```

**Browser only:** `docs/D1-SETUP.md` lists the files to paste, in order.
`schema-03.sql` and `schema-04.sql` are the two new migrations;
`legacy-01.sql` through `legacy-09.sql` are the funding catalogue. That is a
lot of pasting — the terminal route is much less tedious if you have it.

Then redeploy. Everything is safe to re-run.

## Phase 6 — quality pass

Every route was driven in a real browser at 1400px and 390px, twenty-four
combinations in all including both detail routes. All twenty-four return 200,
throw no JavaScript, request nothing that 404s and produce no horizontal page
scroll. An unknown scheme id returns a proper 404 rather than throwing.

Checked and passing:

- **The public route is intact.** RSVP opens, saves, rejects a duplicate with
  *"You already have a preview RSVP for this weekend"*, and closes on Escape.
  The project dialog still opens.
- **Client navigation works.** Clicking a sidebar link navigates rather than
  doing nothing — the failure that took production down once, so it is worth
  re-checking after every dependency change.
- **Keyboard.** 29 tab stops on `/hub/work`, none of them invisible or
  zero-sized. The quick-capture sheet and the task detail panel both open from
  the keyboard, close on Escape and restore focus to what opened them.
- **Mutations are reversible.** There is exactly one `DELETE` endpoint and it
  cancels rather than deletes. There is exactly one hard delete in the
  services, and it removes a row the same function created moments earlier when
  a subtask would have formed a cycle; it can never touch pre-existing data.

One defect found and fixed: activity entries written before the log learned
Norwegian still read `done → in_progress`, making the reader translate the
database in their head. `readableSummary` now reads them back properly at
render time. It is deliberately narrow — only the arrow pair at the very end of
a summary, and only when both sides are known status codes — so a task
legitimately named "done" keeps its name. The stored rows are untouched,
because the log is history rather than a view.

## Funding, read end to end (`757c690`, `4fe2e81`)

Everything the import wrote is now visible.

**The requirement catalogue**, sorted by how many schemes ask for each one —
which turns a flat list into an order of work. Prosjektbudsjett is wanted by 9
of the 16 schemes, Finansieringsplan by 8, Fotodokumentasjon by 7. Make those
three and most applications are unblocked. Twenty-two of the 34 are wanted by
exactly one scheme and would have buried that finding, so they sit behind a
disclosure.

**A scheme detail page.** Clicking a scheme opens the funder's terms in their
own words, the documents the application must carry, the angles it argues
through and the application template — the last imported table nothing was
reading. It is the old portal's søknadsverksted, rebuilt on records rather than
on `localStorage`.

Three deliberate refusals on that page:

- The terms tiles drop the oversized-number treatment. *"Normalt ca. 30 %"* is a
  hedge, and a hedge set in 34px reads as a promise.
- Template placeholders stay exactly as written, and the page says the bracketed
  fields are holes to fill rather than guesses to accept.
- The requirement list states that whether a document exists is not recorded
  yet, so an empty list cannot be mistaken for "nothing missing".

## Not done

- **Project budgets, applications and publishing controls.** The funding half
  now has real data, real fields, honest banners and a detail page. Budget
  lines, application drafts and the public publishing controls are not built.
- **Document progress is not capturable.** The catalogue is readable; there is
  no way yet to record that the farm actually has a given document. That is the
  obvious next piece.
- **Angles are not linked to projects.** The archive does not contain that
  link, and guessing it would be inventing a claim. It needs a person.

## Known limitation in verification

Pointer drag was verified by dispatching real `DragEvent`s with a
`DataTransfer`, not by moving a physical mouse: Playwright's synthetic mouse
does not drive native HTML5 drag-and-drop in headless Chromium. The handler
chain is proven end to end and the move persists, but **a human should confirm
that dragging with an actual mouse feels right.** Keyboard and touch were
driven directly and need no such caveat.
