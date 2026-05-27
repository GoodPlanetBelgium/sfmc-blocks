import filters from './filters'
import type { FilterState } from './filters'

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
