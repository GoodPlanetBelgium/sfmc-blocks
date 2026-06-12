<script lang="ts">
  import { tick } from 'svelte'
  import AnchorPicker from './AnchorPicker.svelte'
  import { COLORS } from '$lib/const'
  import type BlockSDK from '$lib/blocksdk'
  import type { AnchorEntry } from '$lib/blocksdk'

  interface Props {
    value?: string
    sdk?: BlockSDK | null
    onchange?: () => void
  }

  let { value = $bindable(''), sdk = null, onchange }: Props = $props()

  let editorEl = $state<HTMLDivElement | null>(null)
  let showLinkDialog = $state(false)
  let linkUrl = $state('')
  let linkDialogInput = $state<HTMLInputElement | null>(null)
  let savedRange: Range | null = null
  let activeFormat = $state('')
  let isBold = $state(false)
  let isItalic = $state(false)
  let availableAnchors = $state<AnchorEntry[]>([])

  // Sync value → DOM when parent sets it externally (e.g. onReady). Typing does not trigger
  // this because notifyChange() keeps value === editorEl.innerHTML, so the check short-circuits.
  $effect(() => {
    if (editorEl && value !== editorEl.innerHTML) {
      editorEl.innerHTML = value
    }
  })

  $effect(() => {
    if (!editorEl) return
    document.execCommand('defaultParagraphSeparator', false, 'p')
    const onSelectionChange = () => {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return
      let node: Node | null = sel.anchorNode
      activeFormat = 'p'
      while (node && node !== editorEl) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const tag = (node as Element).tagName.toLowerCase()
          if (tag === 'h1' || tag === 'h2' || tag === 'p' || tag === 'div' || tag === 'li') {
            if (tag === 'li') activeFormat = 'ul'
            else activeFormat = tag === 'div' ? 'p' : tag
            break
          }
        }
        node = node.parentNode
      }
      isBold = document.queryCommandState('bold')
      isItalic = document.queryCommandState('italic')
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  })

  function notifyChange(): void {
    value = editorEl?.innerHTML ?? ''
    onchange?.()
  }

  function handleInput(): void {
    if (editorEl?.firstChild?.nodeType === Node.TEXT_NODE) {
      document.execCommand('formatBlock', false, 'p')
    }
    notifyChange()
  }

  function handlePaste(e: ClipboardEvent): void {
    e.preventDefault()
    const text = e.clipboardData?.getData('text/plain') ?? ''
    if (!text) return

    const paragraphs = text
      .split(/\n{1,}/)
      .map((p) => p.replace(/\n/g, ' ').trim())
      .filter(Boolean)

    if (paragraphs.length <= 1) {
      document.execCommand('insertText', false, paragraphs[0] ?? text)
    } else {
      const html = paragraphs
        .map(
          (p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
        )
        .join('')
      document.execCommand('insertHTML', false, html)
    }
    notifyChange()
  }

  function applyFormat(tag: string): void {
    if (activeFormat === 'ul') {
      convertListToBlocks(tag)
    } else {
      document.execCommand('formatBlock', false, tag)
    }
    activeFormat = tag
    notifyChange()
  }

  function convertBlocksToList(): void {
    if (!editorEl) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)

    let nodes = Array.from(editorEl.childNodes).filter((child) => range.intersectsNode(child))
    if (nodes.length === 0) {
      let node: Node | null = sel.anchorNode
      while (node && node.parentNode !== editorEl) node = node.parentNode
      if (node && node !== editorEl) nodes = [node as ChildNode]
    }
    if (nodes.length === 0) return

    const ul = document.createElement('ul')
    for (const child of nodes) {
      const li = document.createElement('li')
      li.innerHTML =
        child.nodeType === Node.TEXT_NODE ? (child.textContent ?? '') : (child as Element).innerHTML
      ul.appendChild(li)
    }
    nodes[0].parentNode!.insertBefore(ul, nodes[0])
    for (const child of nodes) child.parentNode?.removeChild(child)

    const newRange = document.createRange()
    newRange.selectNodeContents(ul.lastElementChild ?? ul)
    newRange.collapse(false)
    sel.removeAllRanges()
    sel.addRange(newRange)
  }

  function convertListToBlocks(tag: string): void {
    if (!editorEl) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return

    let node: Node | null = sel.anchorNode
    let ul: Element | null = null
    while (node && node !== editorEl) {
      if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName.toLowerCase() === 'ul') {
        ul = node as Element
        break
      }
      node = node.parentNode
    }
    if (!ul) return

    const fragment = document.createDocumentFragment()
    let lastEl: Element | null = null
    for (const li of Array.from(ul.children)) {
      const newEl = document.createElement(tag)
      newEl.innerHTML = li.innerHTML
      fragment.appendChild(newEl)
      lastEl = newEl
    }
    ul.parentNode!.replaceChild(fragment, ul)

    if (lastEl) {
      const newRange = document.createRange()
      newRange.selectNodeContents(lastEl)
      newRange.collapse(false)
      sel.removeAllRanges()
      sel.addRange(newRange)
    }
  }

  function applyList(): void {
    if (activeFormat === 'ul') return
    convertBlocksToList()
    activeFormat = 'ul'
    notifyChange()
  }

  function selectFormattingNode(tags: string[]): void {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return
    let node: Node | null = sel.anchorNode
    while (node && node !== editorEl) {
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        tags.includes((node as Element).tagName.toLowerCase())
      ) {
        const range = document.createRange()
        range.selectNodeContents(node)
        sel.removeAllRanges()
        sel.addRange(range)
        return
      }
      node = node.parentNode
    }
  }

  function applyBold(): void {
    if (isBold) selectFormattingNode(['b', 'strong'])
    document.execCommand('bold')
    isBold = document.queryCommandState('bold')
    notifyChange()
  }

  function applyItalic(): void {
    if (isItalic) selectFormattingNode(['i', 'em'])
    document.execCommand('italic')
    isItalic = document.queryCommandState('italic')
    notifyChange()
  }

  function applyColor(color: string): void {
    document.execCommand('foreColor', false, color)
    notifyChange()
  }

  function stripColorFromEl(el: Element): void {
    const htmlEl = el as HTMLElement
    htmlEl.style.removeProperty('color')
    el.removeAttribute('color')
    if (el.tagName === 'SPAN' && !htmlEl.style.cssText.trim() && el.attributes.length === 0) {
      el.replaceWith(...Array.from(el.childNodes))
    }
  }

  function removeColor(): void {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount || !editorEl) return
    if (sel.isCollapsed) {
      let node: Node | null = sel.anchorNode
      while (node && node !== editorEl) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as Element
          const htmlEl = el as HTMLElement
          if (htmlEl.style?.color || el.getAttribute('color')) {
            stripColorFromEl(el)
            notifyChange()
            return
          }
        }
        node = node.parentNode
      }
      return
    }
    const range = sel.getRangeAt(0)
    for (const el of Array.from(editorEl.querySelectorAll('span, font[color]'))) {
      if (!range.intersectsNode(el)) continue
      const htmlEl = el as HTMLElement
      if (!htmlEl.style.color && !el.getAttribute('color')) continue
      stripColorFromEl(el)
    }
    notifyChange()
  }

  async function openLinkDialog(): Promise<void> {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      savedRange = sel.getRangeAt(0).cloneRange()
      const anchor = sel.anchorNode?.parentElement?.closest('a')
      linkUrl = anchor?.getAttribute('href') ?? ''
    }
    availableAnchors = []
    sdk?.getCentralData((cd) => {
      const seen = new Set<string>()
      availableAnchors = (cd.anchors ?? []).filter((a) => {
        if (seen.has(a.anchor)) return false
        seen.add(a.anchor)
        return true
      })
    })
    showLinkDialog = true
    await tick()
    linkDialogInput?.focus()
  }

  function applyLink(): void {
    if (!savedRange) {
      showLinkDialog = false
      return
    }
    editorEl?.focus()
    const sel = window.getSelection()
    if (sel) {
      sel.removeAllRanges()
      sel.addRange(savedRange)
    }
    if (linkUrl.trim()) {
      document.execCommand('createLink', false, linkUrl.trim())
    } else {
      document.execCommand('unlink')
    }
    closeLinkDialog()
    notifyChange()
  }

  function removeLink(): void {
    if (savedRange) {
      editorEl?.focus()
      const sel = window.getSelection()
      if (sel) {
        sel.removeAllRanges()
        sel.addRange(savedRange)
      }
      document.execCommand('unlink')
    }
    closeLinkDialog()
    notifyChange()
  }

  function closeLinkDialog(): void {
    showLinkDialog = false
    linkUrl = ''
    savedRange = null
    availableAnchors = []
  }

  function handleLinkKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault()
      applyLink()
    }
    if (e.key === 'Escape') closeLinkDialog()
  }

  function handleEditorClick(e: MouseEvent): void {
    const anchor = (e.target as Element).closest('a')
    if (anchor) e.preventDefault()
  }

  function btnClass(active: boolean): string {
    const base =
      'px-1 py-1 text-xs rounded border cursor-pointer font-mono transition-colors duration-100'
    return active
      ? `${base} bg-[#0078d4] text-white border-[#0078d4]`
      : `${base} border-transparent hover:bg-[#eee] hover:border-[#ddd]`
  }
