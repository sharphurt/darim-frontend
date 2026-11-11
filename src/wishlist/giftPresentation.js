import stars from '../assets/card-stars.svg'
import dots from '../assets/card-dots.svg'
import waves from '../assets/card-waves.svg'
import stripes from '../assets/card-stripes.svg'
import pink from '../assets/card-pink.svg'
import ice from '../assets/card-ice.svg'

const backgrounds = [stars, dots, waves, stripes, pink, ice]
const priceFormat = new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: 'RUB', minimumFractionDigits: 0, maximumFractionDigits: 2,
})

function loadBackgroundSeed() {
  const key = 'darim.card-background-seed'
  const seed = crypto.getRandomValues(new Uint32Array(1))[0]
  try {
    const saved = localStorage.getItem(key)
    if (saved !== null) return Number(saved)
    localStorage.setItem(key, String(seed))
  } catch {
    // The current session still has a stable selection when storage is unavailable.
  }
  return seed
}

const backgroundSeed = loadBackgroundSeed()

export function backgroundFor(id) {
  let hash = backgroundSeed ^ 2166136261
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  return backgrounds[(hash >>> 0) % backgrounds.length]
}

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
  if (gift.archived) return 'В архиве'
  if (state?.bought) return 'Подарок уже куплен'
  if (state?.isMine) return state.mode === 'split' ? 'Вы участвуете в распиле' : 'Вы забронировали подарок'
  if (state?.mode === 'split' && state.taken < state.slots) return 'Подарок пилится. Присоединяйтесь!'
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
