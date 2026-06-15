<script lang="ts">
  import { buildEmailHTML } from './template'
  import { applyContent, restoreFilterState } from '$lib/filterAmpscript'
  import BlockShell from '$lib/BlockShell.svelte'
  import FilterSettings from '../../components/FilterSettings.svelte'
  import AssetPicker from '../../components/AssetPicker.svelte'
  import RichTextInput from '../../components/RichTextInput.svelte'
  import type BlockSDK from '$lib/blocksdk'
  import type { SFMCAsset } from '$lib/sfmc-assets'
  import type { FilterState } from '$lib/filters'


  let sdk = $state<BlockSDK | null>(null)
  let imageUrl = $state('')
  let assetId = $state<number | null>(null)
  let editorHtml = $state(
    '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>'
  )
  let splitPct = $state(50)
  let swapped = $state(false)
  let filterState = $state<FilterState>({})

  function updateBlock(persist = true): void {
    if (!sdk) return
    const snap = $state.snapshot(filterState) as FilterState
    const html = buildEmailHTML(imageUrl, assetId, editorHtml, splitPct, swapped, snap)
    applyContent(sdk, html, snap)
    if (persist) sdk.setData({ imageUrl, assetId, editorHtml, splitPct, swapped, filterState: snap })
  }

  function onReady(data: unknown): void {
    const d = data as {
      imageUrl?: string
      assetId?: number
      editorHtml?: string
      splitPct?: number
      swapped?: boolean
      filterState?: FilterState
    } | null
    imageUrl = d?.imageUrl ?? ''
    assetId = d?.assetId ?? null
    editorHtml =
      d?.editorHtml ??
      '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>'
    splitPct = typeof d?.splitPct === 'number' ? Math.min(80, Math.max(20, d.splitPct)) : 50
    swapped = d?.swapped ?? false
    restoreFilterState(d?.filterState, sdk, (s) => {
      filterState = s
      updateBlock(false)
    })
  }

  function onSelect(url: string, asset: SFMCAsset): void {
    imageUrl = url
    assetId = asset.id
    updateBlock()
  }

  function swap(): void {
    swapped = !swapped
    updateBlock()
  }

  let leftLabel = $derived(swapped ? 'Text' : 'Image')
  let rightLabel = $derived(swapped ? 'Image' : 'Text')
</script>

<svelte:head>
  <title>Image + Text Block</title>
</svelte:head>

<BlockShell
  storageKey="sfmc-dev-block-data:image-text"
  bind:sdk
  {onReady}
  onEditClose={updateBlock}
  tabs={['stylingblock']}
  blockName="Image + Text"
>
  <div class="flex flex-col gap-3">
    <div class="flex flex-col gap-2">
      <p class="text-xs font-semibold uppercase tracking-[0.04em] text-[#555]">Column split</p>
      <input
        type="range"
        min="20"
        max="80"
        step="5"
        bind:value={splitPct}
        oninput={() => updateBlock()}
        class="w-full accent-[#0078d4]"
      />
      <!-- Split bar with swap button -->
      <div class="relative">
        <div class="flex rounded overflow-hidden select-none h-8 text-xs font-semibold">
          <div
            class="bg-[#ddd] text-[#444] flex flex-col items-center justify-center overflow-hidden transition-all"
            style="width: {splitPct}%"
          >
            <span class="leading-tight">{leftLabel}</span>
            <span class="leading-tight text-[10px] font-normal opacity-70">{splitPct}%</span>
          </div>
          <div
            class="bg-[#dce8f8] text-[#0060b0] flex flex-col items-center justify-center overflow-hidden transition-all"
            style="width: {100 - splitPct}%"
          >
            <span class="leading-tight">{rightLabel}</span>
            <span class="leading-tight text-[10px] font-normal opacity-70">{100 - splitPct}%</span>
          </div>
        </div>
        <!-- Swap button centered on the dividing line -->
        <button
          type="button"
          onclick={swap}
          aria-label="Swap image and text"
          class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white border border-[#ccc] shadow flex items-center justify-center cursor-pointer hover:bg-[#f0f6ff] hover:border-[#0078d4] hover:text-[#0078d4] transition-colors z-10 text-[#555]"
          style="left: {splitPct}%"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m16 3 4 4-4 4" />
            <path d="M20 7H4" />
            <path d="m8 21-4-4 4-4" />
            <path d="M4 17h16" />
          </svg>
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-1">
      <p class="text-xs font-semibold uppercase tracking-[0.04em] text-[#555]">Image</p>
      <AssetPicker value={imageUrl} onselect={onSelect} />
    </div>

    <div class="flex flex-col gap-1">
      <p class="text-xs font-semibold uppercase tracking-[0.04em] text-[#555]">Text content</p>
      <RichTextInput bind:value={editorHtml} {sdk} onchange={updateBlock} />
    </div>

    <FilterSettings bind:value={filterState} onchange={updateBlock} />
  </div>
</BlockShell>
