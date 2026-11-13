import { giftBadge } from './giftPresentation.js'

const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' })

export function tableGiftStatus(gift) {
  return gift.archived ? 'В архиве' : giftBadge(gift) || (gift.participation?.mode === 'free' ? 'Можно подарить' : '')
}

export function sortTableGifts(gifts, sort) {
  if (!sort) return gifts
  const valueOf = {
    title: gift => gift.details.title,
    owner: gift => gift.owner.name,
    price: gift => gift.details.price,
    status: tableGiftStatus,
  }[sort.key]
  const direction = sort.direction === 'ascending' ? 1 : -1
  return [...gifts].sort((a, b) => {
    const left = valueOf(a)
    const right = valueOf(b)
    const leftMissing = left == null || left === ''
    const rightMissing = right == null || right === ''
    // Missing values stay at the bottom in either direction; zero is a valid price.
    if (leftMissing || rightMissing) return Number(leftMissing) - Number(rightMissing)
    return direction * (sort.key === 'price' ? left - right : collator.compare(left, right))
  })
}
