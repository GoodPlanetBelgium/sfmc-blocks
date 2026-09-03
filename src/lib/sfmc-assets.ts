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
  category: { id: number; name: string }
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

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
    reader.readAsDataURL(file)
  })
}

export async function uploadImage(file: File, categoryId: number): Promise<SFMCAsset> {
  const base64 = await readAsBase64(file)

  const res = await fetch(`${PROXY_BASE}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: file.name, file: base64, categoryId })
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    const b = body as { error?: string; detail?: string }
    throw new Error([b.error, b.detail].filter(Boolean).join(' — ') || 'Upload failed')
  }

  return (await res.json()) as SFMCAsset
}

async function mutate(path: string, method: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${PROXY_BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  })

  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: res.statusText }))
    const p = payload as { error?: string; detail?: string }
    throw new Error([p.error, p.detail].filter(Boolean).join(' — ') || 'Request failed')
  }

  return res.json()
}

export async function renameAsset(id: number, name: string): Promise<void> {
  await mutate(`/assets/${id}`, 'PATCH', { name })
}

export async function deleteAsset(id: number): Promise<void> {
  await mutate(`/assets/${id}`, 'DELETE')
}

export async function createFolder(name: string, parentId: number): Promise<SFMCFolder> {
  const created = (await mutate('/folders', 'POST', { name, parentId })) as {
    id: number
    name: string
    parentId: number
  }
  return { id: created.id, name: created.name, parentId: created.parentId ?? parentId }
}

export async function renameFolder(id: number, name: string): Promise<void> {
  await mutate(`/folders/${id}`, 'PUT', { name })
}

export async function deleteFolder(id: number): Promise<void> {
  await mutate(`/folders/${id}`, 'DELETE')
}
