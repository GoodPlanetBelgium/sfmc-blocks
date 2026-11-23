import { encodeEntities } from '$lib/richTextEmail'

/** Image caption: a bit smaller and lighter than body text (14px #181818). */
// Explicit px line-height: the image cells around it set line-height 0 with mso-line-height-rule.
const CAPTION_STYLE =
  'color:#666666;font-family:Verdana,Geneva,sans-serif;font-size:12px;font-style:normal;line-height:17px;mso-line-height-rule:exactly;text-align:left;'

/**
 * Table row holding the caption, to append under the image's row; '' when the caption is blank.
 * `bottom` is the space under the caption: 0 where the block already adds space below.
 */
export function captionRow(caption: string | undefined, bottom = 12): string {
  const text = caption?.trim()
  return text
    ? `<tr><td style="${CAPTION_STYLE}padding:6px 0 ${bottom}px 0;">${encodeEntities(text)}</td></tr>`
    : ''
}

/** Puts the caption under a bare `<img>` in a table of its own; the image as is when blank. */
export function withCaption(img: string, caption: string | undefined): string {
  const row = captionRow(caption)
  if (!row) return img
  return `<table width="100%" cellspacing="0" cellpadding="0" role="presentation"><tr><td style="line-height:0;font-size:0;mso-line-height-rule:exactly;">${img}</td></tr>${row}</table>`
}
