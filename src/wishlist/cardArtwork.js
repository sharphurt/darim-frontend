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

export const artworkCategoryNames = {
  dark: 'Тёмный фон',
  light: 'Светлый фон',
  overlay: 'Оверлей',
}

const builtInImages = new Map([
  ...[dark, dark1, dark2, dark3].map((src, index) => [
    `background-dark${index ? `-${index}` : ''}`, { src, category: 'dark' },
  ]),
  ...[light, light1, light2, light3].map((src, index) => [
    `background-light${index ? `-${index}` : ''}`, { src, category: 'light' },
  ]),
  ...[overlay1, overlay2, overlay3, overlay4].map((src, index) => [
    `overlay-${index + 1}`, { src, category: 'overlay' },
  ]),
])

export function cardArtworkCollection(images) {
  const catalog = images ? images.map(image => ({
    ...image,
    src: image.builtIn ? builtInImages.get(image.builtIn)?.src : `/api/card-artwork/${encodeURIComponent(image.id)}.png`,
  })).filter(image => image.src) : [...builtInImages.values()]

  return {
    catalog,
    backgrounds: catalog.filter(image => image.category !== 'overlay'),
    overlays: catalog.filter(image => image.category === 'overlay'),
  }
}

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

function pickArtwork(id, salt, images) {
  if (!images.length) return undefined
  let hash = backgroundSeed ^ salt
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b)
  return images[((hash ^ (hash >>> 13)) >>> 0) % images.length]
}

export function backgroundFor(id, { backgrounds, overlays }) {
  const background = pickArtwork(id, 2166136261, backgrounds)
  const overlay = pickArtwork(id, 0x9e3779b9, overlays)
  return { tone: background?.category ?? 'light', image: background?.src, overlay: overlay?.src }
}
