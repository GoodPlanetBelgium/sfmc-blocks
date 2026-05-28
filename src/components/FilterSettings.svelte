<script lang="ts">
  import filters from '../lib/filters'
  import type { FilterState } from '../lib/filters'

  let { value = $bindable(), onchange }: { value: FilterState; onchange?: () => void } = $props()

  let open = $state(false)

  function toggleValue(field: string, val: string) {
    const current = value[field] ?? { selectedValues: [], includeNull: false }
    const idx = current.selectedValues.indexOf(val)
    const selectedValues =
      idx >= 0 ? current.selectedValues.filter((v) => v !== val) : [...current.selectedValues, val]
    value = { ...value, [field]: { ...current, selectedValues } }
    onchange?.()
  }

  function toggleNull(field: string) {
    const current = value[field] ?? { selectedValues: [], includeNull: false }
    value = { ...value, [field]: { ...current, includeNull: !current.includeNull } }
    onchange?.()
  }

  function isSelected(field: string, val: string): boolean {
    return value[field]?.selectedValues.includes(val) ?? false
  }

  function includesNull(field: string): boolean {
    return value[field]?.includeNull ?? false
  }

  let hasActiveFilters = $derived(
    filters.some((f) => (value[f.field]?.selectedValues.length ?? 0) > 0)
  )
</script>

<div class="border border-[#ddd] rounded text-xs">
  <button
    type="button"
    class="w-full flex items-center justify-between px-3 py-2 hover:bg-[#f5f5f5] cursor-pointer rounded"
    onclick={() => (open = !open)}
  >
    <span class="font-semibold uppercase tracking-[0.04em] text-[#555]">Visibility filters</span>
    <span class="flex items-center gap-1.5">
      {#if hasActiveFilters}
        <span class="w-2 h-2 rounded-full bg-[#d4001c]"></span>
      {/if}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        style="transform: rotate({open ? 180 : 0}deg); transition: transform 150ms"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </span>
  </button>

  {#if open}
    <div class="border-t border-[#ddd] px-3 pb-3 pt-2 flex flex-col gap-3">
      {#each filters as filter}
        <div>
          <p class="font-semibold text-[#555] uppercase tracking-[0.04em] mb-1.5">{filter.label}</p>
          <div class="flex flex-col gap-1">
            {#each filter.options as option}
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected(filter.field, option.value)}
                  onchange={() => toggleValue(filter.field, option.value)}
                  class="cursor-pointer"
                />
                {option.label}
              </label>
            {/each}
            <label
              class="flex items-center gap-2 cursor-pointer text-[#888] mt-1 pt-1 border-t border-[#eee]"
            >
              <input
                type="checkbox"
                checked={includesNull(filter.field)}
                onchange={() => toggleNull(filter.field)}
                class="cursor-pointer"
              />
              Also show when unavailable
            </label>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
