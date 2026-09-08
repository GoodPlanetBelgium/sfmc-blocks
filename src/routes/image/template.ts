import { wrapWithFilters } from '$lib/filterAmpscript'
import type { FilterState } from '$lib/filters'

export function buildEmailHTML(
  src: string,
  assetId: number | null,
  imageWidth: number = 100,
  imageAlignment: 'left' | 'center' | 'right' = 'center',
  filterState: FilterState = {}
): string {
  if (!src) return ''
  const assetAttr = assetId != null ? ` data-assetid="${assetId}"` : ''

  // Calculate pixel width at 600px container
  const pixelWidth = Math.round((imageWidth / 100) * 600)

  let img: string
  let table: string

  if (imageWidth === 100) {
    // Full width - simple structure for Outlook classic
    img = `<img${assetAttr} src="${src}" alt="" width="600" style="display: block; padding: 0px; text-align: center; height: auto; width: 100%; border: 0px transparent;">`
    table = `<table width="100%" cellspacing="0" cellpadding="0" role="presentation"><tr><td align="center" style="line-height: 0; font-size: 0; mso-line-height-rule: exactly;">${img}</td></tr></table>`
  } else {
    // Constrained width with alignment - use nested table for Outlook compatibility
    img = `<img${assetAttr} src="${src}" alt="" width="${pixelWidth}" style="display: block; padding: 0px; height: auto; border: 0px transparent;">`
    const innerTable = `<table width="${pixelWidth}" cellspacing="0" cellpadding="0" role="presentation"><tr><td style="line-height: 0; font-size: 0; mso-line-height-rule: exactly;">${img}</td></tr></table>`
    table = `<table width="100%" cellspacing="0" cellpadding="0" role="presentation"><tr><td align="${imageAlignment}" style="line-height: 0; font-size: 0; mso-line-height-rule: exactly;">${innerTable}</td></tr></table>`
  }

  return wrapWithFilters(table, filterState)
}
