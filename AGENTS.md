# AGENTS.md — hi

Lean chat UI for OpenCode Go models. Astro + Vue on Cloudflare Workers. $0.
Read `../AGENTS.md` (workspace) and `first-rule-of-dotfiles/AGENTS.md` (machine,
toolchain, and shared commit/comment rules) before changing this repo.

## Skills

Load the matching skill before the work, not after:

- Any Cloudflare work (Workers, D1, Access, rate limiting, wrangler, deploy):
  use the Cloudflare skills installed from
  <https://github.com/cloudflare/skills> (`cloudflare`, `wrangler`,
  `durable-objects`, …). Verify limits, pricing, and APIs against the official
  docs at <https://developers.cloudflare.com/> — do not rely on a same-named
  skill from any other source.
- Any OpenCode work (the model API, Go endpoints, server): use the built-in
  `opencode` skill and treat <https://opencode.ai/v2/docs/> as the source of truth.

## Commands

```sh
npm install
npx wrangler d1 migrations apply hi --local
npm run dev      # astro dev, http://localhost:4321
npm run check    # astro check (types and .astro)
npm run build    # astro build -> dist/
npm run preview  # build, then serve the real workerd output
npm run deploy   # build, then wrangler deploy
```

## Stack

Astro 7 (server output) · Vue 3.5 · Tailwind 4 · shadcn-vue (Reka UI) ·
`@astrojs/cloudflare` · Cloudflare D1 · Cloudflare Access (GitHub) for auth.
Spec and plans live in `../.plans/hi/` and are never committed.

## Architecture

Canonical layout; create each directory as the code lands:

- `src/pages/` — Astro routes; `src/pages/api/` files are the Worker API
  (`models` proxy, `chat` SSE proxy, `threads` CRUD backed by `src/server/threads.ts`).
- `src/layouts/` — Astro page shells (head, theme).
- `src/components/` — shadcn-vue primitives plus app components (sidebar, chat, composer).
- `src/lib/` — client helpers (`api.ts`), server helpers (`http.ts`,
  `upstream.ts` reads env), and local replacements for removed deps. Markdown
  rendering lives in `src/components/app/MarkdownContent.vue`.
- `src/server/` — D1 queries (`threads.ts`).
- `src/middleware.ts` — cross-cutting only: verifies the Cloudflare Access JWT
  for `/api/*` (fails closed in production when unconfigured) and sets security
  headers.
- `shared/` — types shared by the UI and the endpoints. `shared/schemas.ts`
  (zod) is server-only.
- `migrations/` — D1 schema. Apply locally with
  `npx wrangler d1 migrations apply hi --local`.
- `POST /api/chat` loads a bounded window of history from D1, persists the user
  message (rolling it back if upstream fails), streams the reply, and records the
  assistant message even when the client stops mid-stream.
- The UI calls same-origin `/api/*` only. The Go API key is a Worker secret and
  never reaches the browser.

## Vue UI conventions

- Composition API with `<script setup>`; typed `defineProps`/`defineEmits`.
- Composition over configuration; one component, one job; split data containers
  from presentational components; no prop drilling past ~3 levels; keep
  components under ~200 lines.
- Accessibility (WCAG 2.1 AA): every control keyboard-operable and labelled,
  focus managed on open/close, never colour alone for state.
- Every async view has loading (skeleton), empty, and error states.
- Tailwind design tokens and a consistent spacing scale; no arbitrary pixel
  values; mobile-first, check 320 / 768 / 1024 / 1440.
- No "AI aesthetic": no default purple/indigo, no gradient-heavy surfaces, no
  rounded-everything, no stock card grids. It should look deliberately designed.

## Non-obvious constraints

- Bindings and secrets come from `import { env } from "cloudflare:workers"`.
  `Astro.locals.runtime.env` was removed in Astro 6+; do not use it.
- The D1 binding `DB` is declared in `wrangler.jsonc`; the Cloudflare adapter
  merges it into the generated `dist/server/wrangler.json`.
- `cn` (`src/lib/utils.ts`) does **not** resolve conflicting Tailwind
  utilities. Do not override a component's default utility via `class`; use or
  add a variant instead. There is no `clsx`/`tailwind-merge`.
- `shared/schemas.ts` is server-only (imports `zod`). Keep `shared/api.ts`
  type-only so `zod` stays out of the client bundle.
- Icons live in `src/components/icons.ts` (hand-inlined SVGs). Add to that file,
  do not add an icon dependency.
- `src/styles/vendor/shadcn.css` is vendored from shadcn-vue (MIT) so the
  vulnerable CLI package is not a dependency. Re-copy it only on a deliberate
  upgrade.
- Dark mode is class-driven: `src/styles/global.css` sets
  `@custom-variant dark (&:is(.dark *));` and `<html class="dark">` in
  `src/layouts/Base.astro` turns it on. Drop the variant to fall back to
  `prefers-color-scheme`.
- `imageService: "passthrough"` in `astro.config.mjs` is deliberate. The default
  turns on the Cloudflare Images binding, which can cost money. Do not revert it.
- `wrangler` runs against the adapter-generated `dist/server/wrangler.json`, so
  build before deploying. The npm scripts already do.
- The adapter auto-adds a `SESSION` KV binding. We do not use Astro sessions.
- Sanitize model output with DOMPurify before rendering. Never `v-html`
  unsanitized content.
- Validate every endpoint input with zod.
- The page CSP is emitted by the Cloudflare adapter from `security.csp` in
  `astro.config.mjs`. Do **not** set a `content-security-policy` header in
  middleware — it clobbers the adapter's hashed policy and breaks hydration.
  `style-src` allows `'unsafe-inline'` (reka-ui positions menus inline);
  `script-src` stays hash-locked.
- SSE parsing is shared in `src/lib/sse.ts`. Change it there, not at the call
  sites.
- Threads are not scoped to an owner. Fine for a single-user Access policy; add
  an owner column before widening the policy to more emails.

## Boundaries

- Cloudflare Free only. No Containers, Images, or other paid products.
- v1 is chat only: no shell/execution, no MCP, no image uploads.
- Do not add a dependency without flagging it.
- Never commit specs, plans, `.dev.vars`, or secrets.
- Keep a `README.md` (working commands only) and a `.node-version`.

## Conventions

- Commit subject: `type: brief imperative`, type in `feat`, `fix`, `docs`,
  `chore`, `refactor`, `test`, `style`, or `perf`. Never the author's name.
- One logical change per commit. Keep messages, PRs, and replies brief.
- Keep comments rare. Delete any that only restates the code.
