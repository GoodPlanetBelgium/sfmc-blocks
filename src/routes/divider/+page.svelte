<script lang="ts">
  import { buildEmailHTML } from './template'
  import { applyContent, restoreFilterState } from '$lib/filterAmpscript'
  import BlockShell from '$lib/BlockShell.svelte'
  import FilterSettings from '../../components/FilterSettings.svelte'
  import type BlockSDK from '$lib/blocksdk'
  import type { FilterState } from '$lib/filters'

  let sdk = $state<BlockSDK | null>(null)
  let filterState = $state<FilterState>({})

  function updateBlock(persist = true): void {
    if (!sdk) return
    const snap = $state.snapshot(filterState) as FilterState
    const html = buildEmailHTML(snap)
    applyContent(sdk, html, snap)
    if (persist) sdk.setData({ filterState: snap })
  }

  function onReady(data: unknown): void {
    const d = data as { filterState?: FilterState } | null
    restoreFilterState(d?.filterState, sdk, (s) => {
      filterState = s
      updateBlock(false)
    })
  }
</script>

<svelte:head>
  <title>Divider Block</title>
</svelte:head>

<BlockShell
  storageKey="sfmc-dev-block-data:divider"
  bind:sdk
  {onReady}
  onEditClose={updateBlock}
  tabs={[]}
  blockName="Divider"
>
  <p class="text-[11px] text-[#888] uppercase tracking-[0.04em]">Horizontal divider</p>
  <FilterSettings bind:value={filterState} onchange={updateBlock} />
</BlockShell>
