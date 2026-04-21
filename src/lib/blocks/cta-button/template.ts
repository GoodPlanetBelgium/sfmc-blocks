export function buildEmailHTML(
  url: string,
  title: string,
  color: string,
  width: number,
  outlookWidth: number
): string {
  return `<div style="margin:20px 0px;">
<table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation"><tr><td align="center">
<table border="0" cellspacing="0" cellpadding="0" role="presentation"><tr><td>
<!--[if mso]>
  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
    href="${url}"
    style="height:45px;v-text-anchor:middle;width:${outlookWidth}px;" arcsize="20%" stroke="f" fillcolor="${color}">
  <w:anchorlock/>
  <center>
<![endif]-->
<a href="${url}"
   style="background-color:${color};border-radius:8px;color:#ffffff;display:inline-block;font-family:Verdana,sans-serif;font-size:16px;font-weight:bold;line-height:45px;text-align:center;text-decoration:none;width:${width}px;-webkit-text-size-adjust:none;">${title}</a>
<!--[if mso]>
  </center>
  </v:roundrect>
<![endif]-->
</td></tr></table></td></tr></table></div>`
}
