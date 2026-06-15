<script lang="ts">
  import Label from './Label.svelte'

  interface Props {
    label: string
    placeholder?: string
    value: string
  }

  let { label, placeholder, value = $bindable() }: Props = $props()
</script>

<div class="flex flex-col gap-1">
  <Label text={label} />
  <input
    type="text"
    bind:value
    placeholder={placeholder ?? label}
    class="w-full px-2.5 py-2 border border-[#d0d0d0] rounded text-sm outline-none focus:border-[#0078d4]"
  />
</div>
