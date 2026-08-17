# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

Custom Content Builder blocks for Salesforce Marketing Cloud (SFMC), built for GoodPlanet Belgium. Each block is an editor UI loaded inside an SFMC Content Builder iframe. The block writes its email HTML output via `sdk.setContent(html)`, which is what ends up in the sent email.

Blocks are hosted at `https://goodplanetbelgium.github.io/sfmc-blocks/<block-name>/` and registered in SFMC under **Setup → Apps → Installed Packages → Custom Content Block**.

## Commands

```bash
bun dev          # dev server with HMR at localhost:5173
bun run build    # prerender to dist/ + copy icons
bun run check    # svelte-check type checking
bun run format   # prettier
```

No test suite exists. Type-check with `bun run check` before committing.

## Architecture

**SvelteKit with `adapter-static`** — every route is prerendered to a static HTML file in `dist/`. The `BASE_PATH` env var (injected by GitHub Actions via `actions/configure-pages`) sets the subpath for GitHub Pages asset URLs.

**Each block = one route** under `src/routes/<block-name>/+page.svelte` plus a colocated `template.ts` that exports a `buildEmailHTML(...)` function returning the email HTML string. The `+page.svelte` holds all editor UI and reactive state; `template.ts` holds only the email HTML template.

**`BlockShell.svelte`** (`src/lib/BlockShell.svelte`) is the wrapper every block uses. It handles two modes:

- **In SFMC iframe**: initialises the vendored `BlockSDK`, calls `sdk.getData()`, then fires `onReady(data)` so the block can restore saved state.
- **In dev (top-level window)**: renders a split-pane harness — left pane embeds the block in an `<iframe>` and proxies SDK `postMessage` calls (persisting to `localStorage`), right pane shows syntax-highlighted email HTML output and a live browser preview.

**`$lib/blocksdk.ts`** is a vendored copy of the archived Salesforce BlockSDK. Never replace it with an npm package.

**`sdk.setContent(html)`** writes the email output. `sdk.setData(obj)` / `sdk.getData(cb)` persists the block's editor state. `sdk.getCentralData` / `sdk.setCentralData` share data across all blocks in an email (e.g. the title block uses this to register anchor links).

**Icon deployment** — `src/icons/` holds shared `icon.png` and `dragIcon.png`. After `vite build`, `scripts/copy-icons.js` copies them into every block directory under `dist/`.

**GitHub Actions** (`deploy.yml`) — push to `main` builds and deploys to GitHub Pages automatically. No manual deploy step needed.

## Shared components

**`src/components/FilterSettings.svelte`** — collapsible visibility filter UI. Bind `value` (a `FilterState`) and pass `onchange` to be notified on change. Filters are defined in `$lib/filters.ts`. The `$lib/filterAmpscript.ts` module converts `FilterState` into AMPscript `%%[IF ...]%%` wrappers around the email HTML via `wrapWithFilters()`, and `applyContent()` calls both `sdk.setContent()` and `sdk.setSuperContent()` together.

**`src/components/AssetPicker.svelte`** — SFMC image picker. Shows a button (thumbnail if an image is selected, placeholder if not). On click, opens a modal with debounced search, 4-column image grid, and pagination. Props: `value` (current image URL) and `onselect(url, asset)` callback.

**`src/components/AnchorPicker.svelte`** — picks from `CentralData` anchors registered by the title block; used inside the rich-text link dialog.

## SFMC asset picker infrastructure

Image assets are fetched from SFMC's Content Builder REST API via a server-side proxy in the `goodplanet-apps` monorepo (`apps/sfmc-assets`), deployed at `https://sfmc-auth.goodplanet.be`.

- `GET /api/assets?page=&pageSize=&search=` — returns paginated SFMC image assets
- `POST /api/token` — returns a short-lived SFMC access token (used by `AssetPicker` indirectly; assets proxy handles auth internally)

Client module: **`src/lib/sfmc-assets.ts`** — calls `/api/assets`, returns `AssetPage`. The endpoint is configured via `PUBLIC_ASSETS_ENDPOINT` env var (see below).

**Important implementation details:**

- The proxy uses `node:https` directly (not `fetch`) to send requests to SFMC. Node.js `fetch`/undici normalises percent-encoded characters in URLs (e.g. `%3D→=`, `%28→(`) which breaks SFMC's Simple Query parser.
- SFMC's filter syntax uses OData-style operators: `assetType.id eq 22`, `or`, `and`, `like`. Standard `=` and `OR` return 400 "Invalid Query Format".
- The proxy requires `SFMC_ACCOUNT_ID` (the business unit MID) in the token request body; without it SFMC returns 403 "Insufficient Privileges" on the assets endpoint.
- `category.id eq X` filtering is **not supported** by SFMC's Simple Query: a category-only filter returns 403, and combining it with `and assetType.id eq Y` silently returns 0 results. Folder browsing in the asset picker works by fetching all type-matching assets and filtering by category server-side in the proxy (`apps/sfmc-assets/pages/api/assets.ts → fetchAllByType`).

## Environment variables

`.env` (gitignored, not committed) is required for local dev:

```
PUBLIC_ASSETS_ENDPOINT=http://localhost:3004/api/assets
```

The local proxy runs via `pnpm dev` in the `goodplanet-apps` monorepo (`apps/sfmc-assets`, port 3004).

For production builds, `PUBLIC_ASSETS_ENDPOINT` is injected by GitHub Actions from a repository variable (`vars.PUBLIC_ASSETS_ENDPOINT = https://sfmc-auth.goodplanet.be/api/assets`).

## Adding a new block

1. Create `src/routes/<block-name>/+page.svelte` — follow the pattern in `cta-button/+page.svelte`: declare `$state` for each field, write an `onReady` to restore saved data, use a `$effect` that calls `updateBlock()` on any state change, and wrap everything in `<BlockShell>`.
2. Create `src/routes/<block-name>/template.ts` exporting `buildEmailHTML(...)`.
3. Add a link to `src/routes/+page.svelte` (dev index page).
4. Push to `main` — no SFMC registration needed until ready to test in Content Builder.

For blocks that include an image, use `<AssetPicker>` and call `applyContent()` + `sdk.setData()` in `updateBlock`. See `src/routes/image/+page.svelte` as the reference.

For blocks with visibility filtering, use `<FilterSettings bind:value={filterState} onchange={updateBlock} />` and wrap the email HTML with `wrapWithFilters(html, filterState)` in `template.ts`. Use `applyContent()` instead of calling `sdk.setContent()` directly. See `src/routes/rich-text/` as the reference.

## Code style

- TypeScript throughout; Svelte 5 runes (`$state`, `$effect`, `$derived`, `$props`, `$bindable`).
- Prettier config: single quotes, no semicolons, no trailing commas, 100-char print width.
- Tailwind v4 (via `@tailwindcss/vite`) for all styling in `.svelte` files — no separate CSS files per block.
- Email HTML in `template.ts` files uses inline styles only (email client compatibility). VML `<!--[if mso]>` conditionals are required for Outlook button rendering.
