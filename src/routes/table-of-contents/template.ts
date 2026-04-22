import defaultTemplate from '$lib/defaultTemplate'

export type ContentTableItem = {
  title: string
  anchor: string
}

export function buildEmailHTML(items: ContentTableItem[]): string {
  const filtered = items.filter((item) => item.title || item.anchor)
  if (!filtered.length) return ''
  const listItems = filtered
    .map(
      ({ title, anchor }) =>
        `<li><a alias="${title}" conversion="false" data-linkto="anchortotext" href="${anchor}" style="color:#1895D3;text-decoration:underline;font-family:Verdana,Geneva,sans-serif;font-size:14px;font-style:normal;line-height:1.4" title="${title}">${title}</a></li>`
    )
    .join('\n')
  return defaultTemplate({ innerHTML: `<ul >\n${listItems}\n</ul>` })
}
