<script lang="ts">
  import filters, { getFieldState } from '../lib/filters'
  import type { FilterState } from '../lib/filters'

  let { value = $bindable(), onchange }: { value: FilterState; onchange?: () => void } = $props()

  let open = $state(filters.some((f) => (getFieldState(value, f.field)?.selectedValues.length ?? 0) > 0))

  function toggleValue(field: string, val: string) {
    const current = getFieldState(value, field) ?? { selectedValues: [], includeNull: false }
    const idx = current.selectedValues.indexOf(val)
    const selectedValues =
      idx >= 0 ? current.selectedValues.filter((v) => v !== val) : [...current.selectedValues, val]
    value = { ...value, [field]: { ...current, selectedValues } }
    onchange?.()
  }

  function toggleNull(field: string) {
    const current = getFieldState(value, field) ?? { selectedValues: [], includeNull: false }
    value = { ...value, [field]: { ...current, includeNull: !current.includeNull } }
    onchange?.()
  }

  function toggleOperator(field: string) {
    const current = (value.operators ?? {})[field] ?? 'AND'
    value = {
      ...value,
      operators: { ...(value.operators ?? {}), [field]: current === 'AND' ? 'OR' : 'AND' }
    }
    onchange?.()
  }

  function toggleGroup(field: string) {
    const groups = new Set(value.groups ?? [])
    if (groups.has(field)) {
      groups.delete(field)
    } else {
      // Remove any adjacent (overlapping) groups before adding this one
      const i = activeFilters.findIndex((f) => f.field === field)
      if (i >= 2) groups.delete(activeFilters[i - 1].field)
      if (i < activeFilters.length - 1) groups.delete(activeFilters[i + 1].field)
      groups.add(field)
    }
    value = { ...value, groups: [...groups] }
    onchange?.()
  }

  let groupSet = $derived(new Set(value.groups ?? []))

  function isSelected(field: string, val: string): boolean {
    return getFieldState(value, field)?.selectedValues.includes(val) ?? false
  }

  function includesNull(field: string): boolean {
    return getFieldState(value, field)?.includeNull ?? false
  }

  let activeFilters = $derived(
    filters.filter((f) => (getFieldState(value, f.field)?.selectedValues.length ?? 0) > 0)
  )

  let hasActiveFilters = $derived(activeFilters.length > 0)
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

  {#if activeFilters.length >= 2}
    <div class="border-t border-[#ddd] px-3 py-2 flex items-center gap-1 text-[#555] flex-wrap">
      {#each activeFilters as filter, i}
        {#if i === 0}
          {#if activeFilters.length >= 3 && groupSet.has(activeFilters[1].field)}
            <span class="font-bold font-mono text-[11px]">(</span>
          {/if}
          <span>{filter.label}</span>
        {:else}
          <button
            type="button"
            class="px-1.5 py-0.5 rounded border border-[#bbb] text-[10px] font-bold tracking-wide hover:bg-[#f0f0f0] cursor-pointer"
            onclick={() => toggleOperator(filter.field)}
            >{(value.operators ?? {})[filter.field] ?? 'AND'}</button
          >
          {#if activeFilters.length >= 3}
            <button
              type="button"
              class="px-1 py-0.5 rounded border text-[10px] cursor-pointer {groupSet.has(
                filter.field
              )
                ? 'border-[#999] bg-[#e8e8e8] text-[#333]'
                : 'border-[#ddd] text-[#bbb] hover:text-[#888] hover:border-[#bbb]'}"
              onclick={() => toggleGroup(filter.field)}>(...)</button
            >
          {/if}
          {#if activeFilters.length >= 3 && i + 1 < activeFilters.length && groupSet.has(activeFilters[i + 1].field)}
            <span class="font-bold font-mono text-[11px]">(</span>
          {/if}
          <span>{filter.label}</span>
          {#if activeFilters.length >= 3 && groupSet.has(filter.field)}
            <span class="font-bold font-mono text-[11px]">)</span>
          {/if}
        {/if}
      {/each}
    </div>
  {/if}

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
              Also show when {filter.label.toLowerCase()} is unavailable
            </label>
          </div>
        </div>
      {/each}
      {#if hasActiveFilters}
        <div class="border-t border-[#eee] pt-2">
          <button
            type="button"
            class="px-1.5 py-0.5 rounded border border-[#bbb] text-[#d4001c] cursor-pointer"
            onclick={() => {
              value = {}
              onchange?.()
            }}>Remove all filters</button
          >
        </div>
      {/if}
    </div>
  {/if}
</div>
