<script lang="ts">
  import type BlockSDK from '$lib/blocksdk'
  import BlockShell from '$lib/BlockShell.svelte'
  import ColorPicker from '../../components/ColorPicker.svelte'
  import TextInput from '../../components/TextInput.svelte'
  import { buildEmailHTML } from './template'

  let anchor = $state('')
  let title = $state('')
  let color = $state('#e9860d')
  let sdk = $state<BlockSDK | null>(null)

  function updateBlock(): void {
    if (!sdk) return
    sdk.setContent(buildEmailHTML(anchor, title, color))
    sdk.setData({ anchor, title, color })
  }

  $effect(() => {
    anchor
    title
    color
    updateBlock()
  })

  function onReady(data: unknown): void {
    const d = data as { anchor?: string; title?: string; color?: string } | null
    if (d?.title) {
      anchor = d.anchor ?? ''
      title = d.title
      color = d.color ?? '#e9860d'
    } else {
      updateBlock()
    }
  }
</script>

<BlockShell storageKey="sfmc-dev-block-data:title" bind:sdk {onReady}>
  <TextInput label="Anchor id" placeholder="anchor-id" bind:value={anchor} />
  <TextInput label="Title" bind:value={title} />
  <ColorPicker bind:value={color} />
</BlockShell>
