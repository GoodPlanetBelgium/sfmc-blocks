import { namedColors } from '$lib/const'
import { wrapWithFilters } from '$lib/filterAmpscript'
import type { FilterState } from '$lib/filters'

const H1_STYLE =
  'color:#181818;font-family:Verdana,Geneva,sans-serif;font-size:22px;font-style:normal;font-weight:bold;line-height:1.5;'
const H2_STYLE =
  'color:#181818;font-family:Verdana,Geneva,sans-serif;font-size:16px;font-style:normal;font-weight:bold;line-height:1.4;'
const BODY_STYLE =
  'color:#181818;font-family:Verdana,Geneva,sans-serif;font-size:14px;font-style:normal;line-height:1.4;margin:0 0 1em 0;'
const LI_STYLE =
  'color:#181818;font-family:Verdana,Geneva,sans-serif;font-size:14px;font-style:normal;line-height:1.4;margin:0;mso-line-height-rule:exactly;'

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
  const imgWidth = Math.round((imgColPct / 100) * 570)
  const assetAttr = assetId != null ? ` data-assetid="${assetId}"` : ''
  const imgCell = imageUrl
    ? `<img${assetAttr} src="${imageUrl}" alt="" width="${imgWidth}" style="display:block;width:100%;height:auto;border:0;">`
    : `<div style="background:#f0f0f0;width:100%;aspect-ratio:1/1;min-height:120px;"></div>`

  const textCell = serializeRichText(editorHTML)
  const [leftCell, rightCell] = swapped ? [textCell, imgCell] : [imgCell, textCell]

  const innerHTML = `<table cellpadding="0" cellspacing="0" width="100%" role="presentation">
  <tr>
    <td width="${splitPct}%" valign="top" style="padding-right:12px;">${leftCell}</td>
    <td width="${rightPct}%" valign="top" style="padding-left:12px;">${rightCell}</td>
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

function serializeRichText(editorHTML: string): string {
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
      parts.push(serializeList(el))
    } else if (tag === 'p' || tag === 'div') {
      const content = serializeInline(el)
      bodyLines.push(content === '<br>' || content === '' ? '' : content)
    } else if (tag === 'br') {
      bodyLines.push('')
    } else {
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
  const items = Array.from(ul.children)
    .filter((child) => child.tagName.toLowerCase() === 'li')
    .map((li) => {
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
      return `${indent}<li style="${LI_STYLE}"><span style="color:#181818;">${text}</span>${sublists}</li>`
    })
  const style = `list-style-type:${marker};${depth > 0 ? 'margin:0;' : ''}`
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

function encodeEntities(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
