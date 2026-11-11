import dark from '../assets/cards/background-dark.png'
import dark1 from '../assets/cards/background-dark-1.png'
import dark2 from '../assets/cards/background-dark-2.png'
import dark3 from '../assets/cards/background-dark-3.png'
import light from '../assets/cards/background-light.png'
import light1 from '../assets/cards/background-light-1.png'
import light2 from '../assets/cards/background-light-2.png'
import light3 from '../assets/cards/background-light-3.png'
import overlay1 from '../assets/cards/overlay-1.png'
import overlay2 from '../assets/cards/overlay-2.png'
import overlay3 from '../assets/cards/overlay-3.png'
import overlay4 from '../assets/cards/overlay-4.png'

const backgrounds = [
  ...[dark, dark1, dark2, dark3].map(image => ({ image, tone: 'dark' })),
  ...[light, light1, light2, light3].map(image => ({ image, tone: 'light' })),
]
const overlays = [overlay1, overlay2, overlay3, overlay4]
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
  const index = hash >>> 0
  const background = backgrounds[index % backgrounds.length]
  const overlay = overlays[Math.floor(index / backgrounds.length) % overlays.length]
  return { ...background, overlay }
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
