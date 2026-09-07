<script lang="ts">
  import { buildEmailHTML } from './template'
  import { applyContent, restoreFilterState } from '$lib/filterAmpscript'
  import { cropperStore } from '$lib/cropperStore'
  import BlockShell from '$lib/BlockShell.svelte'
  import FilterSettings from '../../components/FilterSettings.svelte'
  import AssetPicker from '../../components/AssetPicker.svelte'
  import type BlockSDK from '$lib/blocksdk'
  import type { SFMCAsset } from '$lib/sfmc-assets'
  import type { FilterState } from '$lib/filters'

  let sdk = $state<BlockSDK | null>(null)
  let imageUrl = $state('')
  let assetId = $state<number | null>(null)
  let originalAssetUrl = $state<string | null>(null)
  let originalAssetId = $state<number | null>(null)
  let originalCategoryId = $state<number | null>(null)
  let filterState = $state<FilterState>({})
  let imageWidth = $state(100)
  let imageAlignment = $state<'left' | 'center' | 'right'>('center')

  function updateBlock(persist = true): void {
    if (!sdk) return
    const snap = $state.snapshot(filterState) as FilterState
    const html = buildEmailHTML(imageUrl, assetId, imageWidth, imageAlignment, snap)
    applyContent(sdk, html, snap)
    if (persist) {
      sdk.setData({
        imageUrl,
        assetId,
        originalAssetUrl,
        originalAssetId,
        originalCategoryId,
        imageWidth,
        imageAlignment,
        filterState: snap
      })
    }
  }

  function onReady(data: unknown): void {
    const d = data as {
      imageUrl?: string
      assetId?: number
      originalAssetUrl?: string
      originalAssetId?: number
      originalCategoryId?: number
      imageWidth?: number
      imageAlignment?: 'left' | 'center' | 'right'
      filterState?: FilterState
    } | null
    imageUrl = d?.imageUrl ?? ''
    assetId = d?.assetId ?? null
    originalAssetUrl = d?.originalAssetUrl ?? null
    originalAssetId = d?.originalAssetId ?? null
    originalCategoryId = d?.originalCategoryId ?? null
    imageWidth = d?.imageWidth ?? 100
    imageAlignment = d?.imageAlignment ?? 'center'
    restoreFilterState(d?.filterState, sdk, (s) => {
      filterState = s
      updateBlock(false)
    })
  }

  function onSelect(url: string, asset: SFMCAsset): void {
    imageUrl = url
    assetId = asset.id
    originalAssetUrl = url
    originalAssetId = asset.id
    originalCategoryId = asset.category?.id ?? null
    updateBlock()
  }

  function onCropApplied(url: string, newAssetId: number): void {
    imageUrl = url
    assetId = newAssetId
    // Keep originalAssetUrl & originalAssetId unchanged
    cropperStore.close()
    updateBlock()
  }

  function openCropper(): void {
    console.log('openCropper called', { originalAssetUrl, originalCategoryId })
    if (originalAssetUrl && originalCategoryId !== null) {
      console.log('Opening cropper with:', { originalAssetUrl, originalCategoryId })
      cropperStore.open(originalAssetUrl, originalCategoryId, onCropApplied, () => {
        cropperStore.close()
      })
    } else {
      console.warn('Cannot open cropper: missing originalAssetUrl or originalCategoryId')
    }
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
    {#if imageUrl && originalCategoryId !== null}
      <button
        type="button"
        onclick={openCropper}
        class="px-3 py-1.5 rounded border border-[#0176d3] text-xs text-[#0176d3] hover:bg-[#e8f0fb] transition-colors cursor-pointer"
      >
        ✂️ Crop image
      </button>
    {/if}

    {#if imageUrl}
      <div class="flex flex-col gap-3 p-3 bg-[#f9f9f9] rounded border border-[#ddd]">
        <!-- Width Slider -->
        <div>
          <label for="width-slider" class="block text-xs font-semibold text-[#333] mb-2">
            Width: {Math.round(imageWidth)}%
          </label>
          <input
            id="width-slider"
            type="range"
            min="20"
            max="100"
            step="any"
            value={imageWidth}
            oninput={(e) => {
              imageWidth = Number(e.currentTarget.value)
              updateBlock()
            }}
            class="w-full"
          />
        </div>

        <!-- Alignment Buttons -->
        {#if imageWidth < 100}
          <fieldset class="border-0 p-0 m-0">
            <legend class="block text-xs font-semibold text-[#333] mb-2">Alignment</legend>
            <div class="flex gap-1">
              {#each [
                { value: 'left', label: 'Left' },
                { value: 'center', label: 'Center' },
                { value: 'right', label: 'Right' }
              ] as option}
                <button
                  type="button"
                  onclick={() => {
                    imageAlignment = option.value as 'left' | 'center' | 'right'
                    updateBlock()
                  }}
                  class="flex-1 px-2 py-1.5 rounded border text-xs font-medium transition-colors {imageAlignment ===
                  option.value
                    ? 'bg-[#0176d3] text-white border-[#0156a0]'
                    : 'bg-white text-[#333] border-[#ddd] hover:bg-[#f5f5f5]'}"
                >
                  {option.label}
                </button>
              {/each}
            </div>
          </fieldset>
        {/if}
      </div>
    {/if}

    <FilterSettings bind:value={filterState} onchange={updateBlock} />
  </div>
</BlockShell>
