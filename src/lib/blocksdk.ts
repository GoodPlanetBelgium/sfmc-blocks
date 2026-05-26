/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 *
 * Source: https://github.com/salesforce-marketingcloud/blocksdk (archived Jan 2024)
 * Vendored to avoid CDN dependency and ensure long-term stability.
 */

type Callback<T = unknown> = (payload: T) => void

export interface AnchorEntry {
  anchor: string
  title: string
}

export interface CentralData {
  anchors?: AnchorEntry[]
}

export type BlockSDKTab =
  | 'stylingblock'
  | 'htmlblock'
  | { key: string; name: string | Record<string, string>; url: string }

interface SDKConfig {
  onEditClose?: () => void
  tabs?: BlockSDKTab[]
  blockEditorWidth?: number | string
}

interface PendingMessage {
  method: string
  payload?: unknown
  callback?: Callback
}

interface PostPayload {
  method: string
  payload?: unknown
  id?: number
}

interface MessageData {
  method?: string
  origin?: string
  id?: number
  payload?: unknown
}

declare global {
  interface Window {
    sfdc?: { BlockSDK?: typeof BlockSDK }
  }
}

class BlockSDK {
  private _whitelistOverride?: string[]
  private _sslOverride: unknown
  private _messageId: number
  private _messages: Record<number, Callback | undefined>
  private _readyToPost: boolean
  private _pendingMessages: PendingMessage[]
  private _parentOrigin?: string
  handlers?: { onEditClose?: () => void }

  constructor(
    config?: SDKConfig | string[],
    whitelistOverride?: string[] | boolean,
    sslOverride?: boolean
  ) {
    if (Array.isArray(config)) {
      whitelistOverride = config
      sslOverride = whitelistOverride as unknown as boolean
      config = undefined
    }

    const cfg = config as SDKConfig | undefined
    if (cfg?.onEditClose) {
      this.handlers = { onEditClose: cfg.onEditClose }
      cfg.onEditClose = undefined
    }

    this._whitelistOverride = Array.isArray(whitelistOverride) ? whitelistOverride : undefined
    this._sslOverride = sslOverride
    this._messageId = 1
    this._messages = { 0: () => {} }
    this._readyToPost = false
    this._pendingMessages = []

    window.addEventListener('message', this._receiveMessage.bind(this), false)

    window.parent.postMessage(
      {
        method: 'handShake',
        origin: window.location.origin,
        payload: config
      },
      '*'
    )
  }

  execute(method: string, options: { data?: unknown; success?: Callback } = {}): void {
    const payload = options.data
    const callback = options.success

    if (!this._readyToPost) {
      this._pendingMessages.push({ method, payload, callback })
    } else {
      this._post({ method, payload }, callback)
    }
  }

  getCentralData(cb?: Callback<CentralData>): void {
    this.execute('getCentralData', { success: (data) => cb?.((data as CentralData) ?? {}) })
  }
  getContent(cb?: Callback): void {
    this.execute('getContent', { success: cb })
  }
  getData(cb?: Callback): void {
    this.execute('getData', { success: cb })
  }
  getUserData(cb?: Callback): void {
    this.execute('getUserData', { success: cb })
  }
  getView(cb?: Callback): void {
    this.execute('getView', { success: cb })
  }

  setBlockEditorWidth(value: unknown, cb?: Callback): void {
    this.execute('setBlockEditorWidth', { data: value, success: cb })
  }
  setCentralData(dataObj: CentralData, cb?: Callback): void {
    this.execute('setCentralData', { data: dataObj, success: cb })
  }
  setContent(content: string, cb?: Callback): void {
    this.execute('setContent', { data: content, success: cb })
  }
  setData(dataObj: unknown, cb?: Callback): void {
    this.execute('setData', { data: dataObj, success: cb })
  }
  setSuperContent(content: string, cb?: Callback): void {
    this.execute('setSuperContent', { data: content, success: cb })
  }

  private _executePendingMessages(): void {
    this._pendingMessages.forEach((msg) => {
      this.execute(msg.method, { data: msg.payload, success: msg.callback })
    })
    this._pendingMessages = []
  }

  private _post(payload: PostPayload, callback?: Callback): void {
    this._messages[this._messageId] = callback
    payload.id = this._messageId
    this._messageId += 1
    window.parent.postMessage(payload, this._parentOrigin ?? '*')
  }

  private _receiveMessage(message: MessageEvent): void {
    const data = (message?.data ?? {}) as MessageData

    if (data.method === 'handShake') {
      if (this._validateOrigin(data.origin)) {
        this._parentOrigin = data.origin
        this._readyToPost = true
        this._executePendingMessages()
        return
      }
    } else if (data.method === 'closeBlock') {
      if (this._validateOrigin(data.origin)) {
        this.handlers?.onEditClose?.()
        this.execute('blockReadyToClose')
        return
      }
    }

    if (!this._parentOrigin || this._parentOrigin !== message.origin) return
    ;(this._messages[data.id ?? 0] ?? (() => {}))(data.payload)
    if (data.id !== undefined) delete this._messages[data.id]
  }

  private _validateOrigin(origin?: string): boolean {
    if (!origin) return false
    const allowedDomains = this._whitelistOverride ?? [
      'exacttarget\\.com',
      'marketingcloudapps\\.com',
      'blocktester\\.herokuapp\\.com'
    ]

    return allowedDomains.some((domain) => {
      const optionalSsl = this._sslOverride ? '?' : ''
      const mcSubdomain = domain === 'exacttarget\\.com' ? 'mc\\.' : ''
      const regex = new RegExp(
        '^https' +
          optionalSsl +
          '://' +
          mcSubdomain +
          '([a-zA-Z0-9-]+\\.)*' +
          domain +
          '(:[0-9]+)?$',
        'i'
      )
      return regex.test(origin)
    })
  }
}

if (typeof window === 'object') {
  window.sfdc = window.sfdc ?? {}
  window.sfdc.BlockSDK = BlockSDK
}

export default BlockSDK
