import defaultTemplate from '$lib/defaultTemplate'
import { wrapWithFilters } from '$lib/filterAmpscript'
import type { FilterState } from '$lib/filters'

export function buildEmailHTML(
  anchor: string,
  title: string,
  color: string,
  filterState: FilterState = {}
): string {
  // 12px above and below, as every block has: any two blocks are 24px apart. Cell padding, so
  // Outlook classic applies it too.
  const box = defaultTemplate({
    padding: '5px 20px',
    bgColor: color,
    innerHTML: `
      <a id="${anchor}" name="${anchor}"></a>
      <!--[if mso]>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
      <td style="padding:15px 0;color:#181818;font-family:Verdana, Geneva, sans-serif;font-size:23px;font-weight:bold;line-height:1.5;mso-line-height-rule:exactly;">
      <span style="color:#ffffff;">${title}</span>
      </td>
      </tr>
      </table>
      <![endif]-->

      <!--[if !mso]><!-- -->
      <h1
        style="color:#181818;font-family:Verdana, Geneva, sans-serif;font-size:23px;font-style:normal;font-weight:bold;line-height:150%;margin:15px 0;">
        <span style="color:#ffffff;">${title}</span>
      </h1>
      <!--<![endif]-->
`
  })
  return wrapWithFilters(
    `<table cellpadding="0" cellspacing="0" width="100%" role="presentation"><tr><td style="padding:12px 0;">${box}</td></tr></table>`,
    filterState
  )
}
