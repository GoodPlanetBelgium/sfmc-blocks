<script lang="ts">
  import type { AnchorEntry } from '$lib/blocksdk'

  interface Props {
    anchors: AnchorEntry[]
    value: string
    onRefresh?: () => void
  }

  let { anchors, value = $bindable(), onRefresh }: Props = $props()

  let stale = $derived(
    value.startsWith('#') &&
      value.length > 1 &&
      anchors.length > 0 &&
      !anchors.some((a) => '#' + a.anchor === value)
  )
</script>

{#if stale}
  <p class="text-[11px] text-amber-600 mb-1">
    Anchor not found — it may have been renamed or removed.
    {#if onRefresh}
      <button class="underline cursor-pointer" onclick={onRefresh}>Refresh</button>
    {/if}
  </p>
{/if}

{#if anchors.length > 0 || onRefresh}
  <div>
    <div class="flex items-center gap-2 mb-1">
      <p class="text-[11px] text-[#888]">Or choose an anchor:</p>
      {#if onRefresh}
        <button
          class="text-[11px] text-[#0078d4] hover:underline cursor-pointer"
          onclick={onRefresh}>Refresh</button
        >
      {/if}
    </div>
    {#if anchors.length > 0}
      <div class="flex flex-wrap gap-1">
        {#each anchors as a (a.anchor)}
          <button
            class="px-2 py-0.5 text-xs rounded border cursor-pointer transition-colors duration-100 {value ===
            '#' + a.anchor
              ? 'bg-[#0078d4] text-white border-[#0078d4]'
              : 'border-[#ddd] hover:bg-[#eee]'}"
            onclick={() => (value = '#' + a.anchor)}>{a.title}</button
          >
        {/each}
      </div>
    {:else}
      <p class="text-[11px] text-[#aaa]">No anchors found.</p>
    {/if}
  </div>
{/if}
