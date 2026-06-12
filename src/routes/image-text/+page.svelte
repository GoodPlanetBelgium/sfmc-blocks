<script lang="ts">
  import { buildEmailHTML, VALID_LAYOUTS, type Layout } from './template'
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
  let layout = $state<Layout>('image-left-50-50')
  let filterState = $state<FilterState>({})

  function updateBlock(persist = true): void {
    if (!sdk) return
    const snap = $state.snapshot(filterState) as FilterState
    const html = buildEmailHTML(imageUrl, assetId, editorHtml, layout, snap)
    applyContent(sdk, html, snap)
    if (persist) sdk.setData({ imageUrl, assetId, editorHtml, layout, filterState: snap })
  }

  function migrateLayout(raw: unknown): Layout {
    if (raw === 'image-left') return 'image-left-50-50'
    if (raw === 'text-left') return 'text-left-50-50'
    if (VALID_LAYOUTS.includes(raw as Layout)) return raw as Layout
    return 'image-left-50-50'
  }

  function onReady(data: unknown): void {
    const d = data as {
      imageUrl?: string
      assetId?: number
      editorHtml?: string
      layout?: unknown
      filterState?: FilterState
    } | null
    imageUrl = d?.imageUrl ?? ''
    assetId = d?.assetId ?? null
    editorHtml =
      d?.editorHtml ??
      '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>'
    layout = migrateLayout(d?.layout)
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
    <div class="flex flex-col gap-1">
      <p class="text-xs font-semibold uppercase tracking-[0.04em] text-[#555]">Layout</p>
      <select
        bind:value={layout}
        onchange={() => updateBlock()}
        class="border border-[#ddd] rounded px-2 py-1.5 text-sm outline-none focus:border-[#0078d4] bg-white"
      >
        <option value="image-left-50-50">Image / text — 50/50</option>
        <option value="text-left-50-50">Text / image — 50/50</option>
        <option value="image-left-40-60">Image / text — 40/60</option>
        <option value="text-left-60-40">Text / image — 60/40</option>
        <option value="image-left-20-80">Image / text — 20/80</option>
        <option value="text-left-80-20">Text / image — 80/20</option>
      </select>
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
