<script lang="ts">
  import { buildEmailHTML } from './template'
  import BlockShell from '$lib/BlockShell.svelte'
  import TextInput from '../../components/TextInput.svelte'
  import AnchorPicker from '../../components/AnchorPicker.svelte'
  import type BlockSDK from '$lib/blocksdk'
  import type { AnchorEntry } from '$lib/blocksdk'
  import type { ContentTableItem } from './template'

  let sdk = $state<BlockSDK | null>(null)
  let items = $state<ContentTableItem[]>([])
  let availableAnchors = $state<AnchorEntry[]>([])

  let emailHTML = $derived(buildEmailHTML(items))

  $effect(() => {
    if (!sdk) return
    sdk.setContent(emailHTML)
    sdk.setData({ items: $state.snapshot(items) })
  })

  function onReady(data: unknown): void {
    const d = data as { items?: ContentTableItem[] } | null
    if (d?.items?.length) items = d.items
    sdk?.getCentralData((cd) => {
      const seen = new Set<string>()
      availableAnchors = (cd.anchors ?? []).filter((a) => {
        if (seen.has(a.anchor)) return false
        seen.add(a.anchor)
        return true
      })
    })
  }

  function addItem(): void {
    items = [...items, { title: '', anchor: '' }]
  }

  function removeItem(index: number): void {
    items = items.filter((_, i) => i !== index)
  }
</script>

<svelte:head>
  <title>Table of Contents Block</title>
</svelte:head>

<BlockShell storageKey="sfmc-dev-block-data:table-of-contents" bind:sdk {onReady} tabs={[]} blockName="Table of contents">
  <div class="flex flex-col gap-3">
    {#each items as item, i (i)}
      <div class="flex flex-col gap-2 p-3 border border-[#e0e0e0] rounded bg-[#fafafa]">
        <div class="flex items-center justify-end">
          <button
            class="text-xs text-red-400 hover:text-red-600 cursor-pointer"
            onclick={() => removeItem(i)}>Verwijder</button
          >
        </div>
        <TextInput label="Titel" bind:value={item.title} />
        <div>
          <TextInput label="Anker" placeholder="#sectie" bind:value={item.anchor} />
          <div class="mt-1.5">
            <AnchorPicker anchors={availableAnchors} bind:value={item.anchor} />
          </div>
        </div>
      </div>
    {/each}
    <button
      class="w-full py-2 text-xs border border-dashed border-[#bbb] rounded text-[#666] hover:bg-[#f0f0f0] cursor-pointer transition-colors"
      onclick={addItem}>+ Item toevoegen</button
    >
  </div>
</BlockShell>
