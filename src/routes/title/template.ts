import defaultTemplate from '$lib/defaultTemplate'

export function buildEmailHTML(anchor: string, title: string, color: string): string {
  return defaultTemplate({
    padding: '5px 20px',
    bgColor: color,
    innerHTML: `
      <a id="${anchor}" name="${anchor}"></a>
      <!--[if mso]>
      <table role="presentation" border="0" cellpadding="12" cellspacing="0" width="100%">
      <tr>
      <td style="color:#181818;font-family:Verdana, Geneva, sans-serif;font-size:23px;font-weight:bold;line-height:1.5;mso-line-height-rule:exactly;">
      <span style="color:#ffffff;">${title}</span>
      </td>
      </tr>
      </table>
      <![endif]-->

      <!--[if !mso]><!-- -->
      <h1
        style="color:#181818;font-family:Verdana, Geneva, sans-serif;font-size:23px;font-style:normal;font-weight:bold;line-height:150%;">
        <span style="color:#ffffff;">${title}</span>
      </h1>
      <!--<![endif]-->
`
  })
}
