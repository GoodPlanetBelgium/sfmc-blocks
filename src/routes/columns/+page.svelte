<script lang="ts">
  import { buildEmailHTML } from './template'
  import { applyContent, restoreFilterState } from '$lib/filterAmpscript'
  import BlockShell from '$lib/BlockShell.svelte'
  import FilterSettings from '../../components/FilterSettings.svelte'
  import AssetPicker from '../../components/AssetPicker.svelte'
  import RichTextInput from '../../components/RichTextInput.svelte'
  import ButtonGroup from '../../components/ButtonGroup.svelte'
  import MultiRangeSlider from '../../components/MultiRangeSlider.svelte'
  import Label from '../../components/Label.svelte'
  import {
    boundaries,
    boundaryRange,
    createColumn,
    defaultWidths,
    normalizeWidths,
    resizeAt,
    swapColumns,
    VERTICAL_ALIGNS,
    type Column,
    type ColumnType,
    type VerticalAlign
  } from '$lib/columns'
  import type BlockSDK from '$lib/blocksdk'
  import type { SFMCAsset } from '$lib/sfmc-assets'
  import type { FilterState } from '$lib/filters'

  const MAX_COLUMNS = 5
  const COLUMN_COUNTS = [2, 3, 4, 5]

  let sdk = $state<BlockSDK | null>(null)
  let columnCount = $state(2)
  // Always MAX_COLUMNS long: hidden columns keep their content when switching back to fewer.
  let columns = $state<Column[]>(
    Array.from({ length: MAX_COLUMNS }, (_, i) => createColumn(i === 0 ? 'image' : 'text'))
  )
  let widths = $state<number[]>(defaultWidths(2))
  let valign = $state<VerticalAlign>('top')
  let filterState = $state<FilterState>({})

  let visibleColumns = $derived(columns.slice(0, columnCount))
  let dividers = $derived(boundaries(widths))

  function updateBlock(persist = true): void {
    if (!sdk) return
    const snap = $state.snapshot(filterState) as FilterState
    const cols = $state.snapshot(columns) as Column[]
    const cellWidths = $state.snapshot(widths) as number[]
    const html = buildEmailHTML(cols.slice(0, columnCount), cellWidths, valign, snap)
    applyContent(sdk, html, snap)
    if (persist)
      sdk.setData({ columnCount, columns: cols, widths: cellWidths, valign, filterState: snap })
  }

  function onReady(data: unknown): void {
    const d = data as {
      columnCount?: number
      columns?: Partial<Column>[]
      widths?: unknown
      valign?: VerticalAlign
      filterState?: FilterState
    } | null
    columnCount = COLUMN_COUNTS.includes(d?.columnCount as number) ? d!.columnCount! : 2
    columns = Array.from({ length: MAX_COLUMNS }, (_, i) => {
      const saved = d?.columns?.[i]
      const fallback = createColumn(i === 0 ? 'image' : 'text')
      if (!saved) return fallback
      return {
        type: saved.type === 'image' ? 'image' : 'text',
        imageUrl: saved.imageUrl ?? '',
        assetId: saved.assetId ?? null,
        editorHtml: saved.editorHtml ?? fallback.editorHtml
      }
    })
    widths = normalizeWidths(d?.widths, columnCount)
    valign = VERTICAL_ALIGNS.some((a) => a.value === d?.valign) ? d!.valign! : 'top'
    restoreFilterState(d?.filterState, sdk, (s) => {
      filterState = s
      updateBlock(false)
    })
  }

  function setColumnCount(count: number): void {
    columnCount = count
    widths = defaultWidths(count)
    updateBlock()
  }

  function setType(index: number, type: ColumnType): void {
    columns[index].type = type
    updateBlock()
  }

  function onSelect(index: number, url: string, asset: SFMCAsset): void {
    columns[index].imageUrl = url
    columns[index].assetId = asset.id
    updateBlock()
  }

  function onDrag(index: number, boundary: number): void {
    widths = resizeAt(widths, index, boundary)
    updateBlock()
  }

  function swap(index: number): void {
    columns = [...swapColumns(columns.slice(0, columnCount), index), ...columns.slice(columnCount)]
    updateBlock()
  }

  function barClass(index: number): string {
    return index % 2 === 0 ? 'bg-[#ddd] text-[#444]' : 'bg-[#dce8f8] text-[#0060b0]'
  }
