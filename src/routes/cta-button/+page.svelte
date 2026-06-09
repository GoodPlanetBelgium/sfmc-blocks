<script lang="ts">
  import { buildEmailHTML } from './template'
  import { applyContent, restoreFilterState } from '$lib/filterAmpscript'
  import BlockShell from '$lib/BlockShell.svelte'
  import ColorPicker from '../../components/ColorPicker.svelte'
  import FilterSettings from '../../components/FilterSettings.svelte'
  import TextInput from '../../components/TextInput.svelte'
  import type BlockSDK from '$lib/blocksdk'
  import type { FilterState } from '$lib/filters'

  const SIDE_PADDING = 12
  // Outlook/Word GDI font metrics run wider than browser canvas; scale up to prevent text clipping
  const OUTLOOK_SCALE = 1.5

  let url = $state('')
  let title = $state('')
  let color = $state('#e9860d')
  let filterState = $state<FilterState>({})
  let sdk = $state<BlockSDK | null>(null)

  function measureTextWidth(text: string): number {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    ctx.font = 'bold 16px Verdana, sans-serif'
    return Math.ceil(ctx.measureText(text || 'Button').width)
  }

  function updateBlock(): void {
    if (!sdk) return
    const width = measureTextWidth(title) + SIDE_PADDING * 2
    const outlookWidth = Math.ceil(width * OUTLOOK_SCALE)
    const snap = $state.snapshot(filterState) as FilterState
    const html = buildEmailHTML(url, title, color, width, outlookWidth, snap)
    applyContent(sdk, html, snap)
    sdk.setData({ url, title, color, filterState: snap })
  }

  // Track reactive state; explicit reads ensure tracking even when updateBlock returns early
  $effect(() => {
    url
    title
    color
    filterState
    updateBlock()
  })

  function onReady(data: unknown): void {
    const d = data as {
      url?: string
      title?: string
      color?: string
      filterState?: FilterState
    } | null
    if (d?.url) {
      url = d.url
      title = d.title ?? ''
      color = d.color ?? '#e9860d'
    } else {
      updateBlock()
    }
    restoreFilterState(d?.filterState, sdk, (s) => {
      filterState = s
    })
  }
</script>

<svelte:head>
  <title>CTA Button Block</title>
</svelte:head>

<BlockShell
  storageKey="sfmc-dev-block-data:cta-button"
  bind:sdk
  {onReady}
  onEditClose={updateBlock}
  tabs={[]}
  blockName="CTA Button"
>
  <TextInput label="url" placeholder="https://..." bind:value={url} />
  <TextInput label="Button text" bind:value={title} />
  <ColorPicker bind:value={color} />
  <FilterSettings bind:value={filterState} />
</BlockShell>
