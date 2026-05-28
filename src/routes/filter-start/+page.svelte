<script lang="ts">
  import { buildEmailHTML, buildSuperContent } from './template'
  import BlockShell from '$lib/BlockShell.svelte'
  import FilterSettings from '../../components/FilterSettings.svelte'
  import type BlockSDK from '$lib/blocksdk'
  import type { FilterState } from '$lib/filters'

  let sdk = $state<BlockSDK | null>(null)
  let filterState = $state<FilterState>({})

  function updateBlock(persist = true): void {
    if (!sdk) return
    const snap = $state.snapshot(filterState) as FilterState
    sdk.setContent(buildEmailHTML(snap))
    sdk.setSuperContent(buildSuperContent(snap))
    if (persist) sdk.setData({ filterState: snap })
  }

  function onReady(data: unknown): void {
    const d = data as { filterState?: FilterState } | null
    filterState = d?.filterState ?? {}
    updateBlock(false)
  }
</script>

<svelte:head>
  <title>Filter Start Block</title>
</svelte:head>

<BlockShell
  storageKey="sfmc-dev-block-data:filter-start"
  bind:sdk
  {onReady}
  onEditClose={updateBlock}
>
  <FilterSettings bind:value={filterState} onchange={updateBlock} />
</BlockShell>
