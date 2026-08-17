import filters, { getFieldState } from './filters'
import type { FilterState, FilterFieldState } from './filters'
import type BlockSDK from './blocksdk'

export function normalizeFilterState(raw: FilterState): FilterState {
  const normalized: FilterState = {}
  if (raw.operators) {
    const rawOpLower = Object.fromEntries(
      Object.entries(raw.operators).map(([k, v]) => [k.toLowerCase(), v])
    )
    const ops: Record<string, 'AND' | 'OR'> = {}
    for (const filter of filters) {
      const op = rawOpLower[filter.field.toLowerCase()]
      if (op) ops[filter.field] = op
    }
    if (Object.keys(ops).length > 0) normalized.operators = ops
  }
  if (raw.groups) {
    const fieldByLower = Object.fromEntries(filters.map((f) => [f.field.toLowerCase(), f.field]))
    const groups = raw.groups
      .map((g) => fieldByLower[g.toLowerCase()])
      .filter((g): g is string => g !== undefined)
    if (groups.length > 0) normalized.groups = groups
  }
  const rawLower = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.toLowerCase(), v]))
  for (const filter of filters) {
    const val = rawLower[filter.field.toLowerCase()]
    if (val && typeof val === 'object' && 'selectedValues' in val)
      normalized[filter.field] = val as FilterFieldState
  }
  return normalized
}

export function parseFilterState(html: string): FilterState {
  const state: FilterState = {}
  let m: RegExpExecArray | null

  const nullRe = /\((?:IsNull|Empty)\(\[([^\]]+)\]\) OR IndexOf\("([^"]+)", \[[^\]]+\]\) > 0\)/g
  while ((m = nullRe.exec(html)) !== null) {
    state[m[1]] = { selectedValues: m[2].split(','), includeNull: true }
  }

  const notNullRe =
    /\(NOT (?:IsNull|Empty)\(\[([^\]]+)\]\) AND IndexOf\("([^"]+)", \[[^\]]+\]\) > 0\)/g
  while ((m = notNullRe.exec(html)) !== null) {
    state[m[1]] = { selectedValues: m[2].split(','), includeNull: false }
  }

  const standaloneNullRe = /\(Empty\(\[([^\]]+)\]\)\)/g
  while ((m = standaloneNullRe.exec(html)) !== null) {
    if (!state[m[1]]) state[m[1]] = { selectedValues: [], includeNull: true }
  }

  const ifMatch = /%%\[IF \(([\s\S]+?)\) THEN\]%%/.exec(html)
  if (ifMatch) {
    // Match after "> 0)" or "))" (end of standalone Empty) to find operator before each non-first condition
    const gapRe = /(?:> 0\)|\)\))\s+(AND|OR)\s+\((?:NOT\s+)?(?:IsNull|Empty)\(\[([^\]]+)\]\)/g
    const operators: Record<string, 'AND' | 'OR'> = {}
    while ((m = gapRe.exec(ifMatch[1])) !== null) operators[m[2]] = m[1] as 'AND' | 'OR'
    if (Object.keys(operators).length > 0) state.operators = operators
  }

  return state
}

export function stripAmpscript(html: string): string {
  return html.replace(/%%[\[=][\s\S]*?[\]=]%%/g, '')
}

export function buildSuperContent(html: string, filterState: FilterState): string {
  const stripped = stripAmpscript(html)
  const hasFilters = filters.some((f) => {
    const state = getFieldState(filterState, f.field)
    return (state?.selectedValues.length ?? 0) > 0 || (state?.includeNull ?? false)
  })
  if (!hasFilters) return stripped
  return `<div style="border-left:1px solid #d4001c;padding-left:1px;">${stripped}</div>`
}

export function wrapWithFilters(html: string, filterState: FilterState): string {
  const parts: { field: string; condition: string }[] = []
  const operatorsMap = filterState.operators ?? {}
  const groupSet = new Set(filterState.groups ?? [])

  for (const filter of filters) {
    const state = getFieldState(filterState, filter.field)
    if (!state || (state.selectedValues.length === 0 && !state.includeNull)) continue
    let condition: string
    if (state.selectedValues.length === 0) {
      condition = `(Empty([${filter.field}]))`
    } else {
      const vals = state.selectedValues.join(',')
      condition = state.includeNull
        ? `(Empty([${filter.field}]) OR IndexOf("${vals}", [${filter.field}]) > 0)`
        : `(NOT Empty([${filter.field}]) AND IndexOf("${vals}", [${filter.field}]) > 0)`
    }
    parts.push({ field: filter.field, condition })
  }

  if (parts.length === 0) return html

  // Build expression left-to-right, consuming grouped pairs as single tokens
  let combined = ''
  let i = 0
  while (i < parts.length) {
    const isLeftOfGroup = i + 1 < parts.length && groupSet.has(parts[i + 1].field)
    let token: string
    if (isLeftOfGroup) {
      const right = parts[i + 1]
      token = `(${parts[i].condition} ${operatorsMap[right.field] ?? 'AND'} ${right.condition})`
      i += 2
    } else {
      token = parts[i].condition
      i += 1
    }
    combined = combined
      ? `${combined} ${operatorsMap[parts[isLeftOfGroup ? i - 2 : i - 1].field] ?? 'AND'} ${token}`
      : token
  }

  return `%%[IF (${combined}) THEN]%%\n${html}\n%%[ENDIF]%%`
}

export function applyContent(sdk: BlockSDK, html: string, filterState: FilterState): void {
  sdk.setContent(html)
  sdk.setSuperContent(buildSuperContent(html, filterState))
}

export function restoreFilterState(
  raw: FilterState | undefined,
  sdk: BlockSDK | null,
  setter: (s: FilterState) => void
): void {
  if (raw !== undefined) {
    setter(normalizeFilterState(raw))
    return
  }
  sdk?.getContent((content) => setter(parseFilterState((content as string) ?? '')))
}
