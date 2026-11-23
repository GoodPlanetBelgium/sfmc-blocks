import { namedColors } from '$lib/const'

// Spacing is bottom margins only, in explicit px. Browsers overlap the margins of adjacent
// elements and Outlook classic (Word engine) may add them up, so with no top margins the gaps
// are the same in both. It also starts text next to an image level with the image's top.
const H1_STYLE =
  'color:#181818;font-family:Verdana,Geneva,sans-serif;font-size:22px;font-style:normal;font-weight:bold;line-height:1.5;text-align:left;margin:0 0 15px 0;'
const H2_STYLE =
  'color:#181818;font-family:Verdana,Geneva,sans-serif;font-size:16px;font-style:normal;font-weight:bold;line-height:1.4;text-align:left;margin:0 0 13px 0;'
const BODY_STYLE =
  'color:#181818;font-family:Verdana,Geneva,sans-serif;font-size:14px;font-style:normal;line-height:1.4;text-align:left;margin:0 0 14px 0;'
const LI_STYLE =
  'color:#181818;font-family:Verdana,Geneva,sans-serif;font-size:14px;font-style:normal;line-height:1.4;text-align:left;mso-line-height-rule:exactly;'

/** Space under a list, as under a paragraph. */
const LIST_GAP = 14
/** Space between list items; the last item has none, so it doesn't add to LIST_GAP. */
const ITEM_GAP = 4

// Outlook classic (Word engine) ignores the bottom margin of a <ul>, so this mso-only spacer gives
// it the list's gap instead; other clients use the margin, so the gap isn't doubled.
const MSO_LIST_SPACER = `<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="height:${LIST_GAP}px;line-height:${LIST_GAP}px;font-size:0;">&nbsp;</td></tr></table><![endif]-->`

/** Converts the contenteditable HTML of RichTextInput into email-safe, inline-styled HTML. */
export function serializeRichText(editorHTML: string): string {
  if (!editorHTML.trim()) return ''
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<body>${editorHTML}</body>`, 'text/html')
  const parts: string[] = []
  const bodyLines: string[] = []

  function flushBody() {
    while (bodyLines.length > 0 && bodyLines.at(-1) === '') bodyLines.pop()
    for (const line of bodyLines) {
      parts.push(line === '' ? '<br>' : `<p style="${BODY_STYLE}">${line}</p>`)
    }
    bodyLines.length = 0
  }

  for (const child of Array.from(doc.body.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? ''
      if (text.trim()) bodyLines.push(encodeEntities(text))
      continue
    }
    const el = child as Element
    const tag = el.tagName?.toLowerCase()
    if (tag === 'h1') {
      flushBody()
      parts.push(`<h1 style="${H1_STYLE}">\n ${serializeInline(el)}</h1>`)
    } else if (tag === 'h2') {
      flushBody()
      parts.push(`<h2 style="${H2_STYLE}">\n ${serializeInline(el)}</h2>`)
    } else if (tag === 'ul') {
      flushBody()
      parts.push(serializeList(el), MSO_LIST_SPACER)
    } else if (tag === 'p' || tag === 'div') {
      const content = serializeInline(el)
      bodyLines.push(content === '<br>' || content === '' ? '' : content)
    } else if (tag === 'br') {
      bodyLines.push('')
    } else {
      // Inline element at block level (e.g. <span> from foreColor on unwrapped text)
      const content = serializeNode(child)
      if (content.trim()) bodyLines.push(content)
    }
  }

  flushBody()
  return parts.join('\n')
}

function serializeInline(el: Element): string {
  return Array.from(el.childNodes).map(serializeNode).join('')
}

const LIST_MARKERS = ['disc', 'circle', 'square']

function serializeList(ul: Element, depth = 0): string {
  const marker = LIST_MARKERS[Math.min(depth, LIST_MARKERS.length - 1)]
  const indent = '  '.repeat(depth + 1)
  const lis = Array.from(ul.children).filter((child) => child.tagName.toLowerCase() === 'li')
  const items = lis.map((li, i) => {
    const margin = `margin:0 0 ${i < lis.length - 1 ? ITEM_GAP : 0}px 0;`
    const isNestedList = (n: Node) =>
      n.nodeType === Node.ELEMENT_NODE && (n as Element).tagName.toLowerCase() === 'ul'
    const nodes = Array.from(li.childNodes)
    const text = nodes
      .filter((n) => !isNestedList(n))
      .map(serializeNode)
      .join('')
    const sublists = nodes
      .filter(isNestedList)
      .map((n) => `\n${serializeList(n as Element, depth + 1)}\n${indent}`)
      .join('')
    return `${indent}<li style="${LI_STYLE}${margin}"><span style="color:#181818;">${text}</span>${sublists}</li>`
  })
  // A nested list sits inside an item, so only the outer list gets the gap below it.
  const bottom = depth > 0 ? 0 : LIST_GAP
  const style = `list-style-type:${marker};margin:0 0 ${bottom}px 20px;padding:0;`
  const open = '  '.repeat(depth)
  return `${open}<ul style="${style}">\n${items.join('\n')}\n${open}</ul>`
}

function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return encodeEntities(node.textContent ?? '')
  const el = node as Element
  const tag = el.tagName?.toLowerCase()
  switch (tag) {
    case 'b':
    case 'strong':
      return `<b>${serializeInline(el)}</b>`
    case 'i':
    case 'em':
      return `<i>${serializeInline(el)}</i>`
    case 'span': {
      const color = (el as HTMLElement).style?.color
      return color
        ? `<span style="color:${toHex(color)};">${serializeInline(el)}</span>`
        : serializeInline(el)
    }
    case 'font': {
      const color = el.getAttribute('color')
      return color
        ? `<span style="color:${toHex(color)};">${serializeInline(el)}</span>`
        : serializeInline(el)
    }
    case 'a':
      return formatLink(el.getAttribute('href') ?? '', serializeInline(el))
    case 'br':
      return '<br>\n'
    default:
      return serializeInline(el)
  }
}

function formatLink(href: string, text: string): string {
  if (href.startsWith('#')) {
    return `<a href="${href}" style="color:${namedColors.blue};text-decoration:none;">${text}</a>`
  }
  const isMailto = href.startsWith('mailto:') || (!href.startsWith('http') && href.includes('@'))
  if (isMailto) {
    const email = href.replace(/^mailto:/i, '').split('?')[0]
    return `<a alias="${email}" data-linkto="mailto:" href="mailto:${email}?subject=" style="color:${namedColors.blue};text-decoration:none;" title="${email}">${text}</a>`
  }
  const url = href.startsWith('http') ? href : `https://${href}`
  const safeUrl = url.replace(/"/g, "'")
  const protocol = url.split(':')[0] + ':'
  return `<a alias="${safeUrl}" data-linkto="${protocol}" href="${safeUrl}" style="color:${namedColors.blue};text-decoration:none;" title="${safeUrl}">${text}</a>`
}

function toHex(color: string): string {
  const m = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)
  return m
    ? '#' + [m[1], m[2], m[3]].map((n) => parseInt(n).toString(16).padStart(2, '0')).join('')
    : color
}

export function encodeEntities(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