</script>

<div class="flex flex-col gap-2">
  <div class="flex flex-wrap items-center gap-1 p-1.5 border border-[#ddd] rounded bg-[#f8f8f8]">
    <button
      class={btnClass(activeFormat === 'h1')}
      onmousedown={(e) => e.preventDefault()}
      onclick={() => applyFormat('h1')}>H1</button
    >
    <button
      class={btnClass(activeFormat === 'h2')}
      onmousedown={(e) => e.preventDefault()}
      onclick={() => applyFormat('h2')}>H2</button
    >
    <button
      class={btnClass(activeFormat === 'p')}
      onmousedown={(e) => e.preventDefault()}
      onclick={() => applyFormat('p')}>Body</button
    >
    <button
      class={btnClass(activeFormat === 'ul')}
      onmousedown={(e) => e.preventDefault()}
      onclick={applyList}>List</button
    >
    <span class="w-px self-stretch bg-[#ddd] mx-0.5"></span>
    <button class={btnClass(isBold)} onmousedown={(e) => e.preventDefault()} onclick={applyBold}
      ><strong>B</strong></button
    >
    <button
      class={btnClass(isItalic)}
      onmousedown={(e) => e.preventDefault()}
      onclick={applyItalic}><em>I</em></button
    >
    <button class={btnClass(false)} aria-label="Link invoegen" onclick={openLinkDialog}>
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
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      </svg>
    </button>
    <span class="w-px self-stretch bg-[#ddd] mx-0.5"></span>
    {#each COLORS as c (c.id)}
      <button
        title={c.label}
        onmousedown={(e) => e.preventDefault()}
        onclick={() => applyColor(c.value)}
        class="w-5 h-5 rounded-full border-2 border-white shadow-sm cursor-pointer hover:scale-110 transition-transform"
        style="background:{c.value}"
      ></button>
    {/each}
    <button
      title="Remove color"
      onmousedown={(e) => e.preventDefault()}
      onclick={removeColor}
      class="w-5 h-5 rounded-full border-2 border-white shadow-sm cursor-pointer hover:scale-110 transition-transform flex items-center justify-center"
      style="background:#1e1e1e"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="7"
        height="7"
        viewBox="0 0 7 7"
        fill="none"
        stroke="white"
        stroke-width="1.5"
        stroke-linecap="round"
      >
        <line x1="1" y1="1" x2="6" y2="6" />
        <line x1="6" y1="1" x2="1" y2="6" />
      </svg>
    </button>
  </div>

  <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
  <div
    bind:this={editorEl}
    contenteditable="true"
    role="textbox"
    aria-multiline="true"
    tabindex="0"
    class="rich-text-editor min-h-45 border border-[#ddd] rounded p-3 focus:outline-none focus:border-[#0078d4] text-sm"
    oninput={handleInput}
    onpaste={handlePaste}
    onclick={handleEditorClick}
  ></div>
</div>

{#if showLinkDialog}
  <div
    class="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
    role="dialog"
    aria-modal="true"
  >
    <div class="bg-white rounded-lg p-4 shadow-xl w-80">
      <p class="text-xs font-semibold uppercase text-[#555] tracking-[0.04em] mb-1">
        URL or email address
      </p>
      <input
        bind:this={linkDialogInput}
        type="text"
        bind:value={linkUrl}
        placeholder="https://... or name@example.com"
        class="w-full border border-[#ddd] rounded px-2 py-1.5 text-sm mb-2 focus:outline-none focus:border-[#0078d4]"
        onkeydown={handleLinkKeyDown}
      />
      <div class="mb-3">
        <AnchorPicker
          anchors={availableAnchors}
          bind:value={linkUrl}
          onRefresh={() => {
            availableAnchors = []
            sdk?.getCentralData((cd) => {
              const seen = new Set<string>()
              availableAnchors = (cd.anchors ?? []).filter((a) => {
                if (seen.has(a.anchor)) return false
                seen.add(a.anchor)
                return true
              })
            })
          }}
        />
      </div>
      <div class="flex items-center gap-2">
        {#if linkUrl}
          <button
            class="text-xs text-red-500 hover:text-red-700 mr-auto cursor-pointer"
            onclick={removeLink}>Remove link</button
          >
        {/if}
        <button
          class="px-3 py-1 text-xs rounded border border-[#ddd] hover:bg-[#f5f5f5] cursor-pointer ml-auto"
          onclick={closeLinkDialog}>Cancel</button
        >
        <button
          class="px-3 py-1 text-xs rounded bg-[#0078d4] text-white hover:bg-[#006bc1] cursor-pointer"
          onclick={applyLink}>Add</button
        >
      </div>
    </div>
  </div>
{/if}

<style>
  :global(.rich-text-editor h1) {
    font-family: Verdana, Geneva, sans-serif;
    font-size: 22px;
    font-weight: bold;
    line-height: 1.5;
    margin: 14px 0;
  }
  :global(.rich-text-editor h2) {
    font-family: Verdana, Geneva, sans-serif;
    font-size: 16px;
    font-weight: bold;
    line-height: 1.4;
    margin: 10px 0;
  }
  :global(.rich-text-editor p) {
    margin: 6px 0;
  }
  :global(.rich-text-editor a) {
    color: #1895d3;
    text-decoration: none;
  }
  :global(.rich-text-editor ul) {
    list-style-type: disc;
    padding-left: 20px;
    margin: 6px 0;
  }
  :global(.rich-text-editor li) {
    font-family: Verdana, Geneva, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    margin: 2px 0;
  }
</style>
