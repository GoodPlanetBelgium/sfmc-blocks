# SFMC Blocks — GoodPlanet Belgium

Custom Content Builder blocks for Salesforce Marketing Cloud, hosted on GitHub Pages at:

```
https://goodplanetbelgium.github.io/sfmc-blocks/<block-name>/
```

---

## How it works

Each block is a small static web app (`index.html`, `styles.css`, `main.ts`) bundled by Bun and deployed to GitHub Pages. SFMC loads the block in an iframe inside Content Builder. The block communicates with Content Builder via the BlockSDK (vendored in `shared/blocksdk.ts`), reading and writing block data and emitting the final email HTML.

### Key decisions

**Why static files on GitHub Pages?**
CloudPages Code Resources don't support `text/html`, so they can't serve a proper HTML document for the iframe. Static files on GitHub Pages give us a proper dev workflow, full version history, and automatic deploys on push.

**Why vendor the BlockSDK?**
The official `salesforce-marketingcloud/blocksdk` repo was archived in January 2024. Vendoring in `shared/blocksdk.ts` gives us a stable, auditable copy.

**Constructor and whitelist**
The correct constructor is `new BlockSDK(whitelist, sslOverride)`. The whitelist must include the SFMC parent domains:
```ts
const sdk = new BlockSDK(
  ['exacttarget.com', 'marketingcloudapps.com', 'blocktester.herokuapp.com'],
  false
);
```
Without the correct whitelist the SDK silently rejects the handshake and the block appears as raw HTML in Content Builder.

**`setContent` vs `setSuperContent`**
Use `sdk.setContent(html)` — this is the HTML that ends up in the email. `setSuperContent` is display-only and is not sent at email send time.

**Dynamic button width**
The CTA button uses the Canvas API (`ctx.measureText()`) to measure rendered text at `bold 18px Arial` and sets button width as `textWidth + 40px`. This is written into both the `<a>` tag and the VML `v:roundrect` for consistent Outlook rendering.

**Installed Package registration**
Register blocks under **Setup → Apps → Installed Packages** as a **Custom Content Block**. Set the **Endpoint URL** to the GitHub Pages URL (e.g. `https://goodplanetbelgium.github.io/sfmc-blocks/cta-button/`).

---

## Repo structure

```
sfmc-blocks/
├── .github/workflows/deploy.yml  ← builds and deploys to GitHub Pages on push to main
├── blocks/
│   └── cta-button/
│       ├── index.html            ← editor UI shell
│       ├── main.ts               ← block logic (Bun entry point)
│       └── styles.css
├── shared/
│   └── blocksdk.ts               ← vendored BlockSDK source
├── build.ts                      ← build script (Bun)
├── biome.json
├── package.json
└── tsconfig.json
```

---

## Adding a new block

1. Create a new folder under `blocks/`:
   ```
   blocks/my-new-block/
   ├── index.html
   ├── main.ts
   └── styles.css
   ```

2. In `main.ts`, follow the same pattern as `cta-button/main.ts`:
   ```ts
   import BlockSDK from '../../shared/blocksdk';

   if (window.self === window.top) {
     document.body.innerText = 'This block is for use in Salesforce Marketing Cloud Content Builder only.';
   } else {
     const sdk = new BlockSDK(['exacttarget.com', 'marketingcloudapps.com'], false);
     // your block logic here
   }
   ```

3. Register the block name in `build.ts`:
   ```ts
   const blocks = ['cta-button', 'my-new-block'];
   ```

4. Push to `main` — GitHub Actions builds and deploys automatically.

5. In SFMC, add a new **Custom Content Block** with endpoint URL:
   ```
   https://goodplanetbelgium.github.io/sfmc-blocks/my-new-block/
   ```

---

## Local development

```bash
bun install
bun dev       # Bun build in watch mode, rebuilds on file save
```

Open `dist/cta-button/index.html` in a browser to check layout and styles. BlockSDK calls (`getData`, `setContent`) will silently fail outside the SFMC iframe — that's expected.

To test full SDK integration, use the [Block Tester](https://blocktester.herokuapp.com/) — enter your block's local URL to simulate the Content Builder iframe environment.

---

## Deployment

Any push to `main` triggers the GitHub Actions workflow which:

1. Runs `bun run build` (Bun production build, minified)
2. Publishes the `dist/` folder to the `gh-pages` branch

### First-time setup

1. Go to **Settings → Pages**
2. Set **Source** to **Deploy from a branch**
3. Set **Branch** to `gh-pages`, folder `/` (root)
4. Save — GitHub Pages will be live after the first successful Action run
