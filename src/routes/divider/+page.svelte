<script lang="ts">
  import { buildEmailHTML } from './template'
  import BlockShell from '$lib/BlockShell.svelte'
  import type BlockSDK from '$lib/blocksdk'

  let sdk = $state<BlockSDK | null>(null)

  function onReady(): void {
    sdk?.setContent(buildEmailHTML())
  }
</script>

<svelte:head>
  <title>Divider Block</title>
</svelte:head>

<BlockShell storageKey="sfmc-dev-block-data:divider" bind:sdk {onReady} tabs={[]}>
  <p class="text-sm text-gray-500">No settings — renders a horizontal divider.</p>
</BlockShell>
