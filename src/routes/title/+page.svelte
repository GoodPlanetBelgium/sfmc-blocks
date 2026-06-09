<script lang="ts">
  import type BlockSDK from '$lib/blocksdk'
  import BlockShell from '$lib/BlockShell.svelte'
  import ColorPicker from '../../components/ColorPicker.svelte'
  import FilterSettings from '../../components/FilterSettings.svelte'
  import TextInput from '../../components/TextInput.svelte'
  import { buildEmailHTML } from './template'
  import { applyContent, restoreFilterState } from '$lib/filterAmpscript'
  import type { FilterState } from '$lib/filters'

  let title = $state('')
  let anchor = $derived(
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  )
  let color = $state('#e9860d')
  let filterState = $state<FilterState>({})
  let sdk = $state<BlockSDK | null>(null)
  let blockId = ''
  let anchorDebounceTimer: ReturnType<typeof setTimeout> | null = null

  function writeCentralData(): void {
    if (!sdk) return
    const currentAnchor = anchor
    const currentTitle = title
    const id = blockId
    sdk.getCentralData((cd) => {
      const anchors = (cd.anchors ?? []).filter((a) => a.id !== id)
      if (currentAnchor) anchors.push({ id, anchor: currentAnchor, title: currentTitle })
      sdk?.setCentralData({ ...cd, anchors })
    })
  }

  function updateBlock(flushAnchor = false): void {
    if (!sdk) return
    const currentAnchor = anchor
    const currentTitle = title
    const snap = $state.snapshot(filterState) as FilterState
    const html = buildEmailHTML(currentAnchor, currentTitle, color, snap)
    applyContent(sdk, html, snap)
    sdk.setData({ title: currentTitle, color, filterState: snap, blockId })
    if (flushAnchor) {
      if (anchorDebounceTimer) { clearTimeout(anchorDebounceTimer); anchorDebounceTimer = null }
      writeCentralData()
    } else {
      if (anchorDebounceTimer) clearTimeout(anchorDebounceTimer)
      anchorDebounceTimer = setTimeout(writeCentralData, 300)
    }
  }

  $effect(() => {
    title
    color
    filterState
    updateBlock()
  })

  function onReady(data: unknown): void {
    const d = data as { title?: string; color?: string; filterState?: FilterState; blockId?: string } | null
    blockId = d?.blockId ?? crypto.randomUUID()
    if (d?.title) {
      title = d.title
      color = d.color ?? '#e9860d'
    } else {
      updateBlock()
    }
    restoreFilterState(d?.filterState, sdk, (s) => { filterState = s })
  }
</script>

<BlockShell storageKey="sfmc-dev-block-data:title" bind:sdk {onReady} onEditClose={() => updateBlock(true)} tabs={[]} blockName="Title">
  <TextInput label="Title" bind:value={title} />
  <ColorPicker bind:value={color} />
  <FilterSettings bind:value={filterState} />
</BlockShell>
