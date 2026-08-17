/** Shared model for multi-column blocks: a column is either an image or rich text. */

export type ColumnType = 'image' | 'text'

export type VerticalAlign = 'top' | 'middle' | 'bottom'

export const VERTICAL_ALIGNS: { value: VerticalAlign; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'middle', label: 'Middle' },
  { value: 'bottom', label: 'Bottom' }
]

export interface Column {
  type: ColumnType
  imageUrl: string
  assetId: number | null
  editorHtml: string
}

/** Usable width of the email body, used to size images inside a column. */
export const CONTENT_WIDTH = 570
/** Half-gutter applied as padding on the inner side of each column. */
export const GUTTER = 12
/** A column can never be squeezed below this share of the row. */
export const MIN_COLUMN_PCT = 15

export const DEFAULT_TEXT =
  '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>'

export function createColumn(type: ColumnType): Column {
  return { type, imageUrl: '', assetId: null, editorHtml: DEFAULT_TEXT }
}

/** Even split, remainder handed to the leftmost columns: 2 → [50,50], 3 → [34,33,33]. */
export function defaultWidths(count: number): number[] {
  const base = Math.floor(100 / count)
  const remainder = 100 - base * count
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0))
}

export function normalizeWidths(raw: unknown, count: number): number[] {
  if (!Array.isArray(raw) || raw.length !== count) return defaultWidths(count)
  const widths = raw.map((w) => (typeof w === 'number' ? Math.round(w) : NaN))
  const valid =
    widths.every((w) => Number.isFinite(w) && w >= MIN_COLUMN_PCT) &&
    widths.reduce((a, b) => a + b, 0) === 100
  return valid ? widths : defaultWidths(count)
}

/** Cumulative position of each divider: [w0, w0+w1, …] with the trailing 100 dropped. */
export function boundaries(widths: number[]): number[] {
  const result: number[] = []
  let sum = 0
  for (let i = 0; i < widths.length - 1; i++) {
    sum += widths[i]
    result.push(sum)
  }
  return result
}

/** How far divider `index` may travel before either neighbour hits MIN_COLUMN_PCT. */
export function boundaryRange(widths: number[], index: number): { min: number; max: number } {
  const before = widths.slice(0, index).reduce((a, b) => a + b, 0)
  const span = widths[index] + widths[index + 1]
  return { min: before + MIN_COLUMN_PCT, max: before + span - MIN_COLUMN_PCT }
}

/** Moves divider `index` to `boundary`, trading width between the two columns it separates. */
export function resizeAt(widths: number[], index: number, boundary: number): number[] {
  const { min, max } = boundaryRange(widths, index)
  const clamped = Math.min(max, Math.max(min, Math.round(boundary)))
  const before = widths.slice(0, index).reduce((a, b) => a + b, 0)
  const span = widths[index] + widths[index + 1]
  const next = [...widths]
  next[index] = clamped - before
  next[index + 1] = span - next[index]
  return next
}

/** Swaps the contents of columns `index` and `index + 1`, leaving the widths in place. */
export function swapColumns<T>(columns: T[], index: number): T[] {
  const next = [...columns]
  ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
  return next
}
