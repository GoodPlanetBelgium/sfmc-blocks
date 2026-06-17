<script lang="ts">
  import { fetchImages, fetchFolders, type SFMCAsset, type SFMCFolder } from '../lib/sfmc-assets'

  interface FolderNode {
    id: number
    name: string
    children: FolderNode[]
  }

  interface Props {
    value?: string
    asset?: SFMCAsset
    onselect: (url: string, asset: SFMCAsset) => void
  }

  let { value, asset, onselect }: Props = $props()

  let open = $state(false)
  let search = $state('')
  let searchInput = $state('')
  let page = $state(1)
  let items = $state<SFMCAsset[]>([])
  let totalCount = $state(0)
  let loading = $state(false)
  let error = $state<string | null>(null)

  let folderTree = $state<FolderNode[]>([])
  let foldersLoading = $state(false)
  let selectedCategoryId = $state<number | null>(null)
  let selectedCategoryIds = $state<number[] | null>(null)
  let expandedIds = $state<number[]>([])

  const PAGE_SIZE = 24
  const LAST_FOLDER_KEY = 'sfmc-asset-picker-last-folder'

  let totalPages = $derived(Math.ceil(totalCount / PAGE_SIZE))
  let expandedSet = $derived(new Set(expandedIds))

  function findPath(nodes: FolderNode[], id: number, path: number[] = []): number[] | null {
    for (const n of nodes) {
      if (n.id === id) return [...path, n.id]
      const found = findPath(n.children, id, [...path, n.id])
      if (found) return found
    }
    return null
  }

  function buildTree(folders: SFMCFolder[]): FolderNode[] {
    const sorted = [...folders].sort((a, b) => a.name.localeCompare(b.name))
    const map = new Map<number, FolderNode>(
      sorted.map((f) => [f.id, { id: f.id, name: f.name, children: [] }])
    )
    const roots: FolderNode[] = []
    for (const f of sorted) {
      const node = map.get(f.id)!
      if (f.parentId == null || f.parentId === 0 || !map.has(f.parentId)) {
        roots.push(node)
      } else {
        map.get(f.parentId)!.children.push(node)
      }
    }
    return roots.length === 1 ? roots[0].children : roots
  }

  async function load() {
    loading = true
    error = null
    try {
      const result = await fetchImages({
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        categoryIds: selectedCategoryIds ?? undefined
      })
      items = result.items
      totalCount = result.totalCount
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load images'
      if (error.includes('retry')) {
        try {
          const result = await fetchImages({
            page,
            pageSize: PAGE_SIZE,
            search: search || undefined,
            categoryIds: selectedCategoryIds ?? undefined
          })
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

  async function loadFolders(): Promise<FolderNode[]> {
    foldersLoading = true
    try {
      const flat = await fetchFolders()
      const tree = buildTree(flat)
      folderTree = tree
      expandedIds = tree.map((n) => n.id)
      return tree
    } catch {
      return []
    } finally {
      foldersLoading = false
    }
  }

  function applyPreselect(categoryId: number, tree: FolderNode[]) {
    selectedCategoryId = categoryId
    selectedCategoryIds = [categoryId]
    const path = findPath(tree, categoryId)
    if (path && path.length > 1) {
      expandedIds = [...new Set([...expandedIds, ...path.slice(0, -1)])]
    }
    page = 1
    load()
  }

  function openPicker() {
    open = true
    page = 1
    search = ''
    searchInput = ''
    const savedFolder = localStorage.getItem(LAST_FOLDER_KEY)
    const preselect = asset?.category?.id ?? (savedFolder !== null ? Number(savedFolder) : null)
    selectedCategoryId = preselect
    selectedCategoryIds = preselect !== null ? [preselect] : null
    load()
    if (folderTree.length === 0) {
      loadFolders().then((tree) => {
        if (preselect !== null) applyPreselect(preselect, tree)
      })
    } else if (preselect !== null) {
      applyPreselect(preselect, folderTree)
    }
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

  function selectCategory(id: number | null) {
    selectedCategoryId = id
    if (id === null) {
      selectedCategoryIds = null
    } else {
      selectedCategoryIds = [id]
      localStorage.setItem(LAST_FOLDER_KEY, String(id))
    }
    page = 1
    load()
  }

  function toggleExpanded(id: number) {
    if (expandedSet.has(id)) {
      expandedIds = expandedIds.filter((x) => x !== id)
    } else {
      expandedIds = [...expandedIds, id]
    }
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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle
          cx="8.5"
          cy="8.5"
          r="1.5"
        /><polyline points="21 15 16 10 5 21" />
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
    class="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-2"
    onclick={(e) => e.target === e.currentTarget && close()}
    onkeydown={(e) => e.key === 'Escape' && close()}
  >
    <div class="bg-white rounded-lg shadow-xl w-full h-full flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-[#eee] shrink-0">
        <span class="font-semibold text-sm text-[#333]">Select image</span>
        <button
          type="button"
          aria-label="Close"
          onclick={close}
          class="text-[#999] hover:text-[#333] transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <!-- Search -->
      <div class="px-3 py-2 border-b border-[#eee] shrink-0">
        <input
          type="search"
          placeholder={selectedCategoryId !== null ? 'Search in folder…' : 'Search all images…'}
          bind:value={searchInput}
          oninput={onSearchInput}
          class="w-full border border-[#ddd] rounded px-3 py-1.5 text-sm outline-none focus:border-[#aaa]"
        />
      </div>

      <!-- Folder tree -->
      <div class="max-h-72 overflow-y-auto border-b border-[#eee] shrink-0 py-1">
        <!-- All images -->
        <button
          type="button"
          onclick={() => selectCategory(null)}
          class="flex items-center gap-1.5 w-full px-3 py-1 text-xs text-left transition-colors {selectedCategoryId ===
          null
            ? 'bg-[#e8f0fb] text-[#0176d3] font-semibold'
            : 'text-[#333] hover:bg-[#f5f5f5]'}"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle
              cx="8.5"
              cy="8.5"
              r="1.5"
            /><polyline points="21 15 16 10 5 21" />
          </svg>
          All images
        </button>

        {#if foldersLoading}
          <div class="px-3 py-1.5 text-[11px] text-[#999]">Loading folders…</div>
        {:else if folderTree.length > 0}
          {#snippet treeNodes(nodes: FolderNode[], depth: number)}
            {#each nodes as node}
              <div>
                <div
                  class="flex items-center transition-colors {selectedCategoryId === node.id
                    ? 'bg-[#e8f0fb]'
                    : 'hover:bg-[#f5f5f5]'}"
                  style="padding-left: {8 + depth * 12}px"
                >
                  {#if node.children.length > 0}
                    <button
                      type="button"
                      onclick={() => toggleExpanded(node.id)}
                      class="flex items-center justify-center w-4 h-4 shrink-0 text-[#999] hover:text-[#333]"
                      aria-label={expandedSet.has(node.id) ? 'Collapse' : 'Expand'}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        style="transform: rotate({expandedSet.has(node.id)
                          ? 90
                          : 0}deg); transition: transform 0.15s"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  {:else}
                    <span class="w-4 shrink-0"></span>
                  {/if}
                  <button
                    type="button"
                    onclick={() => selectCategory(node.id)}
                    class="flex items-center gap-1 flex-1 min-w-0 py-1 pr-2 text-xs text-left {selectedCategoryId ===
                    node.id
                      ? 'text-[#0176d3] font-semibold'
                      : 'text-[#333]'}"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill={selectedCategoryId === node.id ? '#0176d3' : '#aaa'}
                      stroke="none"
                    >
                      <path
                        d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
                      />
                    </svg>
                    <span class="truncate">{node.name}</span>
                  </button>
                </div>
                {#if node.children.length > 0 && expandedSet.has(node.id)}
                  {@render treeNodes(node.children, depth + 1)}
                {/if}
              </div>
            {/each}
          {/snippet}
          {@render treeNodes(folderTree, 0)}
        {/if}
      </div>

      <!-- Image grid -->
      <div class="flex-1 overflow-y-auto p-3">
        {#if loading}
          <div class="flex items-center justify-center h-40 text-[#999] text-sm">Loading…</div>
        {:else if error}
          <div class="flex flex-col items-center justify-center h-40 gap-2 text-sm">
            <span class="text-[#d4001c]">{error}</span>
            <button type="button" onclick={load} class="text-[#555] underline">Retry</button>
          </div>
        {:else if items.length === 0}
          <div class="flex items-center justify-center h-40 text-[#999] text-sm">
            No images found
          </div>
        {:else}
          <div class="grid grid-cols-3 gap-2">
            {#each items as asset}
              <button
                type="button"
                onclick={() => select(asset)}
                class="group flex flex-col rounded border-2 overflow-hidden text-left transition-colors {asset
                  .fileProperties.publishedURL === value
                  ? 'border-[#0176d3]'
                  : 'border-transparent hover:border-[#ddd]'}"
              >
                <div
                  class="aspect-video bg-[#f5f5f5] flex items-center justify-center overflow-hidden"
                >
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
        <div
          class="flex items-center justify-between px-3 py-2 border-t border-[#eee] text-xs text-[#777] shrink-0"
        >
          <span>{totalCount} images</span>
          <div class="flex items-center gap-1">
            <button
              type="button"
              disabled={page === 1}
              onclick={() => goToPage(page - 1)}
              class="px-2 py-1 rounded border border-[#ddd] disabled:opacity-40 hover:bg-[#f5f5f5] disabled:cursor-default"
              >←</button
            >
            <span class="px-2">Page {page} of {totalPages}</span>
            <button
              type="button"
              disabled={page === totalPages}
              onclick={() => goToPage(page + 1)}
              class="px-2 py-1 rounded border border-[#ddd] disabled:opacity-40 hover:bg-[#f5f5f5] disabled:cursor-default"
              >→</button
            >
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
