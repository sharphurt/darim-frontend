const storageKey = 'darim.pending-notification-link'
const kinds = ['gift', 'split', 'person', 'owner']

function parseLink(search) {
  const params = new URLSearchParams(search)
  const kind = params.get('open')
  const id = params.get('id')?.toLowerCase()
  return kinds.includes(kind) && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id ?? '')
    ? { kind, id } : null
}

export function pendingNotificationLink() {
  const params = new URLSearchParams(location.search)
  if (params.has('open')) return parseLink(params)
  try { return parseLink(sessionStorage.getItem(storageKey)) } catch { return null }
}

export function retainNotificationLink(link) {
  try {
    if (link) sessionStorage.setItem(storageKey, new URLSearchParams({ open: link.kind, id: link.id }))
  } catch {
    // The current URL still works for sign-in by code.
  }
}

export function clearNotificationLink() {
  try { sessionStorage.removeItem(storageKey) } catch { /* storage is optional */ }
  const url = new URL(location.href)
  if (url.searchParams.has('open')) {
    url.searchParams.delete('open')
    url.searchParams.delete('id')
    history.replaceState(history.state, '', url)
  }
}
