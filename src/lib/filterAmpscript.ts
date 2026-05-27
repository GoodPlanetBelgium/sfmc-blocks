import filters from './filters'
import type { FilterState } from './filters'

export function stripAmpscript(html: string): string {
  return html.replace(/%%[\[=][\s\S]*?[\]=]%%/g, '')
}

export function computeFilterLabel(filterState: FilterState): string {
  const activeFilters = filters.filter((f) => (filterState[f.field]?.selectedValues.length ?? 0) > 0)
  if (activeFilters.length === 0) return ''
  return activeFilters
    .map((f) => {
      const selected = filterState[f.field].selectedValues
      const optLabels = selected.map((v) => f.options.find((o) => o.value === v)?.label ?? v)
      return `${f.label.toUpperCase()}: ${optLabels.join(', ')}`
    })
    .join(' | ')
}

// Used by SFMC's setSuperContent — self-contained HTML with CSS hover dot indicator
export function buildSuperContent(html: string, filterState: FilterState): string {
  const stripped = stripAmpscript(html)
  const label = computeFilterLabel(filterState)
  if (!label) return stripped
  const css =
    '.fb{position:absolute;top:6px;right:6px;display:flex;align-items:center;gap:0;background:#fff;' +
    'border:1px solid rgba(0,120,212,.3);border-radius:20px;padding:2px;overflow:hidden;max-width:12px;' +
    'transition:max-width .25s ease,padding .25s ease,gap .25s ease;cursor:default}' +
    '.fb:hover{max-width:400px;padding:2px 8px 2px 4px;gap:5px}' +
    '.fb .fd{width:8px;height:8px;min-width:8px;border-radius:50%;background:#0078d4;flex-shrink:0}' +
    '.fb .fl{font-size:10px;font-family:sans-serif;color:#0078d4;white-space:nowrap;opacity:0;transition:opacity .15s ease .1s}' +
    '.fb:hover .fl{opacity:1}'
  return (
    `<div style="position:relative;border-left:3px solid rgba(0,120,212,0.4);padding-left:1px;">` +
    `<style>${css}</style>` +
    stripped +
    `<div class="fb"><div class="fd"></div><span class="fl">${label}</span></div>` +
    `</div>`
  )
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
