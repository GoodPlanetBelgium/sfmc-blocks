<script lang="ts">
  import { buildEmailHTML, buildSuperHTML } from './template'
  import BlockShell from '$lib/BlockShell.svelte'
  import TextInput from '../../components/TextInput.svelte'
  import AnchorPicker from '../../components/AnchorPicker.svelte'
  import FilterSettings from '../../components/FilterSettings.svelte'
  import RichTextInput from '../../components/RichTextInput.svelte'
  import Label from '../../components/Label.svelte'
  import type BlockSDK from '$lib/blocksdk'
  import type { AnchorEntry } from '$lib/blocksdk'
  import type { ContentTableItem } from './template'

  let sdk = $state<BlockSDK | null>(null)
  let items = $state<ContentTableItem[]>([])
  let richTextHtml = $state('')
  let availableAnchors = $state<AnchorEntry[]>([])
  let expandedItems = $state<boolean[]>([])

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
    expandedItems = new Array(items.length).fill(false)
    loadAnchors()
  }

  function addItem(): void {
    items = [...items, { title: '', anchor: '', filters: {} }]
    expandedItems = [...expandedItems, true]
  }

  function removeItem(index: number): void {
    items = items.filter((_, i) => i !== index)
    expandedItems = expandedItems.filter((_, i) => i !== index)
  }

  function moveItem(index: number, direction: -1 | 1): void {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= items.length) return
    const newItems = [...items]
    ;[newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]]
    items = newItems
    const newExpanded = [...expandedItems]
    ;[newExpanded[index], newExpanded[newIndex]] = [newExpanded[newIndex], newExpanded[index]]
    expandedItems = newExpanded
  }

  function toggleItem(index: number): void {
    expandedItems = expandedItems.map((v, i) => (i === index ? !v : v))
  }
</script>

<svelte:head>
  <title>Table of Contents Block</title>
</svelte:head>

<BlockShell
  storageKey="sfmc-dev-block-data:table-of-contents"
  bind:sdk
  {onReady}
  tabs={[]}
  blockName="Table of contents"
>
  <div class="flex flex-col gap-3">
    <RichTextInput bind:value={richTextHtml} {sdk} />
    <Label text="Content Items" />
    {#each items as item, i (i)}
      <div class="border border-[#e0e0e0] rounded bg-[#fafafa]">
        <div class="flex items-center gap-1.5 px-2 py-2">
          <button
            class="flex items-center justify-center w-6 h-6 border border-[#ccc] rounded bg-white text-[#666] hover:bg-[#f0f0f0] hover:text-[#333] disabled:opacity-30 disabled:cursor-default cursor-pointer flex-none"
            disabled={i === 0}
            onclick={() => moveItem(i, -1)}
            aria-label="Move up"
          >
            <svg width="10" height="7" viewBox="0 0 10 7" fill="currentColor">
              <path d="M5 0L10 7H0L5 0Z" />
            </svg>
          </button>
          <button
            class="flex items-center justify-center w-6 h-6 border border-[#ccc] rounded bg-white text-[#666] hover:bg-[#f0f0f0] hover:text-[#333] disabled:opacity-30 disabled:cursor-default cursor-pointer flex-none"
            disabled={i === items.length - 1}
            onclick={() => moveItem(i, 1)}
            aria-label="Move down"
          >
            <svg width="10" height="7" viewBox="0 0 10 7" fill="currentColor">
              <path d="M5 7L0 0H10L5 7Z" />
            </svg>
          </button>

          <button
            class="flex-1 flex items-center justify-between gap-2 text-left text-xs text-[#444] cursor-pointer min-w-0"
            onclick={() => toggleItem(i)}
          >
            <span class="truncate">{item.title || '(untitled)'}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="flex-none text-[#999]"
              style="transform: rotate({expandedItems[i]
                ? 180
                : 0}deg); transition: transform 150ms"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <button
            class="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 cursor-pointer flex-none"
            onclick={() => removeItem(i)}
            aria-label="Remove"
          >
            <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
              <path
                d="M1 3.5h10M4 3.5V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1M4.5 6v5M7.5 6v5M2 3.5l.667 8a.5.5 0 0 0 .499.5h5.668a.5.5 0 0 0 .499-.5L10 3.5H2Z"
                stroke="currentColor"
                stroke-width="1.2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
              />
            </svg>
          </button>
        </div>

        <!-- Collapsible content -->
        {#if expandedItems[i]}
          <div class="flex flex-col gap-2 px-3 pb-3 border-t border-[#e0e0e0]">
            <div class="pt-2">
              <TextInput label="Title" bind:value={item.title} />
            </div>
            <div>
              <TextInput label="Anchor" placeholder="#section" bind:value={item.anchor} />
              <div class="mt-1.5">
                <AnchorPicker
                  anchors={availableAnchors}
                  bind:value={item.anchor}
                  onRefresh={loadAnchors}
                />
              </div>
            </div>
            <FilterSettings bind:value={item.filters!} />
          </div>
        {/if}
      </div>
    {/each}
    <button
      class="w-full py-2 text-xs border border-dashed border-[#bbb] rounded text-[#666] hover:bg-[#f0f0f0] cursor-pointer transition-colors"
      onclick={addItem}>+ Add item</button
    >
  </div>
</BlockShell>
