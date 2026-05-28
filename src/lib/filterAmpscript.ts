import filters from './filters'
import type { FilterState } from './filters'

export function normalizeFilterState(raw: FilterState): FilterState {
  const normalized: FilterState = {}
  const rawLower = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.toLowerCase(), v]))
  for (const filter of filters) {
    const val = rawLower[filter.field.toLowerCase()]
    if (val) normalized[filter.field] = val
  }
  return normalized
}

export function parseFilterState(html: string): FilterState {
  const state: FilterState = {}
  let m: RegExpExecArray | null

  // includeNull: true → (IsNull([FIELD]) OR IndexOf("VALS", [FIELD]) > 0)
  const nullRe = /\(IsNull\(\[([^\]]+)\]\) OR IndexOf\("([^"]+)", \[[^\]]+\]\) > 0\)/g
  while ((m = nullRe.exec(html)) !== null) {
    state[m[1]] = { selectedValues: m[2].split(','), includeNull: true }
  }

  // includeNull: false → (NOT IsNull([FIELD]) AND IndexOf("VALS", [FIELD]) > 0)
  const notNullRe = /\(NOT IsNull\(\[([^\]]+)\]\) AND IndexOf\("([^"]+)", \[[^\]]+\]\) > 0\)/g
  while ((m = notNullRe.exec(html)) !== null) {
    state[m[1]] = { selectedValues: m[2].split(','), includeNull: false }
  }

  return state
}

export function stripAmpscript(html: string): string {
  return html.replace(/%%[\[=][\s\S]*?[\]=]%%/g, '')
}

export function buildSuperContent(html: string, filterState: FilterState): string {
  const stripped = stripAmpscript(html)
  const hasFilters = filters.some((f) => (filterState[f.field]?.selectedValues.length ?? 0) > 0)
  if (!hasFilters) return stripped
  return `<div style="border-left:1px solid #d4001c;padding-left:1px;">${stripped}</div>`
}

export function wrapWithFilters(html: string, filterState: FilterState): string {
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

  if (conditions.length === 0) return html

  const condition = conditions.join(' AND ')
  return `%%[IF (${condition}) THEN]%%\n${html}\n%%[ENDIF]%%`
}
