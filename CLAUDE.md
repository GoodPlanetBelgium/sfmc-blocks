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

## Adding a new block

1. Create `src/routes/<block-name>/+page.svelte` — follow the pattern in `cta-button/+page.svelte`: declare `$state` for each field, write an `onReady` to restore saved data, use a `$effect` that calls `updateBlock()` on any state change, and wrap everything in `<BlockShell>`.
2. Create `src/routes/<block-name>/template.ts` exporting `buildEmailHTML(...)`.
3. Add a link to `src/routes/+page.svelte` (dev index page).
4. Push to `main` — no SFMC registration needed until ready to test in Content Builder.

## Code style

- TypeScript throughout; Svelte 5 runes (`$state`, `$effect`, `$derived`, `$props`, `$bindable`).
- Prettier config: single quotes, no semicolons, no trailing commas, 100-char print width.
- Tailwind v4 (via `@tailwindcss/vite`) for all styling in `.svelte` files — no separate CSS files per block.
- Email HTML in `template.ts` files uses inline styles only (email client compatibility). VML `<!--[if mso]>` conditionals are required for Outlook button rendering.
