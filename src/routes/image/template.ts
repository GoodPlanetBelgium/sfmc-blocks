import { wrapWithFilters } from '$lib/filterAmpscript'
import type { FilterState } from '$lib/filters'

export function buildEmailHTML(
  src: string,
  assetId: number | null,
  filterState: FilterState = {}
): string {
  if (!src) return ''
  const assetAttr = assetId != null ? ` data-assetid="${assetId}"` : ''
  const img = `<img${assetAttr} src="${src}" alt="" width="600" style="display: block; padding: 0px; text-align: center; height: auto; width: 100%; border: 0px transparent;">`
  const table = `<table width="100%" cellspacing="0" cellpadding="0" role="presentation"><tr><td align="center">${img}</td></tr></table>`
  return wrapWithFilters(table, filterState)
}
