import { wrapWithFilters } from '$lib/filterAmpscript'
import type { FilterState } from '$lib/filters'

export function buildEmailHTML(filterState: FilterState = {}): string {
  // A table instead of an <hr>: Outlook classic draws its own <hr> and ignores its margins.
  // 12px above and below the line, as every block has: any two blocks are 24px apart.
  return wrapWithFilters(
    `<table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation"><tr><td style="padding:12px 0;"><table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation"><tr><td style="border-top:2px solid #EAEAEA;height:1px;font-size:1px;line-height:1px;mso-line-height-rule:exactly;">&nbsp;</td></tr></table></td></tr></table>`,
    filterState
  )
}
