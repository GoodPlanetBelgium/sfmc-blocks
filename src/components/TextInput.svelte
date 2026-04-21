<script lang="ts">
  interface Props {
    label: string
    placeholder?: string
    value: string
  }

  let { label, placeholder, value = $bindable() }: Props = $props()
</script>

<div>
  <label
    for="btn-url"
    class="block font-semibold mb-1 text-xs text-[#555] uppercase tracking-[0.04em]"
  >
    {label}
  </label>
  <input
    type="text"
    bind:value
    placeholder={placeholder ?? label}
    class="w-full px-2.5 py-2 border border-[#d0d0d0] rounded text-sm outline-none focus:border-[#0078d4]"
  />
</div>
