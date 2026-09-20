# Connecting D1 — complete walkthrough

Right now the deployed site has **no database**. It works, but `/hub` shows a
"Seed-data" notice instead of real records, and the dugnad sign-up on the front
page returns an error.

This guide connects it. There are two routes:

- **[Route A — browser only](#route-a--browser-only-recommended)**: no terminal,
  no installs, about 15 minutes. **Start here.**
- **[Route B — terminal](#route-b--terminal)**: only if you want the repository
  on your own machine anyway.

Both end in the same place. Route A is not a shortcut or a lesser version.

> Screens change. If a button is named slightly differently from what is
> written here, look for the nearest equivalent — the order of operations is
> what matters.

---

## Before you start

You need:

- your Cloudflare login (the account that owns `risen-hub`)
- your GitHub login (the account that owns `arenttodal/risen-hub`)

Nothing else.

### What you are actually doing

Four things, in this order. It helps to know why:

1. **Create an empty database.** Cloudflare calls it D1.
2. **Tell the site its ID.** The site refuses to connect to a database it
   cannot name, so you paste the ID into the build settings.
3. **Create the tables inside it.** A new database is completely empty — no
   tables, no columns. You run some SQL to build the structure.
4. **Redeploy.** The connection is made when the site is built, so it needs
   one more build to pick it up.

Step 3 is the one people skip. An empty database with no tables looks exactly
like no database at all from the outside.

---

# Route A — browser only (recommended)

## A1. Create the database

1. Go to **https://dash.cloudflare.com** and log in.
2. In the left sidebar, open **Storage & databases**, then click **D1**.
   (If you cannot see it, use the search box at the top and type `D1`.)
3. Click **Create** (or **Create database**).
4. For the name, type exactly:

   ```
   risen-hub
   ```

5. Click **Create**.

You now have an empty database. The page that opens shows a **Database ID** —
a long string of letters, numbers and dashes, like
`3f2a91c4-77bd-4e19-9a03-8c41de77b2aa`.

**Copy that ID and paste it somewhere you can get back to** — a note, an email
draft, anywhere. You need it in the next step.

> There is usually a small copy icon next to it. If not, select the text and
> copy it. Do not include any surrounding quotes.

## A2. Tell the site the ID

1. In the left sidebar, go to **Compute** → **Workers & Pages**.
2. Click **risen-hub** in the list.
3. Go to the **Settings** tab.
4. Find the **Build** section — the one showing `npm run build` as the build
   command. Look for **Build variables** (it currently says **None**).
5. Click **Add variable** (or **Edit**), then add these two:

   | Variable name | Value |
   |---|---|
   | `CLOUDFLARE_D1_DATABASE_ID` | the ID you copied in A1 |
   | `CLOUDFLARE_D1_DATABASE_NAME` | `risen-hub` |

6. **Save**.

Type the variable names exactly, in capitals, with underscores. A typo here is
the most common reason this whole process appears to do nothing.

> **Build variables, not Variables and Secrets.** There are two similar-looking
> settings screens. You want the one in the **Build** section next to the build
> command. The other one is for values the site reads while running; this value
> is read while the site is being *built*.

## A3. Create the tables

The database exists but is empty. You are going to run three pieces of SQL
against it, in order.

### Getting the SQL

There are two files. For each one:

1. Open the link below.
2. Click the **Raw** button (top right of the file view).
3. Select everything (`Ctrl`+`A`, or `Cmd`+`A` on a Mac) and copy it
   (`Ctrl`+`C` / `Cmd`+`C`).

| Order | Link | What it does |
|---|---|---|
| 1 | [`drizzle/console/01-schema.sql`](https://github.com/arenttodal/risen-hub/blob/main/drizzle/console/01-schema.sql) | Creates every table the site needs |
| 2 | [`drizzle/console/02-seed.sql`](https://github.com/arenttodal/risen-hub/blob/main/drizzle/console/02-seed.sql) | Adds the four demo projects and their tasks — **optional** |

Skip file 2 if you would rather start with a completely empty Risen. You can
always run it later.

> **Use the files in `drizzle/console/`, not the numbered ones directly in
> `drizzle/`.** The originals carry `--> statement-breakpoint` markers for the
> migration tooling. In SQL, `--` starts a comment that runs to the end of the
> line, so if a paste loses its line breaks — which browsers often do — that
> marker comments out everything after it. The console then reports
> "SQL code did not contain a statement", or worse, silently skips part of the
> schema. The files in `drizzle/console/` contain no comments at all and paste
> safely either way.

### Running the SQL

1. Back in Cloudflare, go to **Storage & databases** → **D1** → **risen-hub**.
2. Open the **Console** tab.
3. Paste the contents of file 1 into the query box.
4. Click **Execute** (or **Run**).
5. Wait for it to report success, then **clear the box**, paste file 2, and
   execute.

Do them in order — file 2 inserts rows into tables that file 1 creates.

Both files are safe to run more than once, and safe to run against a database
that is already half set up. Every `CREATE` is `IF NOT EXISTS` and every insert
is `INSERT OR IGNORE`, so nothing is duplicated and nothing errors.

> **The console stops at the first error.** If a statement fails, everything
> after it in the same paste is abandoned — with no partial success message.
> That is why these files never error on things that already exist.

### Checking it worked

Still in the **Console** tab, run:

```sql
SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;
```

You should see `activity_log`, `milestones`, `places`, `projects`, `rsvps` and
`work_items`. A `_cf_METADATA` row may appear alongside them — that is
Cloudflare's own bookkeeping, and it is meant to be there.

If you ran the seed file too:

```sql
SELECT name FROM projects;
```

should return Låven, Steinmuren, Drift og verksted and Sommerfestival.

## A4. Redeploy

The site connects to the database when it is built, so it needs one more build.

1. Go to **Workers & Pages** → **risen-hub** → **Deployments**.
2. Find the most recent deployment and choose **Retry deployment** (it may be
   behind a `⋯` menu).

If you cannot find a retry option, make any small change on GitHub — editing
`README.md` and saving counts — which starts a fresh build automatically.

Wait for the build to finish, about a minute.

## A5. Check it worked

In the build log, near the end, you should now see:

```
Your Worker has access to the following bindings:
env.DB (risen-hub)      D1 Database
```

Then open the site:

- **https://risen-hub.arentto.workers.dev/hub** — the sand-coloured
  "Seed-data" notice at the top should be **gone**.
- **https://risen-hub.arentto.workers.dev/api/rsvp** — should show `{}` or
  something like `{"farmhouse":1}`. Not an error message.

That is the whole thing. Skip to [Troubleshooting](#troubleshooting) if
anything does not match.

---

# Route B — terminal

Only worth doing if you want the code on your own machine anyway. Route A
achieves exactly the same result.

## B1. Install Node.js

Node is the program that runs the project's tooling.

1. Go to **https://nodejs.org**.
2. Download the **LTS** version.
3. Run the installer, accepting the defaults.

## B2. Open a terminal

- **Mac**: press `Cmd`+`Space`, type `Terminal`, press `Enter`.
- **Windows**: press the Start key, type `PowerShell`, press `Enter`.

A window opens with a blinking cursor. You type a line and press `Enter` to run
it. Nothing here can damage your computer.

Check Node installed properly:

```bash
node --version
```

You should see something like `v22.11.0`. If you get "command not found",
close the terminal, open a new one, and try again — a fresh window is needed
after installing.

## B3. Get the code

This downloads the project into a folder called `risen-hub` inside your home
folder.

```bash
cd ~
git clone https://github.com/arenttodal/risen-hub.git
cd risen-hub
```

`cd` means "go into this folder". `~` is your home folder.

On Windows, if `git` is not recognised, install it from
**https://git-scm.com/downloads**, then open a new PowerShell window and retry.

Now install the project's dependencies. This takes a minute or two and prints a
lot of text, including warnings — that is normal.

```bash
npm install
```

## B4. Log in to Cloudflare

```bash
npx wrangler login
```

A browser window opens asking you to authorise Wrangler. Approve it, then
return to the terminal. Confirm:

```bash
npx wrangler whoami
```

It should print your email address.

## B5. Create the database

```bash
npx wrangler d1 create risen-hub
```

The output includes:

```
database_name = "risen-hub"
database_id = "3f2a91c4-77bd-4e19-9a03-8c41de77b2aa"
```

Copy the `database_id` value, without the quotes.

## B6. Add the build variables

This part is in the browser regardless — follow [A2](#a2-tell-the-site-the-id).

## B7. Create the tables

```bash
npm run db:remote -- --database risen-hub --confirm
```

To include the demo projects:

```bash
npm run db:remote -- --database risen-hub --confirm --seed
```

The `--` after the script name is required; it passes the options through to
the script rather than to npm.

This applies each migration in order and records what it applied, so running it
again later is safe — it skips anything already done.

## B8. Redeploy and check

Follow [A4](#a4-redeploy) and [A5](#a5-check-it-worked).

---

## Troubleshooting

**The build fails with `error 10181` / "database not found".**
The ID in `CLOUDFLARE_D1_DATABASE_ID` does not match a real database. Re-copy
it from **Storage & databases → D1 → risen-hub**, watching for a missing
character at either end.

**`/hub` still shows the "Seed-data" notice.**
The build did not receive the ID. Open the build log and search for:

```
[risen] D1 binding `DB` skipped for this build
```

If that line is there, the variable is not reaching the build — check the
spelling of `CLOUDFLARE_D1_DATABASE_ID`, and that you added it under **Build
variables** rather than the runtime variables screen. Then redeploy.

**`/hub` shows "Databasen svarte ikke" (the database did not answer).**
The site found the database, but the tables are missing. Step A3 was skipped or
only partly completed.

**`no such table: projects`.**
Same cause — file 2 did not run, or ran against a different database.

**The sign-up form still says availability is unavailable.**
The `rsvps` table comes from file 1. Run it.

**"SQL code did not contain a statement".**
You pasted one of the numbered files from `drizzle/` rather than the ones in
`drizzle/console/`. The numbered files contain `--> statement-breakpoint`
markers, and a paste that loses its line breaks turns the rest of the file into
a comment. Use the two files in `drizzle/console/`.

**"table `rsvps` already exists" or similar.**
You pasted one of the numbered files from `drizzle/` rather than
`drizzle/console/01-schema.sql`. The numbered files are not re-runnable, and
the console abandons the rest of the batch after the first error, so nothing
else gets created. Paste `drizzle/console/01-schema.sql` — it skips whatever
is already there and creates the rest.

**A SQL file errors partway through.**
Run them in order: schema, then seed. If you are unsure what ran, just run both
again. They are idempotent.

---

## Later: when the schema changes

When a new migration file appears in `drizzle/`, apply it the same way — paste
the regenerated `drizzle/console/01-schema.sql` into the D1 console (Route A),
or run `npm run db:remote -- --database risen-hub --confirm` (Route B).

Re-running the schema file is safe: the tables that already exist will report
an error you can ignore, and the new ones are created.

You can switch between the two freely. If you set the database up by pasting
SQL and later run the script, it notices the tables already exist, records them
as applied, and carries on with whatever is genuinely new.

Migrations are only ever added, never edited. Editing one that has already run
leaves the database and the code disagreeing about its own shape.

## Local development

None of the above is needed to run the site on your own machine. A separate
local database is created automatically:

```bash
npm run db:local
npm run dev
```

Then open **http://localhost:3000/hub**.
