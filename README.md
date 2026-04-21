# SFMC Blocks — GoodPlanet Belgium

Custom Content Builder blocks for Salesforce Marketing Cloud, hosted on GitHub Pages at:

```
https://goodplanetbelgium.github.io/sfmc-blocks/<block-name>/
```

---

## How it works

Each block is a SvelteKit page that is prerendered to a static HTML file and deployed to GitHub Pages. SFMC loads the block in an iframe inside Content Builder. The block communicates with Content Builder via the BlockSDK (vendored in `src/lib/blocksdk.ts`), reading and writing block data and emitting the final email HTML.

### Key decisions

**Why static files on GitHub Pages?**
CloudPages Code Resources don't support `text/html`, so they can't serve a proper HTML document for the iframe. Static files on GitHub Pages give us a proper dev workflow, full version history, and automatic deploys on push.

**Why SvelteKit?**
Each block is a `.svelte` component — the editor UI, reactive state, and two-way bindings all live in one file. No more split between a raw `index.html` shell and a separate `main.ts` with manual DOM wiring.

**Why vendor the BlockSDK?**
The official `salesforce-marketingcloud/blocksdk` repo was archived in January 2024. Vendoring in `src/lib/blocksdk.ts` gives us a stable, auditable copy.

**Constructor and whitelist**
The correct constructor is `new BlockSDK(whitelist, sslOverride)`. The whitelist must include the SFMC parent domains:

```ts
const sdk = new BlockSDK(
  ['exacttarget.com', 'marketingcloudapps.com', 'blocktester.herokuapp.com'],
  false
)
```

Without the correct whitelist the SDK silently rejects the handshake and the block appears as raw HTML in Content Builder.

**`setContent` vs `setSuperContent`**
Use `sdk.setContent(html)` — this is the HTML that ends up in the email. `setSuperContent` is display-only and is not sent at email send time.

**Dynamic button width**
The CTA button uses the Canvas API (`ctx.measureText()`) to measure rendered text at `bold 16px Verdana` and sets button width as `textWidth + 40px`. This is written into both the `<a>` tag and the VML `v:roundrect` for consistent Outlook rendering.

**`[if mso]` / VML**
The email output HTML (passed to `sdk.setContent()`) is built as a template literal in `src/lib/blocks/cta-button/template.ts`. The VML conditional comments are genuinely non-standard SGML — no templating system makes them feel normal — but keeping them in a dedicated file with clear `${variable}` interpolation is as readable as it gets.

**Installed Package registration**
Register blocks under **Setup → Apps → Installed Packages** as a **Custom Content Block**. Set the **Endpoint URL** to the GitHub Pages URL (e.g. `https://goodplanetbelgium.github.io/sfmc-blocks/cta-button/`).

---

## Repo structure

```
sfmc-blocks/
├── .github/workflows/deploy.yml      ← builds and deploys to GitHub Pages on push to main
├── src/
│   ├── app.html                      ← HTML shell (charset, viewport, global reset)
│   ├── lib/
│   │   ├── blocksdk.ts               ← vendored BlockSDK source
│   │   └── blocks/
│   │       └── cta-button/
│   │           └── template.ts       ← buildEmailHTML() — the [if mso] VML output
│   └── routes/
│       ├── +layout.ts                ← prerender + trailingSlash for all routes
│       ├── +page.svelte              ← index listing all blocks (dev convenience)
│       └── cta-button/
│           └── +page.svelte          ← block editor UI + SDK wiring
├── static/
│   └── cta-button/
│       ├── icon.png
│       └── dragIcon.png
├── svelte.config.js
├── vite.config.ts
├── package.json
└── tsconfig.json
```

---

## Adding a new block

1. Create a new route:

   ```
   src/routes/my-new-block/
   └── +page.svelte
   ```

2. In `+page.svelte`, follow the same pattern as `cta-button/+page.svelte`:

   ```svelte
   <script lang="ts">
     import { onMount } from 'svelte'
     import BlockSDK from '$lib/blocksdk'

     let sdk: BlockSDK | null = null

     onMount(() => {
       if (window.self === window.top) return
       sdk = new BlockSDK(['exacttarget.com', 'marketingcloudapps.com'], false)
       sdk.getData((data) => {
         /* restore saved state */
       })
     })
   </script>
   ```

3. Put the email HTML template in `src/lib/blocks/my-new-block/template.ts`.

4. If the block needs static assets (icons), add them to `static/my-new-block/`.

5. Add a link on the index page (`src/routes/+page.svelte`):

   ```svelte
   <li><a href="{base}/my-new-block/">my-new-block</a></li>
   ```

6. Push to `main` — GitHub Actions builds and deploys automatically.

7. In SFMC, add a new **Custom Content Block** with endpoint URL:
   ```
   https://goodplanetbelgium.github.io/sfmc-blocks/my-new-block/
   ```

---

## Local development

```bash
bun install
bun dev       # Vite dev server with HMR
```

Open `http://localhost:5173/cta-button/` in a browser to check layout and styles. BlockSDK calls (`getData`, `setContent`) will silently fail outside the SFMC iframe — that's expected.

To test full SDK integration, use the [Block Tester](https://blocktester.herokuapp.com/) — enter your block's local URL to simulate the Content Builder iframe environment.

---

## Deployment

Any push to `main` triggers the GitHub Actions workflow which:

1. Runs `bun run build` (`vite build` via SvelteKit, prerendered static output in `dist/`)
2. Publishes the `dist/` folder to GitHub Pages

The workflow reads the GitHub Pages base path automatically via `actions/configure-pages` and passes it to Vite as `BASE_PATH`, so asset URLs are correct when served from a subpath.

### First-time setup

1. Go to **Settings → Pages**
2. Set **Source** to **GitHub Actions**
3. Save — GitHub Pages will be live after the first successful Action run
