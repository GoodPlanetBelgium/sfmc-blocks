<script lang="ts">
	import { buildEmailHTML } from "$lib/blocks/cta-button/template";
	import BlockShell from "$lib/BlockShell.svelte";
	import type BlockSDK from "$lib/blocksdk";

	const COLORS = [
		{ id: "c-orange", value: "#e9860d", label: "Oranje" },
		{ id: "c-lightgreen", value: "#afca14", label: "Lichtgroen" },
		{ id: "c-pink", value: "#e72d52", label: "Roze" },
		{ id: "c-green", value: "#29af8a", label: "Groen" },
		{ id: "c-blue", value: "#1895d3", label: "Blauw" },
	];

	const SIDE_PADDING = 20;
	// Outlook/Word GDI font metrics run wider than browser canvas; scale up to prevent text clipping
	const OUTLOOK_SCALE = 1.25;

	let url = $state("");
	let title = $state("");
	let color = $state("#e9860d");
	let sdk = $state<BlockSDK | null>(null);

	function measureTextWidth(text: string): number {
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
		ctx.font = "bold 16px Verdana, sans-serif";
		return Math.ceil(ctx.measureText(text || "Button").width);
	}

	function updateBlock(): void {
		if (!sdk) return;
		const width = measureTextWidth(title) + SIDE_PADDING * 2;
		const outlookWidth = Math.ceil(width * OUTLOOK_SCALE);
		sdk.setContent(buildEmailHTML(url, title, color, width, outlookWidth));
		sdk.setData({ url, title, color });
	}

	// Track reactive state; explicit reads ensure tracking even when updateBlock returns early
	$effect(() => {
		url;
		title;
		color;
		updateBlock();
	});

	function onReady(data: unknown): void {
		const d = data as { url?: string; title?: string; color?: string } | null;
		if (d?.url) {
			url = d.url;
			title = d.title ?? "";
			color = d.color ?? "#e9860d";
		} else {
			updateBlock();
		}
	}
</script>

<svelte:head>
	<title>CTA Button Block</title>
</svelte:head>

<BlockShell storageKey="sfmc-dev-block-data:cta-button" bind:sdk {onReady}>
	{#snippet editor()}
		<div class="font-sans text-sm text-[#333] bg-white p-4">
			<div class="mb-3.5">
				<label for="btn-url" class="block font-semibold mb-1 text-xs text-[#555] uppercase tracking-[0.04em]">
					URL
				</label>
				<input
					type="text"
					id="btn-url"
					bind:value={url}
					placeholder="https://…"
					class="w-full px-2.5 py-2 border border-[#d0d0d0] rounded text-sm outline-none focus:border-[#0078d4]"
				/>
			</div>

			<div class="mb-3.5">
				<label for="btn-title" class="block font-semibold mb-1 text-xs text-[#555] uppercase tracking-[0.04em]">
					Buttontekst
				</label>
				<input
					type="text"
					id="btn-title"
					bind:value={title}
					placeholder="Bijv. Ons aanbod voor kleuteronderwijs"
					class="w-full px-2.5 py-2 border border-[#d0d0d0] rounded text-sm outline-none focus:border-[#0078d4]"
				/>
			</div>

			<fieldset class="mb-3.5 border-0 p-0">
				<legend class="block font-semibold mb-1 text-xs text-[#555] uppercase tracking-[0.04em]">
					Kleur
				</legend>
				<div class="grid grid-cols-4 gap-2">
					{#each COLORS as c (c.id)}
						<div class="relative">
							<input
								type="radio"
								name="color"
								id={c.id}
								value={c.value}
								bind:group={color}
								class="absolute opacity-0 w-0 h-0"
							/>
							<label
								for={c.id}
								class="flex flex-col items-center gap-1 px-1 py-2 border-2 rounded-md cursor-pointer text-[11px] font-normal normal-case tracking-normal text-[#444] transition-[border-color] duration-150 {c.value === color ? 'border-[#0078d4] bg-[#f0f7ff]' : 'border-transparent'}"
							>
								<span class="w-8 h-8 rounded-full border border-black/12" style="background: {c.value}"></span>
								{c.label}
							</label>
						</div>
					{/each}
				</div>
			</fieldset>

			<div class="mt-4 pt-3.5 border-t border-[#eee]">
				<p class="text-[11px] text-[#888] mb-2 uppercase tracking-[0.04em]">Voorbeeld</p>
				<span
					class="inline-block rounded-lg text-white text-base font-bold leading-11.25 text-center px-5"
					style="background-color: {color}; font-family: Arial, Helvetica, sans-serif;"
				>
					{title || "Buttontekst"}
				</span>
			</div>
		</div>
	{/snippet}
</BlockShell>
