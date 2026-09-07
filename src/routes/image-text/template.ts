import { wrapWithFilters } from '$lib/filterAmpscript'
import { serializeRichText } from '$lib/richTextEmail'
import type { FilterState } from '$lib/filters'
import { CONTENT_WIDTH, GUTTER } from '$lib/columns'

export function buildEmailHTML(
  imageUrl: string,
  assetId: number | null,
  editorHTML: string,
  splitPct: number,
  swapped: boolean,
  filterState: FilterState = {}
): string {
  const rightPct = 100 - splitPct
  const imgColPct = swapped ? rightPct : splitPct
  // Outlook honours the width attribute, not `width:100%`, so the image must fit its
  // share of CONTENT_WIDTH minus the gutter, or it forces the 600px container wider.
  const imgWidth = Math.floor((imgColPct / 100) * CONTENT_WIDTH) - GUTTER
  const assetAttr = assetId != null ? ` data-assetid="${assetId}"` : ''
  const imgCell = imageUrl
    ? `<img${assetAttr} src="${imageUrl}" alt="" width="${imgWidth}" style="display:block;width:100%;height:auto;border:0;line-height:0;font-size:0;">`
    : `<div style="background:#f0f0f0;width:100%;aspect-ratio:1/1;min-height:120px;"></div>`

  const textCell = serializeRichText(editorHTML)
  const [leftCell, rightCell] = swapped ? [textCell, imgCell] : [imgCell, textCell]

  const innerHTML = `<table cellpadding="0" cellspacing="0" width="100%" role="presentation">
  <tr>
    <td width="${splitPct}%" valign="top" style="padding-right:${GUTTER}px;">${leftCell}</td>
    <td width="${rightPct}%" valign="top" style="padding-left:${GUTTER}px;">${rightCell}</td>
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
