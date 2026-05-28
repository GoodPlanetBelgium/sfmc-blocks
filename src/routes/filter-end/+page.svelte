<script lang="ts">
  import { buildEmailHTML, buildSuperContent } from './template'
  import BlockShell from '$lib/BlockShell.svelte'
  import type BlockSDK from '$lib/blocksdk'

  let sdk = $state<BlockSDK | null>(null)

  function updateBlock(): void {
    if (!sdk) return
    sdk.setContent(buildEmailHTML())
    sdk.setSuperContent(buildSuperContent())
  }

  function onReady(_data: unknown): void {
    updateBlock()
  }
</script>

<svelte:head>
  <title>Filter End Block</title>
</svelte:head>

<BlockShell storageKey="sfmc-dev-block-data:filter-end" bind:sdk {onReady}>
  <p class="text-[11px] text-[#888] uppercase tracking-[0.04em]">
    Visibility filter — end
  </p>
</BlockShell>
