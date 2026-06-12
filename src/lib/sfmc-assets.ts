import { PUBLIC_ASSETS_ENDPOINT } from '$env/static/public'

const PROXY_BASE = PUBLIC_ASSETS_ENDPOINT.replace(/\/[^/]+$/, '')

export interface SFMCAsset {
  id: number
  name: string
  fileProperties: {
    publishedURL: string
    width?: number
    height?: number
    fileSize?: number
    extension?: string
  }
  category: { name: string }
  createdDate: string
}

export interface AssetPage {
  items: SFMCAsset[]
  totalCount: number
  page: number
  pageSize: number
}

export interface SFMCFolder {
  id: number
  name: string
  parentId: number | null
}

export async function fetchImages(
  opts: {
    page?: number
    pageSize?: number
    search?: string
    categoryIds?: number[]
  } = {}
): Promise<AssetPage> {
  const { page = 1, pageSize = 24, search, categoryIds } = opts

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize)
  })
  if (search) params.set('search', search)
  if (categoryIds?.length) params.set('categoryIds', categoryIds.join(','))

  const res = await fetch(`${PROXY_BASE}/assets?${params}`)

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    const b = body as { error?: string; detail?: string }
    const msg = [b.error, b.detail].filter(Boolean).join(' — ')
    if (res.status === 502 && b.error?.includes('token expired')) {
      throw new Error('SFMC token expired — retry')
    }
    throw new Error(`Failed to load images: ${msg}`)
  }

  const data = (await res.json()) as {
    items: SFMCAsset[]
    count: number
    page: number
    pageSize: number
  }

  return {
    items: data.items ?? [],
    totalCount: data.count ?? 0,
    page: data.page ?? page,
    pageSize: data.pageSize ?? pageSize
  }
}

export async function fetchFolders(): Promise<SFMCFolder[]> {
  const res = await fetch(`${PROXY_BASE}/folders`)

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    const b = body as { error?: string }
    throw new Error(b.error ?? 'Failed to load folders')
  }

  const data = (await res.json()) as { items: SFMCFolder[] }
  return data.items ?? []
}
