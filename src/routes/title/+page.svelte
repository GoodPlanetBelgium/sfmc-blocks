<script lang="ts">
  import type BlockSDK from '$lib/blocksdk'
  import BlockShell from '$lib/BlockShell.svelte'
  import ColorPicker from '../../components/ColorPicker.svelte'
  import TextInput from '../../components/TextInput.svelte'
  import { buildEmailHTML } from './template'

  let title = $state('')
  let anchor = $derived(
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  )
  let color = $state('#e9860d')
  let sdk = $state<BlockSDK | null>(null)
  let prevAnchor = ''

  function updateBlock(): void {
    if (!sdk) return
    const currentAnchor = anchor
    const currentTitle = title
    sdk.setContent(buildEmailHTML(currentAnchor, currentTitle, color))
    sdk.setData({ title: currentTitle, color })
    sdk.getCentralData((cd) => {
      const anchors = (cd.anchors ?? []).filter((a) => a.anchor !== prevAnchor)
      if (currentAnchor) anchors.push({ anchor: currentAnchor, title: currentTitle })
      sdk?.setCentralData({ ...cd, anchors })
      prevAnchor = currentAnchor
    })
  }

  $effect(() => {
    title
    color
    updateBlock()
  })

  function onReady(data: unknown): void {
    const d = data as { title?: string; color?: string } | null
    if (d?.title) {
      title = d.title
      color = d.color ?? '#e9860d'
      prevAnchor = anchor
    } else {
      updateBlock()
    }
  }
</script>

<BlockShell storageKey="sfmc-dev-block-data:title" bind:sdk {onReady} tabs={[]}>
  <TextInput label="Title" bind:value={title} />
  <ColorPicker bind:value={color} />
</BlockShell>