</script>

<svelte:head>
  <title>Columns Block</title>
</svelte:head>

<BlockShell
  storageKey="sfmc-dev-block-data:columns"
  bind:sdk
  {onReady}
  onEditClose={updateBlock}
  tabs={['stylingblock']}
  blockName="Columns"
>
  <div class="flex flex-col gap-3">
    <div class="flex flex-col gap-1">
      <Label text="Columns" />
      <ButtonGroup
        options={COLUMN_COUNTS.map((n) => ({ value: n, label: `${n} columns` }))}
        value={columnCount}
        onchange={(v) => setColumnCount(Number(v))}
        ariaLabel="Number of columns"
      />
    </div>

    <div class="flex flex-col gap-1">
      <Label text="Vertical align" />
      <ButtonGroup
        options={VERTICAL_ALIGNS}
        value={valign}
        onchange={(v) => {
          valign = v as VerticalAlign
          updateBlock()
        }}
        ariaLabel="Vertical alignment of the columns"
      />
    </div>

    <div class="flex flex-col gap-2">
      <Label text="Column split" />
      <MultiRangeSlider
        values={dividers}
        bounds={(i) => boundaryRange(widths, i)}
        onchange={onDrag}
        labelFor={(i) => `Width of column ${i + 1} and ${i + 2}`}
      />

      <!-- Split bar with a swap button on each dividing line -->
      <div class="relative">
        <div class="flex rounded overflow-hidden select-none h-8 text-xs font-semibold">
          {#each visibleColumns as column, i (i)}
            <div
              class="flex flex-col items-center justify-center overflow-hidden transition-all {barClass(
                i
              )}"
              style="width: {widths[i]}%"
            >
              <span class="leading-tight capitalize">{column.type}</span>
              <span class="leading-tight text-[10px] font-normal opacity-70">{widths[i]}%</span>
            </div>
          {/each}
        </div>
        {#each dividers as boundary, i (i)}
          <button
            type="button"
            onclick={() => swap(i)}
            aria-label="Swap column {i + 1} and {i + 2}"
            class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white border border-[#ccc] shadow flex items-center justify-center cursor-pointer hover:bg-[#f0f6ff] hover:border-[#0078d4] hover:text-[#0078d4] transition-colors z-10 text-[#555]"
            style="left: {boundary}%"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="m16 3 4 4-4 4" />
              <path d="M20 7H4" />
              <path d="m8 21-4-4 4-4" />
              <path d="M4 17h16" />
            </svg>
          </button>
        {/each}
      </div>
    </div>

    {#each visibleColumns as column, i (i)}
      <div class="flex flex-col gap-2 border-t border-[#eee] pt-3">
        <div class="flex items-center justify-between gap-2">
          <Label text="Column {i + 1}" />
          <ButtonGroup
            options={[
              { value: 'image', label: 'Image' },
              { value: 'text', label: 'Text' }
            ]}
            value={column.type}
            onchange={(v) => setType(i, v as ColumnType)}
            ariaLabel="Content of column {i + 1}"
          />
        </div>

        {#if column.type === 'image'}
          <AssetPicker value={column.imageUrl} onselect={(url, asset) => onSelect(i, url, asset)} />
        {:else}
          <RichTextInput bind:value={columns[i].editorHtml} {sdk} onchange={updateBlock} />
        {/if}
      </div>
    {/each}

    <FilterSettings bind:value={filterState} onchange={updateBlock} />
  </div>
</BlockShell>
