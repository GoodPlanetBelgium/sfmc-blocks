import filters from './filters'
import type { FilterState } from './filters'

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
