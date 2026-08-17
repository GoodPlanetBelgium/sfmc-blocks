# SFMC Blocks — GoodPlanet Belgium

Custom Content Builder blocks for Salesforce Marketing Cloud, hosted on GitHub Pages at:

```
https://goodplanetbelgium.github.io/sfmc-blocks/<block-name>/
```

---

## How it works

Each block is a SvelteKit page prerendered to a static HTML file and deployed to GitHub Pages. SFMC loads the block in an iframe inside Content Builder. The block communicates with Content Builder via the BlockSDK (vendored in `src/lib/blocksdk.ts`), reading and writing block data and emitting the final email HTML.

### Key decisions

**Why static files on GitHub Pages?**
CloudPages Code Resources don't support `text/html`, so they can't serve a proper HTML document for the iframe. Static files on GitHub Pages give us a proper dev workflow, full version history, and automatic deploys on push.

**Why SvelteKit?**
Each block is a `.svelte` component — the editor UI, reactive state, and two-way bindings all live in one file per block.

**Why vendor the BlockSDK?**
The official `salesforce-marketingcloud/blocksdk` repo was archived in January 2024. Vendoring in `src/lib/blocksdk.ts` gives us a stable, auditable copy.

**`setContent` vs `setSuperContent`**
`sdk.setContent(html)` is the HTML that ends up in the email. `sdk.setSuperContent()` is a display-only preview shown in the Content Builder canvas — it is **not** sent at email send time. For blocks with visibility filters, `applyContent()` from `$lib/filterAmpscript.ts` calls both together.

**Installed Package registration**
Register blocks under **Setup → Apps → Installed Packages** as a **Custom Content Block**. Set the **Endpoint URL** to the GitHub Pages URL (e.g. `https://goodplanetbelgium.github.io/sfmc-blocks/cta-button/`).

---

## Repo structure

```
sfmc-blocks/
├── .github/workflows/deploy.yml   ← builds and deploys to GitHub Pages on push to main
├── src/
│   ├── app.html                   ← HTML shell
│   ├── components/
│   │   ├── AssetPicker.svelte     ← SFMC image picker (modal, search, pagination)
│   │   ├── FilterSettings.svelte  ← visibility filter UI (AMPscript-backed)
│   │   └── AnchorPicker.svelte    ← anchor link picker for rich-text block
│   ├── icons/                     ← shared icon.png + dragIcon.png (copied to dist/ at build)
│   ├── lib/
│   │   ├── BlockShell.svelte      ← SFMC iframe wrapper + dev split-pane harness
│   │   ├── blocksdk.ts            ← vendored BlockSDK
│   │   ├── sfmc-assets.ts         ← fetches images from the asset proxy
│   │   ├── filterAmpscript.ts     ← FilterState → AMPscript IF/ENDIF wrapping
│   │   ├── filters.ts             ← filter field definitions
│   │   ├── defaultTemplate.ts     ← shared email table wrapper
│   │   └── const.ts               ← shared colour tokens
│   └── routes/
│       ├── +page.svelte           ← dev index listing all blocks
│       ├── cta-button/
│       │   ├── +page.svelte
│       │   └── template.ts
│       ├── rich-text/
│       │   ├── +page.svelte
│       │   └── template.ts
│       ├── image/
│       │   ├── +page.svelte       ← AssetPicker + FilterSettings example
│       │   └── template.ts
│       ├── title/
│       ├── divider/
│       └── table-of-contents/
├── scripts/copy-icons.js          ← copies icons into every block dir after build
├── .env                           ← gitignored, LOCAL dev only (see below)
├── svelte.config.js
├── vite.config.ts
└── package.json
```

---

## Adding a new block

1. Create `src/routes/<block-name>/+page.svelte`. Minimal structure:

