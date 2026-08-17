<script lang="ts">
  interface Props {
    options: { value: string | number; label: string }[]
    value: string | number
    onchange: (value: string | number) => void
    ariaLabel?: string
  }

  let { options, value, onchange, ariaLabel }: Props = $props()
</script>

<div class="flex" role="group" aria-label={ariaLabel}>
  {#each options as option, i (option.value)}
    <button
      type="button"
      aria-pressed={option.value === value}
      onclick={() => onchange(option.value)}
      class="px-3 py-1.5 text-xs border cursor-pointer transition-colors duration-100 {i === 0
        ? 'rounded-l'
        : '-ml-px'} {i === options.length - 1 ? 'rounded-r' : ''} {option.value === value
        ? 'bg-[#0078d4] text-white border-[#0078d4] z-10'
        : 'bg-white text-[#555] border-[#ddd] hover:bg-[#f0f6ff] hover:border-[#0078d4]'}"
    >
      {option.label}
    </button>
  {/each}
</div>
