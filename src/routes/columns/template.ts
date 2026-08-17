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
    return `    <td width="${widths[i]}%" valign="${valign}" style="${padding}vertical-align:${valign};">${buildCell(column, widths[i])}</td>`
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

function buildCell(column: Column, widthPct: number): string {
  if (column.type === 'text') return serializeRichText(column.editorHtml)
  const width = Math.round((widthPct / 100) * CONTENT_WIDTH)
  if (!column.imageUrl)
    return `<div style="background:#f0f0f0;width:100%;aspect-ratio:1/1;min-height:120px;"></div>`
  const assetAttr = column.assetId != null ? ` data-assetid="${column.assetId}"` : ''
  return `<img${assetAttr} src="${column.imageUrl}" alt="" width="${width}" style="display:block;width:100%;height:auto;border:0;">`
}
