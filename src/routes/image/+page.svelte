<script lang="ts">
  import { buildEmailHTML } from './template'
  import { applyContent, restoreFilterState } from '$lib/filterAmpscript'
  import BlockShell from '$lib/BlockShell.svelte'
  import FilterSettings from '../../components/FilterSettings.svelte'
  import AssetPicker from '../../components/AssetPicker.svelte'
  import type BlockSDK from '$lib/blocksdk'
  import type { SFMCAsset } from '$lib/sfmc-assets'
  import type { FilterState } from '$lib/filters'

  let sdk = $state<BlockSDK | null>(null)
  let imageUrl = $state('')
  let assetId = $state<number | null>(null)
  let filterState = $state<FilterState>({})

  function updateBlock(persist = true): void {
    if (!sdk) return
    const snap = $state.snapshot(filterState) as FilterState
    const html = buildEmailHTML(imageUrl, assetId, snap)
    applyContent(sdk, html, snap)
    if (persist) sdk.setData({ imageUrl, assetId, filterState: snap })
  }

  function onReady(data: unknown): void {
    const d = data as { imageUrl?: string; assetId?: number; filterState?: FilterState } | null
    imageUrl = d?.imageUrl ?? ''
    assetId = d?.assetId ?? null
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
  <title>Image Block</title>
</svelte:head>

<BlockShell
  storageKey="sfmc-dev-block-data:image"
  bind:sdk
  {onReady}
  onEditClose={updateBlock}
  tabs={['stylingblock']}
  blockName="Image"
>
  <div class="flex flex-col gap-2">
    <AssetPicker value={imageUrl} onselect={onSelect} />
    <FilterSettings bind:value={filterState} onchange={updateBlock} />
  </div>
</BlockShell>
