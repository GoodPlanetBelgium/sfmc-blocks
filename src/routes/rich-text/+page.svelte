<script lang="ts">
  import { buildEmailHTML } from './template'
  import { applyContent, restoreFilterState } from '$lib/filterAmpscript'
  import BlockShell from '$lib/BlockShell.svelte'
  import FilterSettings from '../../components/FilterSettings.svelte'
  import RichTextInput from '../../components/RichTextInput.svelte'
  import type BlockSDK from '$lib/blocksdk'
  import type { FilterState } from '$lib/filters'

  let sdk = $state<BlockSDK | null>(null)
  let editorHtml = $state('')
  let filterState = $state<FilterState>({})

  function updateBlock(persist = true): void {
    if (!sdk) return
    const snap = $state.snapshot(filterState) as FilterState
    const html = buildEmailHTML(editorHtml, snap)
    applyContent(sdk, html, snap)
    if (persist) sdk.setData({ html: editorHtml, filterState: snap })
  }

  const DEFAULT_HTML =
    '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>'

  function onReady(data: unknown): void {
    const d = data as { html?: string; filterState?: FilterState } | null
    editorHtml = d?.html ?? DEFAULT_HTML
    restoreFilterState(d?.filterState, sdk, (s) => {
      filterState = s
      updateBlock(false)
    })
  }
</script>

<svelte:head>
  <title>Rich Text Block</title>
</svelte:head>

<BlockShell
  storageKey="sfmc-dev-block-data:rich-text"
  bind:sdk
  {onReady}
  onEditClose={updateBlock}
  tabs={['stylingblock']}
  blockName="Text content"
>
  <div class="flex flex-col gap-2">
    <RichTextInput bind:value={editorHtml} {sdk} onchange={updateBlock} />
    <FilterSettings bind:value={filterState} onchange={updateBlock} />
  </div>
</BlockShell>
