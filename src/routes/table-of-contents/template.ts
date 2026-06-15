import defaultTemplate from '$lib/defaultTemplate'
import filterDefs, { getFieldState } from '$lib/filters'
import { buildEmailInnerHTML } from '../rich-text/template'
import type { FilterState, FilterFieldState, Filter } from '$lib/filters'

export type ContentTableItem = {
  title: string
  anchor: string
  filters?: FilterState
}

function buildFieldCondition(filter: Filter, fieldState: FilterFieldState): string {
  const attr = `AttributeValue("${filter.field}")`
  const parts: string[] = []
  if (fieldState.includeNull) parts.push(`Empty(${attr})`)
  for (const val of fieldState.selectedValues) parts.push(`${attr} == "${val}"`)
  return `(${parts.join(' OR ')})`
}

function buildFilterCondition(filterState: FilterState): string | null {
  const active = filterDefs.filter(
    (f) => (getFieldState(filterState, f.field)?.selectedValues.length ?? 0) > 0
  )
  if (active.length === 0) return null

  const operators = filterState.operators ?? {}
  const groupSet = new Set(filterState.groups ?? [])
  let expr = ''

  for (let i = 0; i < active.length; i++) {
    const filter = active[i]
    const cond = buildFieldCondition(filter, getFieldState(filterState, filter.field)!)

    if (i === 0) {
      if (active.length >= 3 && groupSet.has(active[1].field)) expr += '('
      expr += cond
    } else {
      const op = operators[filter.field] ?? 'AND'
      expr += ` ${op} `
      if (active.length >= 3 && i + 1 < active.length && groupSet.has(active[i + 1].field))
        expr += '('
      expr += cond
      if (active.length >= 3 && groupSet.has(filter.field)) expr += ')'
    }
  }

  return expr
}

function hasActiveItemFilters(filterState: FilterState | undefined): boolean {
  if (!filterState) return false
  return filterDefs.some(
    (f) => (getFieldState(filterState, f.field)?.selectedValues.length ?? 0) > 0
  )
}

export function buildSuperHTML(items: ContentTableItem[], richTextHtml = ''): string {
  const filtered = items.filter((item) => item.title || item.anchor)
  const introHTML = buildEmailInnerHTML(richTextHtml)
  if (!filtered.length) return introHTML ? defaultTemplate({ innerHTML: introHTML }) : ''
  const listItems = filtered
    .map(({ title, anchor, filters: itemFilters }) => {
      const liStyle = hasActiveItemFilters(itemFilters)
        ? ' style="border-left:1px solid #d4001c;padding-left:4px;"'
        : ''
      return `<li${liStyle}><a alias="${title}" conversion="false" data-linkto="anchortotext" href="${anchor}" style="color:#1895D3;text-decoration:none;font-family:Verdana,Geneva,sans-serif;font-size:14px;font-style:normal;line-height:1.4" title="${title}">${title}</a></li>`
    })
    .join('\n')
  const listHTML = `<ul >\n${listItems}\n</ul>`
  const innerHTML = introHTML ? `${introHTML}\n${listHTML}` : listHTML
  return defaultTemplate({ innerHTML })
}

export function buildEmailHTML(items: ContentTableItem[], richTextHtml = ''): string {
  const filtered = items.filter((item) => item.title || item.anchor)
  const introHTML = buildEmailInnerHTML(richTextHtml)
  if (!filtered.length) return introHTML ? defaultTemplate({ innerHTML: introHTML }) : ''
  const listItems = filtered
    .map(({ title, anchor, filters: itemFilters }) => {
      const li = `<li><a alias="${title}" conversion="false" data-linkto="anchortotext" href="${anchor}" style="color:#1895D3;text-decoration:none;font-family:Verdana,Geneva,sans-serif;font-size:14px;font-style:normal;line-height:1.4" title="${title}">${title}</a></li>`
      if (!itemFilters) return li
      const condition = buildFilterCondition(itemFilters)
      if (!condition) return li
      return `%%[ IF ${condition} THEN ]%%\n${li}\n%%[ ENDIF ]%%`
    })
    .join('\n')
  const listHTML = `<ul >\n${listItems}\n</ul>`
  const innerHTML = introHTML ? `${introHTML}\n${listHTML}` : listHTML
  return defaultTemplate({ innerHTML })
}
