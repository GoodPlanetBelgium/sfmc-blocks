<script lang="ts">
  import { tick } from 'svelte'
  import { buildEmailHTML } from './template'
  import BlockShell from '$lib/BlockShell.svelte'
  import { COLORS } from '$lib/const'
  import type BlockSDK from '$lib/blocksdk'
  import type { AnchorEntry } from '$lib/blocksdk'

  let sdk = $state<BlockSDK | null>(null)
  let editorEl = $state<HTMLDivElement | null>(null)

  let showLinkDialog = $state(false)
  let linkUrl = $state('')
  let linkDialogInput = $state<HTMLInputElement | null>(null)
  let savedRange: Range | null = null
  let activeFormat = $state('')
  let isBold = $state(false)
  let availableAnchors = $state<AnchorEntry[]>([])

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
          if (tag === 'h1' || tag === 'h2' || tag === 'p' || tag === 'div') {
            activeFormat = tag === 'div' ? 'p' : tag
            break
          }
        }
        node = node.parentNode
      }
      isBold = document.queryCommandState('bold')
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  })

  function handleInput(): void {
    if (editorEl?.firstChild?.nodeType === Node.TEXT_NODE) {
      document.execCommand('formatBlock', false, 'p')
    }
    updateBlock()
  }

  function updateBlock(): void {
    if (!sdk || !editorEl) return
    sdk.setContent(buildEmailHTML(editorEl.innerHTML))
    sdk.setData({ html: editorEl.innerHTML })
  }

  function onReady(data: unknown): void {
    const d = data as { html?: string } | null
    if (d?.html && editorEl) editorEl.innerHTML = d.html
    updateBlock()
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
    updateBlock()
  }

  function applyFormat(tag: string): void {
    document.execCommand('formatBlock', false, tag)
    activeFormat = tag
    updateBlock()
  }

  function applyBold(): void {
    document.execCommand('bold')
    updateBlock()
  }

  function applyColor(color: string): void {
    document.execCommand('foreColor', false, color)
    updateBlock()
  }

  function removeColor(): void {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount || sel.isCollapsed || !editorEl) return
    const range = sel.getRangeAt(0)
    for (const el of Array.from(editorEl.querySelectorAll('span, font[color]'))) {
      if (!range.intersectsNode(el)) continue
      const htmlEl = el as HTMLElement
      if (!htmlEl.style.color && !el.getAttribute('color')) continue
      htmlEl.style.removeProperty('color')
      el.removeAttribute('color')
      if (el.tagName === 'SPAN' && !htmlEl.style.cssText.trim() && el.attributes.length === 0) {
        el.replaceWith(...Array.from(el.childNodes))
      }
    }
    updateBlock()
  }

  async function openLinkDialog(): Promise<void> {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      savedRange = sel.getRangeAt(0).cloneRange()
      const anchor = sel.anchorNode?.parentElement?.closest('a')
      linkUrl = anchor?.getAttribute('href') ?? ''
    }
    sdk?.getCentralData((cd) => {
      availableAnchors = cd.anchors ?? []
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
    updateBlock()
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
    updateBlock()
  }

  function closeLinkDialog(): void {
    showLinkDialog = false
    linkUrl = ''
    savedRange = null
  }

  function handleLinkKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault()
      applyLink()
    }
    if (e.key === 'Escape') closeLinkDialog()
  }

  function btnClass(active: boolean): string {
    const base =
      'px-2 py-1 text-xs rounded border cursor-pointer font-mono transition-colors duration-100'
    return active
      ? `${base} bg-[#0078d4] text-white border-[#0078d4]`
      : `${base} border-transparent hover:bg-[#eee] hover:border-[#ddd]`
  }
</script>

<svelte:head>
  <title>Rich Text Block</title>
</svelte:head>

<BlockShell storageKey="sfmc-dev-block-data:rich-text" bind:sdk {onReady}>
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
      <span class="w-px self-stretch bg-[#ddd] mx-0.5"></span>
      <button class={btnClass(isBold)} onmousedown={(e) => e.preventDefault()} onclick={applyBold}
        ><strong>B</strong></button
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
        title="Kleur verwijderen"
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

    <div
      bind:this={editorEl}
      contenteditable="true"
      role="textbox"
      aria-multiline="true"
      class="rich-text-editor min-h-45 border border-[#ddd] rounded p-3 focus:outline-none focus:border-[#0078d4] text-sm"
      oninput={handleInput}
      onpaste={handlePaste}
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
          URL of e-mailadres
        </p>
        <input
          bind:this={linkDialogInput}
          type="text"
          bind:value={linkUrl}
          placeholder="https://... of naam@voorbeeld.be"
          class="w-full border border-[#ddd] rounded px-2 py-1.5 text-sm mb-2 focus:outline-none focus:border-[#0078d4]"
          onkeydown={handleLinkKeyDown}
        />
        {#if availableAnchors.length > 0}
          <div class="mb-3">
            <p class="text-[11px] text-[#888] mb-1">Of kies een anker:</p>
            <div class="flex flex-wrap gap-1">
              {#each availableAnchors as a (a.anchor)}
                <button
                  class="px-2 py-0.5 text-xs rounded border cursor-pointer transition-colors duration-100 {linkUrl ===
                  '#' + a.anchor
                    ? 'bg-[#0078d4] text-white border-[#0078d4]'
                    : 'border-[#ddd] hover:bg-[#eee]'}"
                  onclick={() => (linkUrl = '#' + a.anchor)}>{a.title}</button
                >
              {/each}
            </div>
          </div>
        {:else}
          <div class="mb-3"></div>
        {/if}
        <div class="flex items-center gap-2">
          {#if linkUrl}
            <button
              class="text-xs text-red-500 hover:text-red-700 mr-auto cursor-pointer"
              onclick={removeLink}>Verwijder link</button
            >
          {/if}
          <button
            class="px-3 py-1 text-xs rounded border border-[#ddd] hover:bg-[#f5f5f5] cursor-pointer ml-auto"
            onclick={closeLinkDialog}>Annuleer</button
          >
          <button
            class="px-3 py-1 text-xs rounded bg-[#0078d4] text-white hover:bg-[#006bc1] cursor-pointer"
            onclick={applyLink}>Toevoegen</button
          >
        </div>
      </div>
    </div>
  {/if}
</BlockShell>

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
</style>
