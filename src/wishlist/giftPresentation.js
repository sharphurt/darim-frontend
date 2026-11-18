const priceFormat = new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: 'RUB', minimumFractionDigits: 0, maximumFractionDigits: 2,
})

export function safeLink(value) {
  if (!value) return undefined
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.href
  } catch {
    return undefined
  }
}

export function cardPhoto(gift) {
  if (gift.photoVersion) return `/api/gifts/${gift.id}/photo/${gift.photoVersion}`
  return safeLink(gift.photoUrl)
}

export const formatPrice = value => value == null ? '' : priceFormat.format(value)

export function giftBadge(gift) {
  const state = gift.participation
  if (gift.archived) return ''
  if (state?.bought) return 'Подарок уже куплен'
  if (state?.isMine) return state.mode === 'split' ? 'Вы участвуете в распиле' : 'Вы забронировали подарок'
  if (state?.mode === 'external') return 'Подарок забронирован в Ohmywishes'
  if (state?.mode === 'split' && (state.open ?? state.taken < state.slots)) return 'Подарок пилится. Присоединяйтесь!'
  if (state && state.mode !== 'free') return 'Подарок уже занят'
  return ''
}

export function groupGifts(gifts) {
  const groups = new Map()
  for (const gift of gifts) {
    if (!groups.has(gift.owner.id)) groups.set(gift.owner.id, { owner: gift.owner, gifts: [] })
    groups.get(gift.owner.id).gifts.push(gift)
  }
  return [...groups.values()]
}

export function matchesWishlistCompany(visibility, company) {
  if (!company) return true
  if (company === 'private') return !visibility?.allCompanies && !visibility?.companyIds?.length
  return Boolean(visibility?.allCompanies || visibility?.companyIds?.includes(company))
}
