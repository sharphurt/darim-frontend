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

export async function resolveNotificationBoard(link, api, me, signal) {
  const companies = me.companies ?? (me.company ? [me.company] : [])
  const isGift = link.kind === 'gift'
  const shared = isGift ? companies : companies.filter(company =>
    company.members.some(person => person.id === link.id && person.id !== me.user.id))
  const matches = gift => !gift.archived && (isGift ? gift.id === link.id : gift.owner.id === link.id)
  const results = await Promise.allSettled(shared.map(company => api.gifts('board', company.id, signal)))
  for (const [index, result] of results.entries()) {
    const gift = result.status === 'fulfilled' && result.value.find(matches)
    if (gift) return { view: 'board', companyId: shared[index].id, ownerId: gift.owner.id }
  }
  if (results.some(result => result.status === 'rejected')) throw new Error('Board unavailable')
  if (!isGift && shared.length) return { view: 'board', companyId: shared[0].id, ownerId: link.id }
  if (isGift || link.id === me.user.id) {
    const gift = (await api.gifts('mine', undefined, signal)).find(matches)
    if (gift || link.id === me.user.id) return { view: 'mine', ownerId: me.user.id }
  }
  return null
}

export function highlightNotificationCard(anchor, reducedMotion) {
  const halo = { outlineColor: '#c26b19', boxShadow: '0 0 0 5px #ffb86266' }
  const clear = { outlineColor: 'transparent', boxShadow: '0 0 0 0 transparent' }
  const frames = reducedMotion ? [halo, halo] : [
    clear, { ...halo, offset: 0.28, boxShadow: '0 0 0 8px #ffb86266' }, { ...halo, offset: 0.75 }, clear,
  ]
  anchor.querySelector('.gift-card')?.animate(frames, { duration: reducedMotion ? 2200 : 3400, easing: 'ease-out' })
}
