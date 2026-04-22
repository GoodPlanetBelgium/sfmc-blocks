const P = '12px 0px'
const BG_COLOR = 'transparent'

export default function defaultTemplate({
  innerHTML = '',
  padding = P,
  bgColor = BG_COLOR
}): string {
  return `
<table cellpadding="0" cellspacing="0" width="100%" role="presentation"
  style="background-color: ${bgColor}; min-width: 100%; " class="stylingblock-content-wrapper">
  <tr>
    <td style="padding: ${padding}; " class="stylingblock-content-wrapper camarker-inner">${innerHTML}</td>
  </tr>
</table>`
}
