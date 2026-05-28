import filters from '$lib/filters'
import type { FilterState } from '$lib/filters'

function buildCondition(filterState: FilterState): string | null {
  const conditions: string[] = []
  for (const filter of filters) {
    const state = filterState[filter.field]
    if (!state || state.selectedValues.length === 0) continue
    const vals = state.selectedValues.join(',')
    if (state.includeNull) {
      conditions.push(`(IsNull([${filter.field}]) OR IndexOf("${vals}", [${filter.field}]) > 0)`)
    } else {
      conditions.push(
        `(NOT IsNull([${filter.field}]) AND IndexOf("${vals}", [${filter.field}]) > 0)`
      )
    }
  }
  return conditions.length > 0 ? conditions.join(' AND ') : null
}

export function buildEmailHTML(filterState: FilterState = {}): string {
  const condition = buildCondition(filterState)
  return condition ? `%%[IF (${condition}) THEN]%%` : ''
}

export function buildSuperContent(filterState: FilterState = {}): string {
  const parts: string[] = []
  for (const filter of filters) {
    const state = filterState[filter.field]
    if (!state || state.selectedValues.length === 0) continue
    parts.push(`${filter.label.toUpperCase()}: ${state.selectedValues.join(',')}`)
  }
  const label = parts.length > 0 ? parts.join(' | ') : 'No filter set'
  return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-family:sans-serif;font-size:11px;color:#d4001c;"><div style="flex:1;height:1px;background:#d4001c;"></div><span style="white-space:nowrap;">${label}</span><div style="flex:1;height:1px;background:#d4001c;"></div></div>`
}
