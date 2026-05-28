import { wrapWithFilters } from '$lib/filterAmpscript'
import type { FilterState } from '$lib/filters'

export function buildEmailHTML(filterState: FilterState = {}): string {
  return wrapWithFilters(
    `<hr style="display:block;height:1px;border:0;border-top:2px solid #EAEAEA;margin:1em 0;padding:0;">`,
    filterState
  )
}
