<script lang="ts">
  import type { Snippet } from 'svelte'
  import { onMount } from 'svelte'
  import { page } from '$app/state'
  import BlockSDK from '$lib/blocksdk'

  interface Props {
    storageKey: string
    sdk?: BlockSDK | null
    onReady: (data: unknown) => void
    children: Snippet
  }

  let { storageKey, sdk = $bindable<BlockSDK | null>(null), onReady, children }: Props = $props()

  let notInIframe = $state(false)
  let editorFrame = $state<HTMLIFrameElement | null>(null)
  let emailHTML = $state('')
  let libsReady = $state(false)

  type HL = {
    codeToHtml: (code: string, opts: { lang: string; theme: string }) => string
  }
  type BF = (html: string, opts?: object) => string
  let _highlighter: HL | null = null
  let _beautify: BF | null = null

  async function initDevLibs() {
    const [{ createHighlighter }, { html_beautify }] = await Promise.all([
      import('shiki'),
      import('js-beautify')
    ])
    _highlighter = await createHighlighter({
      themes: ['dark-plus'],
      langs: ['html']
    })
    _beautify = html_beautify
    libsReady = true
  }

  let highlightedHTML = $derived.by(() => {
    if (!emailHTML) return ''
    if (!libsReady || !_highlighter || !_beautify) {
      const escaped = emailHTML.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      return `<pre class="shiki">${escaped}</pre>`
    }
    const pretty = _beautify(emailHTML, {
      indent_size: 2,
      wrap_line_length: 0,
      preserve_newlines: false,
      end_with_newline: false
    })
    return _highlighter.codeToHtml(pretty, {
      lang: 'html',
      theme: 'dark-plus'
    })
  })

  function handleDevMessage(event: MessageEvent) {
    const win = editorFrame?.contentWindow
    if (!win || event.source !== win) return

    const msg = event.data as {
      method?: string
      id?: number
      payload?: unknown
    }
    const reply = (payload?: unknown) => win.postMessage({ id: msg.id, payload }, event.origin)

    if (msg.method === 'handShake') {
      win.postMessage({ method: 'handShake', origin: window.location.origin }, event.origin)
      return
    }
    if (msg.method === 'getData') {
      const saved = localStorage.getItem(storageKey)
      reply(saved ? JSON.parse(saved) : null)
      return
    }
    if (msg.method === 'setData') {
      localStorage.setItem(storageKey, JSON.stringify(msg.payload))
      reply()
      return
    }
    if (msg.method === 'getCentralData') {
      const saved = localStorage.getItem('sfmc-dev-central-data')
      reply(saved ? JSON.parse(saved) : null)
      return
    }
    if (msg.method === 'setCentralData') {
      localStorage.setItem('sfmc-dev-central-data', JSON.stringify(msg.payload))
      reply()
      return
    }
    if (msg.method === 'setContent') {
      emailHTML = msg.payload as string
      reply()
      return
    }
    reply()
  }

  async function copyHTML() {
    await navigator.clipboard.writeText(emailHTML)
  }

  onMount(() => {
    if (window.self === window.top) {
      notInIframe = true
      if (import.meta.env.DEV) {
        window.addEventListener('message', handleDevMessage)
        initDevLibs()
        return () => window.removeEventListener('message', handleDevMessage)
      }
      return
    }

    sdk = new BlockSDK(
      [
        'exacttarget.com',
        'marketingcloudapps.com',
        'blocktester.herokuapp.com',
        ...(import.meta.env.DEV ? ['localhost'] : [])
      ],
      import.meta.env.DEV as unknown as boolean
    )

    sdk.getData((data: unknown) => {
      onReady(data)
    })
  })
</script>

{#if notInIframe}
  {#if import.meta.env.DEV}
    <div class="flex flex-col h-screen text-[13px] text-[#ccc] font-sans">
      <div class="flex flex-1 min-h-0">
        <div class="flex flex-col flex-1 min-w-0 border-r border-[#333] last:border-r-0">
          <div
            class="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888] border-b border-[#333] bg-[#131313]"
          >
            Block editor
          </div>
          <iframe
            bind:this={editorFrame}
            src={page.url.pathname}
            title="Block editor"
            class="flex-1 w-full border-0 bg-white"
          ></iframe>
        </div>
        <div class="flex flex-col flex-1 min-w-0 border-r border-[#333] last:border-r-0">
          <div
            class="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888] border-b border-[#333] bg-[#131313]"
          >
            Email HTML
          </div>
          <div class="overflow-auto code-output">
            {#if highlightedHTML}
              {@html highlightedHTML}
            {:else}
              <pre class="shiki">—</pre>
            {/if}
          </div>
          <div
            class="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888] border-b border-[#333] bg-[#131313]"
          >
            Browser preview
          </div>
          <iframe
            srcdoc={emailHTML}
            title="Email HTML preview"
            sandbox="allow-same-origin"
            class="flex-1 w-150 border-0 bg-white"
          ></iframe>
        </div>
      </div>
    </div>
  {:else}
    <p class="p-4 font-sans">
      This block is for use in Salesforce Marketing Cloud Content Builder only.
    </p>
  {/if}
{:else}
  <div class="font-sans text-sm text-[#333] bg-white p-4 flex flex-col gap-6">
    {@render children()}
  </div>
{/if}
