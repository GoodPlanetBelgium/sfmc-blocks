<script lang="ts">
  import TextInput from './TextInput.svelte'

  interface Props {
    value: string
    onchange?: () => void
  }

  let { value = $bindable(), onchange }: Props = $props()
</script>

<TextInput label="Caption" placeholder="Optional" bind:value {onchange} />
