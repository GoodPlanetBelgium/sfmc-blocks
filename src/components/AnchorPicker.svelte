<script lang="ts">
  import type { AnchorEntry } from '$lib/blocksdk'

  interface Props {
    anchors: AnchorEntry[]
    value: string
  }

  let { anchors, value = $bindable() }: Props = $props()
</script>

{#if anchors.length > 0}
  <div>
    <p class="text-[11px] text-[#888] mb-1">Of kies een anker:</p>
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
  </div>
{/if}