```svelte
<script lang="ts">
  import { buildEmailHTML } from './template'
  import { applyContent, restoreFilterState } from '$lib/filterAmpscript'
  import BlockShell from '$lib/BlockShell.svelte'
  import FilterSettings from '../../components/FilterSettings.svelte'
  import type BlockSDK from '$lib/blocksdk'
  import type { FilterState } from '$lib/filters'

  let sdk = $state<BlockSDK | null>(null)
  let myField = $state('')
  let filterState = $state<FilterState>({})

  function updateBlock(persist = true): void {
    if (!sdk) return
    const snap = $state.snapshot(filterState) as FilterState
    const html = buildEmailHTML(myField, snap)
    applyContent(sdk, html, snap)
    if (persist) sdk.setData({ myField, filterState: snap })
  }

  function onReady(data: unknown): void {
    const d = data as { myField?: string; filterState?: FilterState } | null
    myField = d?.myField ?? ''
    restoreFilterState(d?.filterState, sdk, (s) => {
      filterState = s
      updateBlock(false)
    })
  }
</script>

<BlockShell
  storageKey="sfmc-dev-block-data:<block-name>"
  bind:sdk
  {onReady}
  onEditClose={updateBlock}
  blockName="My Block"
>
  <!-- editor UI here -->
  <FilterSettings bind:value={filterState} onchange={updateBlock} />
</BlockShell>
```

2. Create `src/routes/<block-name>/template.ts` exporting `buildEmailHTML(...)`. Wrap with `wrapWithFilters(html, filterState)` from `$lib/filterAmpscript` if the block supports visibility filters.

3. Add a link to `src/routes/+page.svelte`.

4. Push to `main` — GitHub Actions builds and deploys automatically.

5. In SFMC, add a new **Custom Content Block** with endpoint URL `https://goodplanetbelgium.github.io/sfmc-blocks/<block-name>/`.

### Using the image picker

For blocks that include an image, import `AssetPicker` and `SFMCAsset`:

```svelte
<AssetPicker
  value={imageUrl}
  onselect={(url, asset) => {
    imageUrl = url
    assetId = asset.id
    updateBlock()
  }}
/>
```

See `src/routes/image/+page.svelte` as the reference implementation.

---

## Local development

```bash
bun install
bun dev       # Vite dev server at localhost:5173
```

Open `http://localhost:5173/<block-name>/` in a browser. `BlockShell` detects it's running outside an SFMC iframe and renders a **split-pane dev harness**: the left pane shows the editor UI, the right pane shows live syntax-highlighted email HTML output and a browser preview. Block state is persisted to `localStorage` between reloads.

### Asset picker (local dev)

The image picker calls a server-side SFMC asset proxy. To use it locally:

1. Create `.env` in the repo root (gitignored):
   ```
   PUBLIC_ASSETS_ENDPOINT=http://localhost:3004/api/assets
   ```
2. Run the proxy from the `goodplanet-apps` monorepo:
   ```bash
   pnpm dev --filter sfmc-assets
   ```
   The proxy requires `SFMC_CLIENT_ID`, `SFMC_CLIENT_SECRET`, `SFMC_AUTH_URL`, and `SFMC_ACCOUNT_ID` (the business unit MID) in its own `.env`.

Without the proxy running, the asset picker shows an error but all other block functionality works normally.

---

## Deployment

Any push to `main` triggers the GitHub Actions workflow which:

1. Runs `bun run build` (SvelteKit static prerender → `dist/`)
2. Copies shared icons into each block directory
3. Publishes `dist/` to GitHub Pages

The workflow reads the GitHub Pages base path via `actions/configure-pages` and passes it as `BASE_PATH`. `PUBLIC_ASSETS_ENDPOINT` is read from the repository's **Actions variable** (`Settings → Secrets and variables → Actions → Variables`).

### First-time setup

1. **Settings → Pages** → Source: **GitHub Actions** → Save
2. **Settings → Secrets and variables → Actions → Variables** → add `PUBLIC_ASSETS_ENDPOINT = https://sfmc-auth.goodplanet.be/api/assets`
3. Push to `main` — the first Action run will publish the site
