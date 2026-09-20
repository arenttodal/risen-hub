# Risen Hub

One platform for the Risen farm: projects, day-to-day work, funding, farm documentation, events, community and public storytelling.

## Current starter

- `/` — public-facing Risen page, preserved from the existing prototype
- `/hub` — internal, login-free platform preview
- shared project/work/funding seed data in `data/risen.ts`
- global Risen Assistant interface, ready for a server-side AI endpoint
- responsive desktop/mobile shell

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000/hub` for the internal platform.

## Important

All dates, budgets, progress and funding numbers in this starter are illustrative seed data. Do not expose API keys in client code. Read `CLAUDE.md` and `docs/PLATFORM-SPEC.md` before extending the product.
