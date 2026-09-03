// Remembers the SFMC asset name behind a published image URL, so previews can
// label an image that is still propagating to the CDN. Shared via localStorage
// because the dev harness renders the block in a separate same-origin iframe.

const KEY = 'sfmc-asset-names'
const MAX_ENTRIES = 200

type NameMap = Record<string, string>

function stripQuery(url: string): string {
  return url.split('?')[0]
}

function read(): NameMap {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as NameMap
  } catch {
    return {}
  }
}

export function rememberAssetName(url: string, name: string) {
  if (!url || !name) return
  try {
    const map = read()
    const key = stripQuery(url)
    delete map[key]
    map[key] = name
    const keys = Object.keys(map)
    for (const stale of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) delete map[stale]
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    // localStorage unavailable (SSR, private mode) — labels are cosmetic
  }
}

export function lookupAssetName(url: string): string | null {
  if (!url) return null
  return read()[stripQuery(url)] ?? null
}
