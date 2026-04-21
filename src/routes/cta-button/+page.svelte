<script lang="ts">
  import { buildEmailHTML } from './template'
  import BlockShell from '$lib/BlockShell.svelte'
  import ColorPicker from '../../components/ColorPicker.svelte'
  import type BlockSDK from '$lib/blocksdk'
  import TextInput from '../../components/TextInput.svelte'

  const SIDE_PADDING = 20
  // Outlook/Word GDI font metrics run wider than browser canvas; scale up to prevent text clipping
  const OUTLOOK_SCALE = 1.25

  let url = $state('')
  let title = $state('')
  let color = $state('#e9860d')
  let sdk = $state<BlockSDK | null>(null)

  function measureTextWidth(text: string): number {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    ctx.font = 'bold 16px Verdana, sans-serif'
    return Math.ceil(ctx.measureText(text || 'Button').width)
  }

  function updateBlock(): void {
    if (!sdk) return
    const width = measureTextWidth(title) + SIDE_PADDING * 2
    const outlookWidth = Math.ceil(width * OUTLOOK_SCALE)
    sdk.setContent(buildEmailHTML(url, title, color, width, outlookWidth))
    sdk.setData({ url, title, color })
  }

  // Track reactive state; explicit reads ensure tracking even when updateBlock returns early
  $effect(() => {
    url
    title
    color
    updateBlock()
  })

  function onReady(data: unknown): void {
    const d = data as { url?: string; title?: string; color?: string } | null
    if (d?.url) {
      url = d.url
      title = d.title ?? ''
      color = d.color ?? '#e9860d'
    } else {
      updateBlock()
    }
  }
</script>

<svelte:head>
  <title>CTA Button Block</title>
</svelte:head>

<BlockShell storageKey="sfmc-dev-block-data:cta-button" bind:sdk {onReady}>
  <TextInput label="url" placeholder="https://..." bind:value={url} />
  <TextInput label="Button tekst" bind:value={title} />
  <ColorPicker bind:value={color} />
</BlockShell>
