import { existsSync } from "node:fs";
import { cp, rm, writeFile } from "node:fs/promises";

// Add new blocks here — one entry per block
const blocks = ["cta-button"];
const dev = process.argv.includes("--dev");

await rm("dist", { recursive: true, force: true });

// Copy static assets
for (const block of blocks) {
	for (const asset of [
		"index.html",
		"styles.css",
		"icon.png",
		"dragIcon.png",
	]) {
		const src = `blocks/${block}/${asset}`;
		if (existsSync(src)) {
			await cp(src, `dist/${block}/${asset}`);
		}
	}
}

// Generate root index.html
const links = blocks
	.map((block) => `    <li><a href="${block}/">${block}</a></li>`)
	.join("\n");
await writeFile(
	"dist/index.html",
	`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SFMC Blocks</title>
</head>
<body>
  <h1>SFMC Blocks</h1>
  <ul>
${links}
  </ul>
</body>
</html>
`,
);

if (dev) {
	// Spawn a bun build --watch process per block
	const procs = blocks.map((block) =>
		Bun.spawn(
			[
				"bun",
				"build",
				`blocks/${block}/main.ts`,
				"--outfile",
				`dist/${block}/main.js`,
				"--watch",
			],
			{ stdout: "inherit", stderr: "inherit" },
		),
	);
	await Promise.all(procs.map((p) => p.exited));
} else {
	for (const block of blocks) {
		const result = await Bun.build({
			entrypoints: [`./blocks/${block}/main.ts`],
			outdir: `./dist/${block}`,
			minify: true,
			naming: "main.js",
		});
		if (!result.success) {
			for (const log of result.logs) console.error(log);
			process.exit(1);
		}
	}
	console.log("Build complete.");
}
