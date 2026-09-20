# Connecting D1

Step-by-step, from a Worker with no database to `/hub` reading live records.

Right now the deployed Worker has **no D1 binding**. It runs, but every read
falls back to the seed dataset and the interface shows a "Seed-data" notice.
The public RSVP on `/` returns 503 for the same reason.

You only do steps 1-4 once. Step 5 repeats whenever a new migration is added.

---

## Why the binding is off by default

`vite.config.ts` only emits the D1 binding when it has a **real** database id.

Cloudflare rejects a deploy whose binding points at a database that does not
exist in the account:

```
D1 binding 'DB' references database '00000000-0000-4000-8000-000000000000'
which was not found. [code: 10181]
```

That placeholder id is fine locally, because Miniflare accepts any id, but it
fails a real deploy. So the build skips the binding until you set
`CLOUDFLARE_D1_DATABASE_ID`. A deployed Worker without it degrades to the seed
and says so, instead of failing to deploy.

---

## Step 1 — Authenticate Wrangler

On your own machine, in the repository:

```bash
npx wrangler login
```

A browser window opens. Approve the request. Confirm it worked:

```bash
npx wrangler whoami
```

## Step 2 — Create the database

```bash
npx wrangler d1 create risen-hub
```

The output contains the id you need:

```
database_name = "risen-hub"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Copy the `database_id`.** If you would rather use the dashboard: Storage &
databases → D1 → Create, then open the database and copy its ID.

## Step 3 — Add the build variables

In the Cloudflare dashboard: **Workers & Pages → risen-hub → Settings → Build →
Build variables** (the same screen that shows your build and deploy commands).

Add:

| Variable | Value |
|---|---|
| `CLOUDFLARE_D1_DATABASE_ID` | the id from step 2 |
| `CLOUDFLARE_D1_DATABASE_NAME` | `risen-hub` |

The second one is only needed because the default name in the config is
`site-creator-d1`. If you named your database `site-creator-d1`, you can skip it.

These are build variables, not runtime secrets — they are read by
`vite.config.ts` while the Worker is being built.

## Step 4 — Create the tables

The database exists but is empty. Apply the migrations in `drizzle/`:

```bash
npm run db:remote -- --database risen-hub --confirm
```

To also insert the four demo projects and their work items:

```bash
npm run db:remote -- --database risen-hub --confirm --seed
```

The script applies each migration in journal order, records what it applied in
an `applied_migrations` table, and skips anything already there. It refuses to
run without `--confirm`, and never seeds unless you pass `--seed`.

## Step 5 — Redeploy and check

Trigger a deploy (push to `main`, or **Deployments → Retry** in the dashboard).

The build log should now show the binding:

```
Your Worker has access to the following bindings:
env.DB (risen-hub)      D1 Database
```

Then confirm in the app:

- `https://risen-hub.arentto.workers.dev/hub` — the "Seed-data" notice is gone
- `https://risen-hub.arentto.workers.dev/api/rsvp` — returns `{}` or counts,
  not a 503

If the notice is still there, the binding did not reach the build. Check the
build log for `[risen] D1 binding \`DB\` skipped for this build` — that means
`CLOUDFLARE_D1_DATABASE_ID` is not visible to the build step.

---

## Whenever you add a migration

```bash
npm run db:generate                                   # writes drizzle/000N_*.sql
npm run db:local                                      # apply it locally
npm run db:remote -- --database risen-hub --confirm   # apply it remotely
```

Migrations are additive. Never edit a migration that has already been applied —
add a new one.

## Local development

Local development does not need any of the above. Miniflare keeps its own
database under `.wrangler/`:

```bash
npm run db:local
npm run dev
```

## Troubleshooting

**Deploy fails with error 10181.** The id in `CLOUDFLARE_D1_DATABASE_ID` does
not match a database in the account. Re-check it with `npx wrangler d1 list`.

**`/hub` shows "Databasen svarte ikke".** The binding exists but the query
failed — usually the tables are missing. Run step 4.

**`no such table: projects`.** Same cause. Step 4 was skipped, or was run
against a different database than the one bound.

**RSVP still returns 503.** The `rsvps` table comes from migration `0000`. Step
4 applies it along with the rest.
