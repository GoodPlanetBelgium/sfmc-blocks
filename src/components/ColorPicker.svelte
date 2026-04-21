<script lang="ts">
  interface Props {
    value: string
  }

  let { value = $bindable() }: Props = $props()

  const COLORS = [
    { id: 'c-orange', value: '#e9860d', label: 'Oranje' },
    { id: 'c-lightgreen', value: '#afca14', label: 'Lichtgroen' },
    { id: 'c-pink', value: '#e72d52', label: 'Roze' },
    { id: 'c-green', value: '#29af8a', label: 'Groen' },
    { id: 'c-blue', value: '#1895d3', label: 'Blauw' }
  ]
</script>

<fieldset class="mb-3.5 border-0 p-0">
  <legend class="block font-semibold mb-1 text-xs text-[#555] uppercase tracking-[0.04em]">
    Kleur
  </legend>
  <div class="grid grid-cols-4 gap-2">
    {#each COLORS as c (c.id)}
      <div class="relative">
        <input
          type="radio"
          name="color"
          id={c.id}
          value={c.value}
          bind:group={value}
          class="absolute opacity-0 w-0 h-0"
        />
        <label
          for={c.id}
          class="flex flex-col items-center gap-1 px-1 py-2 border-2 rounded-md cursor-pointer text-[11px] font-normal normal-case tracking-normal text-[#444] transition-[border-color] duration-150 {c.value ===
          value
            ? 'border-[#0078d4] bg-[#f0f7ff]'
            : 'border-transparent'}"
        >
          <span class="w-8 h-8 rounded-full border border-black/12" style="background: {c.value}"
          ></span>
          {c.label}
        </label>
      </div>
    {/each}
  </div>
</fieldset>
