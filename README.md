# edith

Lean chat UI for OpenCode Go models. Astro + Vue on Cloudflare Workers. $0.

## Commands

```sh
npm install
npx wrangler d1 migrations apply edith --local   # local database, run once
npm run dev      # astro dev -> http://localhost:4321
npm run check    # astro check
npm run build    # astro build -> dist/
npm run preview  # build, then serve the real workerd output
npm run deploy   # build, then wrangler deploy
```

## Configuration

Local secrets live in `.dev.vars` (gitignored); see `.dev.vars.example`.

- `OPENCODE_GO_API_KEY` — OpenCode Go API key.
- `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` — Cloudflare Access. Required in
  production: without them the server refuses `/api/*`.

## Database

Threads and messages are stored in Cloudflare D1 (binding `DB`, see
`wrangler.jsonc`). Local dev uses a local copy of the database. Production:

```sh
npx wrangler d1 create edith   # paste the returned id into wrangler.jsonc
npx wrangler d1 migrations apply edith --remote
```

## Stack

Astro · Vue · Tailwind · shadcn-vue primitives · Cloudflare Workers, D1, Access.
