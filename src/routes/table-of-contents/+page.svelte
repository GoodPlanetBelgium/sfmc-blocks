<script lang="ts">
  import { buildEmailHTML, buildSuperHTML } from './template'
  import BlockShell from '$lib/BlockShell.svelte'
  import TextInput from '../../components/TextInput.svelte'
  import AnchorPicker from '../../components/AnchorPicker.svelte'
  import FilterSettings from '../../components/FilterSettings.svelte'
  import RichTextInput from '../../components/RichTextInput.svelte'
  import type BlockSDK from '$lib/blocksdk'
  import type { AnchorEntry } from '$lib/blocksdk'
  import type { ContentTableItem } from './template'

  let sdk = $state<BlockSDK | null>(null)
  let items = $state<ContentTableItem[]>([])
  let richTextHtml = $state('')
  let availableAnchors = $state<AnchorEntry[]>([])

  let emailHTML = $derived(buildEmailHTML(items, richTextHtml))
  let superHTML = $derived(buildSuperHTML(items, richTextHtml))

  $effect(() => {
    if (!sdk) return
    sdk.setContent(emailHTML)
    sdk.setSuperContent(superHTML)
    sdk.setData({ items: $state.snapshot(items), richTextHtml })
  })

  function loadAnchors(): void {
    sdk?.getCentralData((cd) => {
      const seen = new Set<string>()
      availableAnchors = (cd.anchors ?? []).filter((a) => {
        if (seen.has(a.anchor)) return false
        seen.add(a.anchor)
        return true
      })
    })
  }

  function onReady(data: unknown): void {
    const d = data as { items?: ContentTableItem[]; richTextHtml?: string } | null
    if (d?.items?.length) items = d.items.map((item) => ({ filters: {}, ...item }))
    if (d?.richTextHtml) richTextHtml = d.richTextHtml
    loadAnchors()
  }

  function addItem(): void {
    items = [...items, { title: '', anchor: '', filters: {} }]
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
    <RichTextInput bind:value={richTextHtml} {sdk} />
    {#each items as item, i (i)}
      <div class="flex flex-col gap-2 p-3 border border-[#e0e0e0] rounded bg-[#fafafa]">
        <div class="flex items-center justify-end">
          <button
            class="text-xs text-red-400 hover:text-red-600 cursor-pointer"
            onclick={() => removeItem(i)}>Remove</button
          >
        </div>
        <TextInput label="Title" bind:value={item.title} />
        <div>
          <TextInput label="Anchor" placeholder="#section" bind:value={item.anchor} />
          <div class="mt-1.5">
            <AnchorPicker anchors={availableAnchors} bind:value={item.anchor} onRefresh={loadAnchors} />
          </div>
        </div>
        <FilterSettings bind:value={item.filters!} />
      </div>
    {/each}
    <button
      class="w-full py-2 text-xs border border-dashed border-[#bbb] rounded text-[#666] hover:bg-[#f0f0f0] cursor-pointer transition-colors"
      onclick={addItem}>+ Add item</button
    >
  </div>
</BlockShell>
