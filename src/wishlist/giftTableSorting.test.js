import assert from 'node:assert/strict'
import test from 'node:test'
import { isFreeGift, sortTableGifts, tableGiftStatus } from './giftTableSorting.js'

const gift = (id, title, price, name = 'Анна', participation) => ({ id, details: { title, price }, owner: { name }, participation })
const ids = gifts => gifts.map(item => item.id)

test('free filter excludes reserved, split, bought, archived and hidden statuses and composes with sorting', () => {
  const free = gift('free', 'Книга', 100, 'Анна', { mode: 'free' })
  const gifts = [free, { ...free, id: 'archive', archived: true },
    gift('reserved', 'Бронь', 10, 'Анна', { mode: 'solo' }),
    gift('split', 'Распил', 10, 'Анна', { mode: 'split', taken: 1, slots: 3 }),
    gift('bought', 'Куплено', 10, 'Анна', { mode: 'free', bought: true }),
    gift('hidden', 'Сюрприз', 10),
    gift('unlimited', 'Чай', 50, 'Анна', { mode: 'free' })]
  gifts.at(-1).unlimited = true
  assert.deepEqual(ids(sortTableGifts(gifts.filter(isFreeGift), { key: 'price', direction: 'ascending' })), ['unlimited', 'free'])
  assert.equal(gifts.length, 7)
})

test('prices sort numerically, keep zero and put missing prices last in both directions', () => {
  const gifts = [gift('missing', 'Без цены', null), gift('high', 'Дорого', 1000), gift('zero', 'Бесплатно', 0), gift('low', 'Недорого', 90)]
  assert.deepEqual(ids(sortTableGifts(gifts, { key: 'price', direction: 'ascending' })), ['zero', 'low', 'high', 'missing'])
  assert.deepEqual(ids(sortTableGifts(gifts, { key: 'price', direction: 'descending' })), ['high', 'low', 'zero', 'missing'])
  assert.deepEqual(ids(gifts), ['missing', 'high', 'zero', 'low'])
})

test('Russian titles and owners sort naturally and equal values retain their order', () => {
  const gifts = [gift('b', 'Яблоко', 1, 'Яна'), gift('a10', 'Альбом 10', 1), gift('a2', 'Альбом 2', 1)]
  assert.deepEqual(ids(sortTableGifts(gifts, { key: 'title', direction: 'ascending' })), ['a2', 'a10', 'b'])
  assert.deepEqual(ids(sortTableGifts(gifts, { key: 'owner', direction: 'ascending' })), ['a10', 'a2', 'b'])
  assert.deepEqual(ids(sortTableGifts(gifts, { key: 'title', direction: 'descending' })), ['b', 'a10', 'a2'])
  assert.equal(sortTableGifts(gifts, null), gifts)
})

test('status sorting uses visible labels and preserves hidden status', () => {
  const hidden = gift('hidden', 'Сюрприз', 1)
  const free = gift('free', 'Книга', 1, 'Анна', { mode: 'free' })
  const archived = { ...free, id: 'archive', archived: true }
  assert.equal(tableGiftStatus(hidden), '')
  assert.equal(tableGiftStatus(archived), 'В архиве')
  assert.deepEqual(ids(sortTableGifts([hidden, free, archived], { key: 'status', direction: 'ascending' })), ['archive', 'free', 'hidden'])
  assert.deepEqual(ids(sortTableGifts([hidden, free, archived], { key: 'status', direction: 'descending' })), ['free', 'archive', 'hidden'])
})
