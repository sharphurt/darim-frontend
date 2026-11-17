const storageKey = 'darim.pending-invite'

export function pendingInvite() {
  const start = window.Telegram?.WebApp?.initDataUnsafe?.start_param
  if (typeof start === 'string' && start.startsWith('join_')) return start.slice(5)
  const token = new URLSearchParams(window.location.search).get('invite')
  if (token) return token
  try {
    return window.sessionStorage.getItem(storageKey) ?? ''
  } catch {
    return ''
  }
}

export function retainInvite(token) {
  try {
    if (token) window.sessionStorage.setItem(storageKey, token)
  } catch {
    // The invitation remains in the URL until sign-in.
  }
}

export function clearInvite() {
  try {
    window.sessionStorage.removeItem(storageKey)
  } catch {
    // Storage can be unavailable in private browsing.
  }
  const url = new URL(window.location.href)
  if (url.searchParams.has('invite')) {
    url.searchParams.delete('invite')
    window.history.replaceState(window.history.state, '', url)
  }
}

export function inviteLink(token) {
  const url = new URL('/', window.location.origin)
  url.searchParams.set('invite', token)
  return url.href
}

export function invitationToken(value) {
  if (!value) return ''
  try {
    return new URL(value).searchParams.get('invite') ?? ''
  } catch {
    return value
  }
}
