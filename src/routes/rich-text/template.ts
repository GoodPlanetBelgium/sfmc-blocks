import defaultTemplate from '$lib/defaultTemplate'
import { wrapWithFilters } from '$lib/filterAmpscript'
import { serializeRichText } from '$lib/richTextEmail'
import type { FilterState } from '$lib/filters'

export function buildEmailInnerHTML(editorHTML: string): string {
  return serializeRichText(editorHTML)
}

export function buildEmailHTML(editorHTML: string, filterState: FilterState = {}): string {
  const innerHTML = buildEmailInnerHTML(editorHTML)
  if (!innerHTML) return ''
  return wrapWithFilters(defaultTemplate({ innerHTML, padding: '0' }), filterState)
}
