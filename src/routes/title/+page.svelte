<script lang="ts">
  import type BlockSDK from '$lib/blocksdk'
  import BlockShell from '$lib/BlockShell.svelte'
  import ColorPicker from '../../components/ColorPicker.svelte'
  import TextInput from '../../components/TextInput.svelte'
  import { buildEmailHTML } from './template'

  let title = $state('')
  let color = $state('#e9860d')
  let sdk = $state<BlockSDK | null>(null)
  let prevAnchor = ''

  function toAnchor(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  function updateBlock(): void {
    if (!sdk) return
    const anchor = toAnchor(title)
    sdk.setContent(buildEmailHTML(anchor, title, color))
    sdk.setData({ title, color })
    sdk.getCentralData((cd) => {
      const anchors = (cd.anchors ?? []).filter((a) => a.anchor !== prevAnchor)
      if (anchor) anchors.push({ anchor, title })
      sdk?.setCentralData({ ...cd, anchors })
      prevAnchor = anchor
    })
  }

  $effect(() => {
    title
    color
    updateBlock()
    sdk?.getCentralData((cb) => console.log('CD: ', JSON.stringify(cb, null, 2)))
  })

  function onReady(data: unknown): void {
    const d = data as { title?: string; color?: string } | null
    if (d?.title) {
      title = d.title
      color = d.color ?? '#e9860d'
      prevAnchor = toAnchor(d.title)
    } else {
      updateBlock()
    }
  }
</script>

<BlockShell storageKey="sfmc-dev-block-data:title" bind:sdk {onReady}>
  <TextInput label="Title" bind:value={title} />
  <ColorPicker bind:value={color} />
</BlockShell>
