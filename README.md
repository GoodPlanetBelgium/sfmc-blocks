# SFMC Blocks — GoodPlanet Belgium

Custom Content Builder blocks for Salesforce Marketing Cloud, hosted on GitHub Pages at:

```
https://goodplanetbelgium.github.io/sfmc-blocks/<block-name>/
```

---

## How it works

Each block is a small static web app — an `index.html`, a `styles.css`, and a `main.js` entry point — that gets bundled by webpack and deployed to GitHub Pages. Salesforce Marketing Cloud loads the block's `index.html` in an iframe inside Content Builder. The block communicates with Content Builder via the BlockSDK (vendored in `shared/blocksdk.js`), reading and writing block data and emitting the final email HTML.

### Key decisions made along the way

**Why static files, not a CloudPages Landing Page?**
CloudPages Code Resources don't support `text/html` as a content type (only JS, CSS, JSON, RSS, Text, XML), so they can't serve a proper HTML document for the iframe. Landing Pages work but are tightly coupled to the SFMC platform, require manual publishing, and have no version control. Static files on GitHub Pages give us a proper dev workflow, full version history, and automatic deploys on push.

**Why webpack instead of a plain script tag?**
The BlockSDK is vendored locally (`shared/blocksdk.js`) and required by each block via `require()`. Webpack bundles the SDK and block logic together into a single `main.js` with no external CDN dependencies. This avoids the unreliable CDN URL (`contentbuilder.marketingcloud.com/js/2.0/blocksdk.js` — broken) and the archived npm package's CDN serving.

**Why vendor the BlockSDK instead of using the npm package?**
The official `salesforce-marketingcloud/blocksdk` GitHub repo was archived in January 2024 and is no longer maintained. Vendoring the source in `shared/blocksdk.js` gives us a stable, auditable copy that won't disappear.

**Constructor and whitelist**
The correct constructor is `new BlockSDK(whitelist, sslOverride)` — **not** `new ContentBlockSDK()` and not `new window.sfdc.BlockSDK()` when using the module directly. The whitelist must include the SFMC parent domains:
```js
var sdk = new BlockSDK(
  ['exacttarget.com', 'marketingcloudapps.com', 'blocktester.herokuapp.com'],
  false
);
```
Without the correct whitelist the SDK's origin validation silently rejects the handshake and the block appears as raw HTML in Content Builder.

**`setContent` vs `setSuperContent`**
Use `sdk.setContent(html)` — this is the HTML that ends up in the email. `setSuperContent` is a display-only placeholder used by some blocks for preview purposes; it is not sent at email send time.

**Dynamic button width**
The CTA button uses the Canvas API (`ctx.measureText()`) to measure the rendered text width at `bold 18px Arial` and calculates the button width as `textWidth + 40px` (20px padding per side). This value is written into both the `<a>` tag's `width` style and the VML `v:roundrect` `width` attribute, ensuring consistent Outlook rendering without a hardcoded fixed width.

**Installed Package registration**
Blocks are registered in SFMC under **Setup → Apps → Installed Packages**. Each block is a **Custom Content Block** component whose **Endpoint URL** points to the GitHub Pages URL for that block (e.g. `https://goodplanetbelgium.github.io/sfmc-blocks/cta-button/`). Content Builder loads `index.html` relative to this endpoint automatically.

---

## Repo structure

```
sfmc-blocks/
├── .github/
│   └── workflows/
│       └── deploy.yml          ← builds and deploys to GitHub Pages on push to main
├── blocks/
│   └── cta-button/
│       ├── index.html          ← editor UI shell
│       ├── main.js             ← block logic (webpack entry point)
│       └── styles.css          ← editor styles
├── shared/
│   └── blocksdk.js             ← vendored BlockSDK source
├── .gitignore
├── package.json
├── README.md
└── webpack.config.js
```

---

## Adding a new block

1. Create a new folder under `blocks/`:
   ```
   blocks/
   └── my-new-block/
       ├── index.html
       ├── main.js
       └── styles.css
   ```

2. In `main.js`, require the shared SDK and follow the same pattern as `cta-button/main.js`:
   ```js
   var BlockSDK = require('../../shared/blocksdk.js');

   if (window.self === window.top) {
     document.body.innerText = 'This block is for use in Salesforce Marketing Cloud Content Builder only.';
   } else {
     var sdk = new BlockSDK(['exacttarget.com', 'marketingcloudapps.com'], false);
     // your block logic here
   }
   ```

3. Register the block name in `webpack.config.js`:
   ```js
   const blocks = [
     'cta-button',
     'my-new-block', // add here
   ];
   ```

4. Push to `main` — GitHub Actions builds and deploys automatically.

5. In SFMC, add a new **Custom Content Block** component to the Installed Package with endpoint URL:
   ```
   https://goodplanetbelgium.github.io/sfmc-blocks/my-new-block/
   ```

---

## Local development

```bash
npm install
npm run dev       # webpack in watch mode, rebuilds on file save
```

Open `dist/cta-button/index.html` directly in a browser to check layout and styles. The BlockSDK calls (`getData`, `setContent`) will silently fail outside the SFMC iframe — that's expected. All visual and form logic can be validated this way.

To test the full SDK integration, use the [Block Tester](https://blocktester.herokuapp.com/) — enter your block's local URL (you may need to allow insecure iframes in your browser) to simulate the Content Builder iframe environment.

---

## Deployment

Deployment is automatic. Any push to `main` triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`) which:

1. Installs dependencies (`npm ci`)
2. Runs `npm run build` (webpack production build)
3. Publishes the `dist/` folder to the `gh-pages` branch via `peaceiris/actions-gh-pages`

GitHub Pages serves the `gh-pages` branch at `https://goodplanetbelgium.github.io/sfmc-blocks/`.

### First-time setup

After creating the repo in the GoodPlanetBelgium GitHub org:

1. Go to **Settings → Pages**
2. Set **Source** to **Deploy from a branch**
3. Set **Branch** to `gh-pages`, folder `/` (root)
4. Save — GitHub Pages will be live after the first successful Action run
