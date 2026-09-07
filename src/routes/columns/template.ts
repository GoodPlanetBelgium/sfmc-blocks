import { wrapWithFilters } from '$lib/filterAmpscript'
import { serializeRichText } from '$lib/richTextEmail'
import type { FilterState } from '$lib/filters'
import type { Column, VerticalAlign } from '$lib/columns'
import { CONTENT_WIDTH, GUTTER } from '$lib/columns'

export function buildEmailHTML(
  columns: Column[],
  widths: number[],
  valign: VerticalAlign = 'top',
  filterState: FilterState = {}
): string {
  const cells = columns.map((column, i) => {
    const first = i === 0
    const last = i === columns.length - 1
    const padding = first
      ? `padding-right:${GUTTER}px;`
      : last
        ? `padding-left:${GUTTER}px;`
        : `padding-left:${GUTTER}px;padding-right:${GUTTER}px;`
    const gutters = first || last ? GUTTER : GUTTER * 2
    return `    <td width="${widths[i]}%" valign="${valign}" style="${padding}vertical-align:${valign};">${buildCell(column, widths[i], gutters)}</td>`
  })

  const innerHTML = `<table cellpadding="0" cellspacing="0" width="100%" role="presentation">
  <tr>
${cells.join('\n')}
  </tr>
</table>`

  const wrapped = `
<table cellpadding="0" cellspacing="0" width="100%" role="presentation"
  style="background-color:transparent;min-width:100%;" class="stylingblock-content-wrapper">
  <tr>
    <td style="padding:12px 0px;" class="stylingblock-content-wrapper camarker-inner">${innerHTML}</td>
  </tr>
</table>`

  return wrapWithFilters(wrapped, filterState)
}

function buildCell(column: Column, widthPct: number, gutters: number): string {
  if (column.type === 'text') return serializeRichText(column.editorHtml)
  // Outlook honours the width attribute, not `width:100%`, so the images plus the gutters
  // must never exceed CONTENT_WIDTH or the whole 600px container is forced wider.
  const width = Math.floor((widthPct / 100) * CONTENT_WIDTH) - gutters
  if (!column.imageUrl)
    return `<div style="background:#f0f0f0;width:100%;aspect-ratio:1/1;min-height:120px;"></div>`
  const assetAttr = column.assetId != null ? ` data-assetid="${column.assetId}"` : ''
  return `<img${assetAttr} src="${column.imageUrl}" alt="" width="${width}" style="display:block;width:100%;height:auto;border:0;">`
}
