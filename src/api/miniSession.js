import { ApiError } from './http.js'

let bearer = null
let initialization
let signedOut = false

export const miniApp = () => globalThis.window?.Telegram?.WebApp
export const miniToken = () => bearer

export function initializeMiniSession() {
  const app = miniApp()
  if (!app?.initData) return Promise.resolve()
  if (signedOut) return Promise.reject(new ApiError(401, 'Откройте Mini App заново, чтобы войти.'))
  initialization ??= (async () => {
    app.ready?.()
    app.expand?.()
    const response = await fetch('/auth/mini', {
      method: 'POST', credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: app.initData }),
    })
    if (!response.ok) throw new ApiError(response.status, 'Не удалось войти через Telegram. Откройте Mini App заново.')
    const session = await response.json()
    if (!session.token) throw new ApiError(401, 'Telegram не вернул сессию. Откройте Mini App заново.')
    bearer = session.token
  })()
  return initialization
}

export function closeMiniSession() {
  bearer = null
  signedOut = true
  miniApp()?.close?.()
}
