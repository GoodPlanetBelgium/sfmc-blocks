<script lang="ts">
  import {
    fetchImages,
    fetchFolders,
    uploadImage,
    renameAsset,
    deleteAsset,
    createFolder,
    renameFolder,
    deleteFolder,
    type SFMCAsset,
    type SFMCFolder
  } from '../lib/sfmc-assets'
  import { rememberAssetName, lookupAssetName } from '$lib/assetNames'

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

  let dragActive = $state(false)
  let uploading = $state(false)
  let uploadStatus = $state<string | null>(null)
  let uploadError = $state<string | null>(null)
  let dragDepth = 0
  let pendingThumbs = $state<number[]>([])
  let previewPending = $state(false)
  let previewName = $derived(asset?.name ?? (value ? lookupAssetName(value) : null))

  // A newly picked image starts out assumed-loadable; its own load/error decides.
  $effect(() => {
    value
    previewPending = false
  })
  let fileInput = $state<HTMLInputElement | null>(null)

  type MenuTarget =
    | { kind: 'folder'; id: number; name: string }
    | { kind: 'asset'; id: number; name: string }
    | { kind: 'root' }
  let menu = $state<{ x: number; y: number; target: MenuTarget } | null>(null)

  let rootFolderId = $state<number | null>(null)
  let renamingFolderId = $state<number | null>(null)
  let renamingAssetId = $state<number | null>(null)
  let newFolderParentId = $state<number | null>(null)
  let nameDraft = $state('')
  let renamingExtension = $state('')
  let confirmDelete = $state<MenuTarget | null>(null)
  let busy = $state(false)
  let actionError = $state<string | null>(null)

  const PAGE_SIZE = 24
  const LAST_FOLDER_KEY = 'sfmc-asset-picker-last-folder'
  const ALLOWED_EXTENSIONS = ['gif', 'jpe', 'jpeg', 'jpg', 'png']
  const THUMB_RETRY_DELAYS = [2000, 4000, 6000, 8000, 10000, 15000, 20000, 30000]

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
      const roots = flat.filter((f) => f.parentId == null || f.parentId === 0)
      rootFolderId = roots.length === 1 ? roots[0].id : null
      const tree = buildTree(flat)
      folderTree = tree
      expandedIds = [...new Set([...expandedIds, ...tree.map((n) => n.id)])]
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
    dragActive = false
    dragDepth = 0
    uploadStatus = null
    uploadError = null
  }

  function select(asset: SFMCAsset) {
    rememberAssetName(asset.fileProperties.publishedURL, asset.name)
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
    uploadStatus = null
    uploadError = null
    if (id === null) {
      selectedCategoryIds = null
    } else {
      selectedCategoryIds = [id]
      localStorage.setItem(LAST_FOLDER_KEY, String(id))
      if (!expandedSet.has(id)) expandedIds = [...expandedIds, id]
    }
    page = 1
    load()
  }

  async function uploadFiles(files: File[]) {
    if (selectedCategoryId === null || files.length === 0) return

    const categoryId = selectedCategoryId
    const accepted: File[] = []
    const rejected: string[] = []
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      if (ALLOWED_EXTENSIONS.includes(ext)) accepted.push(file)
      else rejected.push(file.name)
    }

    uploadError = rejected.length > 0 ? `Skipped (unsupported type): ${rejected.join(', ')}` : null
    if (accepted.length === 0) return

    uploading = true
    let done = 0
    try {
      for (const file of accepted) {
        uploadStatus = `Uploading ${file.name} (${done + 1}/${accepted.length})…`
        const uploaded = await uploadImage(file, categoryId)
        rememberAssetName(uploaded.fileProperties.publishedURL, uploaded.name)
        done++
      }
      uploadStatus = null
      page = 1
      await load()
    } catch (e) {
      uploadStatus = null
      const msg = e instanceof Error ? e.message : 'Upload failed'
      uploadError = done > 0 ? `${done} uploaded, then failed: ${msg}` : msg
      if (done > 0) {
        page = 1
        await load()
      }
    } finally {
      uploading = false
    }
  }

  function onDragEnter(e: DragEvent) {
    if (selectedCategoryId === null || !e.dataTransfer?.types.includes('Files')) return
    dragDepth++
    dragActive = true
  }

  function onDragOver(e: DragEvent) {
    if (selectedCategoryId === null || !e.dataTransfer?.types.includes('Files')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  function onDragLeave() {
    dragDepth = Math.max(0, dragDepth - 1)
    if (dragDepth === 0) dragActive = false
  }

  function onDrop(e: DragEvent) {
    if (selectedCategoryId === null) return
    e.preventDefault()
    dragDepth = 0
    dragActive = false
    const files = Array.from(e.dataTransfer?.files ?? [])
    uploadFiles(files)
  }

  // A freshly uploaded asset's publishedURL 404s on the CDN for ~20-40s.
  // Retry the thumbnail on a backoff instead of leaving a broken image.
  function retryThumb(img: HTMLImageElement) {
    const attempt = Number(img.dataset.retry ?? 0)
    const delay = THUMB_RETRY_DELAYS[attempt]
    if (delay === undefined) return
    img.dataset.retry = String(attempt + 1)
    const src = img.src.split('?')[0]
    setTimeout(() => {
      img.src = `${src}?r=${attempt + 1}`
    }, delay)
  }

  function onThumbError(e: Event, id: number) {
    if (!pendingThumbs.includes(id)) pendingThumbs = [...pendingThumbs, id]
    retryThumb(e.currentTarget as HTMLImageElement)
  }

  function onThumbLoad(id: number) {
    if (pendingThumbs.includes(id)) pendingThumbs = pendingThumbs.filter((x) => x !== id)
  }

  function onPreviewError(e: Event) {
    previewPending = true
    retryThumb(e.currentTarget as HTMLImageElement)
  }

  function onFilePicked(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    uploadFiles(Array.from(input.files ?? []))
    input.value = ''
  }

  function openMenu(e: MouseEvent, target: MenuTarget) {
    e.preventDefault()
    e.stopPropagation()
    cancelInlineEdit()
    actionError = null
    menu = { x: e.clientX, y: e.clientY, target }
  }

  function closeMenu() {
    menu = null
  }

  function cancelInlineEdit() {
    renamingFolderId = null
    renamingAssetId = null
    newFolderParentId = null
    nameDraft = ''
    renamingExtension = ''
  }

  // The extension is not editable — renaming a .png to .pdf would only mislabel it.
  function splitExtension(name: string): { stem: string; ext: string } {
    const dot = name.lastIndexOf('.')
    return dot > 0 ? { stem: name.slice(0, dot), ext: name.slice(dot) } : { stem: name, ext: '' }
  }

  function startRename(target: MenuTarget) {
    closeMenu()
    if (target.kind === 'root') return
    if (target.kind === 'folder') {
      nameDraft = target.name
      renamingExtension = ''
      renamingFolderId = target.id
    } else {
      const { stem, ext } = splitExtension(target.name)
      nameDraft = stem
      renamingExtension = ext
      renamingAssetId = target.id
    }
  }

  function startNewFolder(parentId: number) {
    closeMenu()
    cancelInlineEdit()
    nameDraft = ''
    newFolderParentId = parentId
    if (!expandedSet.has(parentId)) expandedIds = [...expandedIds, parentId]
  }

  function findFolderName(nodes: FolderNode[], id: number): string | null {
    for (const n of nodes) {
      if (n.id === id) return n.name
      const found = findFolderName(n.children, id)
      if (found !== null) return found
    }
    return null
  }

  function renameNodeInTree(nodes: FolderNode[], id: number, name: string): FolderNode[] {
    return nodes.map((n) =>
      n.id === id ? { ...n, name } : { ...n, children: renameNodeInTree(n.children, id, name) }
    )
  }

  async function run(action: () => Promise<void>) {
    busy = true
    actionError = null
    try {
      await action()
    } catch (e) {
      actionError = e instanceof Error ? e.message : 'Action failed'
    } finally {
      busy = false
    }
  }

  // Renames apply optimistically and roll back if SFMC rejects them.
  async function commitRename() {
    const stem = nameDraft.trim()
    const ext = renamingExtension
    const folderId = renamingFolderId
    const assetId = renamingAssetId
    cancelInlineEdit()
    if (!stem) return
    actionError = null

    if (folderId !== null) {
      const previous = findFolderName(folderTree, folderId)
      if (previous === null || previous === stem) return
      folderTree = renameNodeInTree(folderTree, folderId, stem)
      try {
        await renameFolder(folderId, stem)
      } catch (e) {
        folderTree = renameNodeInTree(folderTree, folderId, previous)
        actionError = e instanceof Error ? e.message : 'Rename failed'
      }
    } else if (assetId !== null) {
      const current = items.find((i) => i.id === assetId)
      if (!current) return
      const name = `${stem}${ext}`
      if (name === current.name) return
      const previous = current.name
      const url = current.fileProperties.publishedURL

      items = items.map((i) => (i.id === assetId ? { ...i, name } : i))
      rememberAssetName(url, name)
      try {
        await renameAsset(assetId, name)
      } catch (e) {
        items = items.map((i) => (i.id === assetId ? { ...i, name: previous } : i))
        rememberAssetName(url, previous)
        actionError = e instanceof Error ? e.message : 'Rename failed'
      }
    }
  }

  async function commitNewFolder() {
    const name = nameDraft.trim()
    const parentId = newFolderParentId
    cancelInlineEdit()
    if (!name || parentId === null) return

    await run(async () => {
      const created = await createFolder(name, parentId)
      await loadFolders()
      expandedIds = [...new Set([...expandedIds, parentId])]
      selectCategory(created.id)
    })
  }

  async function confirmDeleteTarget() {
    const target = confirmDelete
    if (!target || target.kind === 'root') return

    await run(async () => {
      if (target.kind === 'asset') {
        await deleteAsset(target.id)
        confirmDelete = null
        await load()
      } else {
        await deleteFolder(target.id)
        confirmDelete = null
        await loadFolders()
        if (selectedCategoryId === target.id) selectCategory(null)
      }
    })
  }

  function onInlineKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      ;(e.currentTarget as HTMLInputElement).blur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      cancelInlineEdit()
    }
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
    {#key value}
      <img
        src={value}
        alt="Selected asset"
        onerror={onPreviewError}
        onload={() => (previewPending = false)}
        class="w-full h-full object-contain {previewPending ? 'invisible' : ''}"
      />
    {/key}
    {#if previewPending}
      <span
        class="absolute inset-0 flex items-center justify-center px-2 text-center text-[#999] text-xs break-all"
      >
        Processing {previewName ?? 'image'}…
      </span>
    {/if}
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
    onclick={(e) => {
      if (menu) closeMenu()
      if (e.target === e.currentTarget) close()
    }}
    onkeydown={(e) => {
      if (e.key !== 'Escape') return
      if (menu) closeMenu()
      else if (confirmDelete) confirmDelete = null
      else close()
    }}
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
          oncontextmenu={(e) => rootFolderId !== null && openMenu(e, { kind: 'root' })}
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
          {#snippet newFolderRow(depth: number)}
            <div class="flex items-center" style="padding-left: {8 + depth * 12}px">
              <span class="w-4 shrink-0"></span>
              <!-- svelte-ignore a11y_autofocus -->
              <input
                autofocus
                placeholder="New folder name"
                bind:value={nameDraft}
                onkeydown={onInlineKeydown}
                onblur={commitNewFolder}
                class="flex-1 min-w-0 my-0.5 mr-2 border border-[#0176d3] rounded px-1 py-0.5 text-xs outline-none"
              />
            </div>
          {/snippet}
          {#snippet treeNodes(nodes: FolderNode[], depth: number)}
            {#each nodes as node}
              <div>
                <div
                  role="treeitem"
                  aria-selected={selectedCategoryId === node.id}
                  tabindex="-1"
                  oncontextmenu={(e) =>
                    openMenu(e, { kind: 'folder', id: node.id, name: node.name })}
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
                  {#if renamingFolderId === node.id}
                    <!-- svelte-ignore a11y_autofocus -->
                    <input
                      autofocus
                      bind:value={nameDraft}
                      onkeydown={onInlineKeydown}
                      onblur={commitRename}
                      class="flex-1 min-w-0 my-0.5 mr-2 border border-[#0176d3] rounded px-1 py-0.5 text-xs outline-none"
                    />
                  {:else}
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
                  {/if}
                </div>
                {#if newFolderParentId === node.id}
                  {@render newFolderRow(depth + 1)}
                {/if}
                {#if node.children.length > 0 && expandedSet.has(node.id)}
                  {@render treeNodes(node.children, depth + 1)}
                {/if}
              </div>
            {/each}
          {/snippet}
          {#if newFolderParentId !== null && newFolderParentId === rootFolderId}
            {@render newFolderRow(0)}
          {/if}
          {@render treeNodes(folderTree, 0)}
        {/if}
      </div>

      <!-- Image grid -->
      <div
        role="region"
        aria-label="Image results"
        class="relative flex-1 overflow-y-auto p-3"
        ondragenter={onDragEnter}
        ondragover={onDragOver}
        ondragleave={onDragLeave}
        ondrop={onDrop}
      >
        {#if selectedCategoryId !== null}
          <div class="flex items-center gap-2 mb-2 text-[11px] text-[#777]">
            {#if uploading}
              <svg
                class="animate-spin shrink-0 text-[#0176d3]"
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" opacity="0.25" />
                <path d="M21 12a9 9 0 0 0-9-9" />
              </svg>
            {:else}
              <button
                type="button"
                onclick={() => fileInput?.click()}
                class="px-2 py-1 rounded border border-[#ddd] text-[#333] hover:bg-[#f5f5f5]"
              >
                Upload image
              </button>
            {/if}
            <span class="truncate">
              {#if uploadStatus}
                {uploadStatus}
              {:else if uploading}
                Finishing up…
              {:else}
                or drop files here to add them to this folder
              {/if}
            </span>
          </div>
          <input
            bind:this={fileInput}
            type="file"
            accept="image/gif,image/jpeg,image/png"
            multiple
            onchange={onFilePicked}
            class="hidden"
          />
          {#if uploadError}
            <div class="mb-2 text-[11px] text-[#d4001c]">{uploadError}</div>
          {/if}
        {/if}

        {#if actionError && !confirmDelete}
          <div class="mb-2 text-[11px] text-[#d4001c]">{actionError}</div>
        {/if}

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
              <div
                role="presentation"
                oncontextmenu={(e) =>
                  openMenu(e, { kind: 'asset', id: asset.id, name: asset.name })}
                class="group flex flex-col rounded border-2 overflow-hidden text-left transition-colors {asset
                  .fileProperties.publishedURL === value
                  ? 'border-[#0176d3]'
                  : 'border-transparent hover:border-[#ddd]'}"
              >
                <button
                  type="button"
                  onclick={() => select(asset)}
                  class="relative w-full aspect-video bg-[#f5f5f5] flex items-center justify-center overflow-hidden"
                >
                  <img
                    src={asset.fileProperties.publishedURL}
                    alt={asset.name}
                    onerror={(e) => onThumbError(e, asset.id)}
                    onload={() => onThumbLoad(asset.id)}
                    class="max-w-full max-h-full object-contain {pendingThumbs.includes(asset.id)
                      ? 'invisible'
                      : ''}"
                  />
                  {#if pendingThumbs.includes(asset.id)}
                    <span
                      class="absolute inset-0 flex items-center justify-center px-1 text-center text-[10px] text-[#999] break-all"
                    >
                      Processing {asset.name}…
                    </span>
                  {/if}
                  <span
                    class="absolute inset-x-0 bottom-0 hidden group-hover:block bg-black/75 text-white text-[10px] leading-snug px-1.5 py-1 break-words"
                  >
                    {asset.name}
                  </span>
                </button>
                {#if renamingAssetId === asset.id}
                  <div
                    class="flex items-center m-0.5 border border-[#0176d3] rounded px-1 text-[11px]"
                  >
                    <!-- svelte-ignore a11y_autofocus -->
                    <input
                      autofocus
                      bind:value={nameDraft}
                      onkeydown={onInlineKeydown}
                      onblur={commitRename}
                      class="flex-1 min-w-0 py-0.5 text-[11px] outline-none"
                    />
                    {#if renamingExtension}
                      <span class="shrink-0 text-[#999]">{renamingExtension}</span>
                    {/if}
                  </div>
                {:else}
                  <div class="px-1.5 py-1 text-[11px] text-[#555] truncate" title={asset.name}>
                    {asset.name}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        {#if dragActive}
          <div
            class="absolute inset-2 pointer-events-none flex items-center justify-center rounded border-2 border-dashed border-[#0176d3] bg-[#e8f0fb]/90 text-sm font-semibold text-[#0176d3]"
          >
            Drop to upload into this folder
          </div>
        {/if}
      </div>

      <!-- Context menu -->
      {#if menu}
        <div
          role="menu"
          tabindex="-1"
          class="fixed z-10 min-w-36 py-1 bg-white border border-[#ddd] rounded shadow-lg text-xs"
          style="left: {menu.x}px; top: {menu.y}px"
        >
          {#if menu.target.kind !== 'root'}
            <button
              type="button"
              role="menuitem"
              onclick={() => menu && startRename(menu.target)}
              class="block w-full px-3 py-1.5 text-left text-[#333] hover:bg-[#f5f5f5]"
            >
              Rename
            </button>
            <button
              type="button"
              role="menuitem"
              onclick={() => {
                confirmDelete = menu?.target ?? null
                closeMenu()
              }}
              class="block w-full px-3 py-1.5 text-left text-[#d4001c] hover:bg-[#f5f5f5]"
            >
              Delete
            </button>
          {/if}
          {#if menu.target.kind === 'folder' || menu.target.kind === 'root'}
            {#if menu.target.kind === 'folder'}
              <div class="my-1 border-t border-[#eee]"></div>
            {/if}
            <button
              type="button"
              role="menuitem"
              onclick={() => {
                const parent =
                  menu?.target.kind === 'folder' ? menu.target.id : (rootFolderId ?? null)
                if (parent !== null) startNewFolder(parent)
              }}
              class="block w-full px-3 py-1.5 text-left text-[#333] hover:bg-[#f5f5f5]"
            >
              New folder
            </button>
          {/if}
        </div>
      {/if}

      <!-- Delete confirmation -->
      {#if confirmDelete && confirmDelete.kind !== 'root'}
        <div
          class="absolute inset-0 z-20 flex items-center justify-center bg-black/40"
          role="alertdialog"
          aria-modal="true"
          aria-label="Confirm delete"
          tabindex="-1"
        >
          <div class="w-80 bg-white rounded-lg shadow-xl p-4 flex flex-col gap-3">
            <div class="text-sm text-[#333]">
              Delete {confirmDelete.kind === 'folder' ? 'folder' : 'image'}
              <span class="font-semibold break-all">{confirmDelete.name}</span>?
            </div>
            <div class="text-[11px] text-[#777]">
              {#if confirmDelete.kind === 'folder'}
                Only empty folders can be deleted. This cannot be undone.
              {:else}
                Emails already using this image will lose it. This cannot be undone.
              {/if}
            </div>
            {#if actionError}
              <div class="text-[11px] text-[#d4001c]">{actionError}</div>
            {/if}
            <div class="flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onclick={() => {
                  confirmDelete = null
                  actionError = null
                }}
                class="px-3 py-1.5 rounded border border-[#ddd] text-xs text-[#333] hover:bg-[#f5f5f5] disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onclick={confirmDeleteTarget}
                class="px-3 py-1.5 rounded bg-[#d4001c] text-white text-xs hover:bg-[#b30018] disabled:opacity-40"
              >
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      {/if}

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
