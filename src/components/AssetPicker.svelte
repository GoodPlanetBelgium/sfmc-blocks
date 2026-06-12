<script lang="ts">
  import { fetchImages, type SFMCAsset } from '../lib/sfmc-assets'

  interface Props {
    value?: string
    onselect: (url: string, asset: SFMCAsset) => void
  }

  let { value, onselect }: Props = $props()

  let open = $state(false)
  let search = $state('')
  let searchInput = $state('')
  let page = $state(1)
  let items = $state<SFMCAsset[]>([])
  let totalCount = $state(0)
  let loading = $state(false)
  let error = $state<string | null>(null)

  const PAGE_SIZE = 24

  let totalPages = $derived(Math.ceil(totalCount / PAGE_SIZE))

  async function load() {
    loading = true
    error = null
    try {
      const result = await fetchImages({ page, pageSize: PAGE_SIZE, search: search || undefined })
      items = result.items
      totalCount = result.totalCount
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load images'
      // Retry once on token expiry
      if (error.includes('retry')) {
        try {
          const result = await fetchImages({ page, pageSize: PAGE_SIZE, search: search || undefined })
          items = result.items
          totalCount = result.totalCount
          error = null
        } catch {
          error = 'Failed to load images'
        }
      }
    } finally {
      loading = false
    }
  }

  function openPicker() {
    open = true
    page = 1
    search = ''
    searchInput = ''
    load()
  }

  function close() {
    open = false
  }

  function select(asset: SFMCAsset) {
    onselect(asset.fileProperties.publishedURL, asset)
    close()
  }

  let searchTimeout: ReturnType<typeof setTimeout>
  function onSearchInput() {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      search = searchInput
      page = 1
      load()
    }, 350)
  }

  function goToPage(p: number) {
    page = p
    load()
  }
</script>

<button
  type="button"
  onclick={openPicker}
  class="group relative w-full aspect-video border-2 border-dashed border-[#ddd] rounded overflow-hidden hover:border-[#aaa] transition-colors"
>
  {#if value}
    <img src={value} alt="Selected asset" class="w-full h-full object-contain" />
    <span
      class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold"
    >
      Change image
    </span>
  {:else}
    <span class="flex flex-col items-center justify-center h-full gap-1.5 text-[#999] text-xs">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
      </svg>
      Select image
    </span>
  {/if}
</button>

{#if open}
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Select image"
    tabindex="-1"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    onclick={(e) => e.target === e.currentTarget && close()}
    onkeydown={(e) => e.key === 'Escape' && close()}
  >
    <div class="bg-white rounded-lg shadow-xl w-[780px] max-w-[95vw] max-h-[85vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-[#eee]">
        <span class="font-semibold text-sm text-[#333]">Select image</span>
        <button type="button" aria-label="Close" onclick={close} class="text-[#999] hover:text-[#333] transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Search -->
      <div class="px-4 py-2.5 border-b border-[#eee]">
        <input
          type="search"
          placeholder="Search images…"
          bind:value={searchInput}
          oninput={onSearchInput}
          class="w-full border border-[#ddd] rounded px-3 py-1.5 text-sm outline-none focus:border-[#aaa]"
        />
      </div>

      <!-- Grid -->
      <div class="flex-1 overflow-y-auto p-4">
        {#if loading}
          <div class="flex items-center justify-center h-48 text-[#999] text-sm">Loading…</div>
        {:else if error}
          <div class="flex flex-col items-center justify-center h-48 gap-2 text-sm">
            <span class="text-[#d4001c]">{error}</span>
            <button type="button" onclick={load} class="text-[#555] underline">Retry</button>
          </div>
        {:else if items.length === 0}
          <div class="flex items-center justify-center h-48 text-[#999] text-sm">No images found</div>
        {:else}
          <div class="grid grid-cols-4 gap-3">
            {#each items as asset}
              <button
                type="button"
                onclick={() => select(asset)}
                class="group flex flex-col rounded border-2 overflow-hidden text-left transition-colors {asset.fileProperties.publishedURL === value ? 'border-[#0176d3]' : 'border-transparent hover:border-[#ddd]'}"
              >
                <div class="aspect-video bg-[#f5f5f5] flex items-center justify-center overflow-hidden">
                  <img
                    src={asset.fileProperties.publishedURL}
                    alt={asset.name}
                    class="max-w-full max-h-full object-contain"
                  />
                </div>
                <div class="px-1.5 py-1 text-[11px] text-[#555] truncate">{asset.name}</div>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Pagination -->
      {#if totalPages > 1}
        <div class="flex items-center justify-between px-4 py-2.5 border-t border-[#eee] text-xs text-[#777]">
          <span>{totalCount} images</span>
          <div class="flex items-center gap-1">
            <button
              type="button"
              disabled={page === 1}
              onclick={() => goToPage(page - 1)}
              class="px-2 py-1 rounded border border-[#ddd] disabled:opacity-40 hover:bg-[#f5f5f5] disabled:cursor-default"
            >←</button>
            <span class="px-2">Page {page} of {totalPages}</span>
            <button
              type="button"
              disabled={page === totalPages}
              onclick={() => goToPage(page + 1)}
              class="px-2 py-1 rounded border border-[#ddd] disabled:opacity-40 hover:bg-[#f5f5f5] disabled:cursor-default"
            >→</button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
