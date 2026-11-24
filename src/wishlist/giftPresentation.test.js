import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { formatGiftPrice, formatPrice, matchesGiftBudget, variantSelection } from './giftPresentation.js'

const mouse = { details: { price: null }, variants: [{ price: 8900 }, { price: null }, { price: 3500 }] }

test('the price range notes unpriced variants without treating them as free', () => {
  assert.equal(formatGiftPrice(mouse), `${formatPrice(3500)} – ${formatPrice(8900)} · есть варианты без цены`)
  assert.equal(formatGiftPrice({ ...mouse, variants: [{ price: null }, { price: 3500 }] }),
    `${formatPrice(3500)} · есть варианты без цены`)
  assert.equal(matchesGiftBudget(mouse, '3499'), false)
  assert.equal(matchesGiftBudget(mouse, '3500'), true)
  assert.equal(matchesGiftBudget({ ...mouse, variants: [{ price: null }] }, '12000'), false)
  assert.equal(matchesGiftBudget({ details: { price: 0 } }, '0'), true)
})

test('selection sends the displayed revision and leaves regular wishes compatible', () => {
  const form = new FormData()
  assert.deepEqual(variantSelection(form), {})
  form.set('variantId', 'g305')
  form.set('variantsVersion', 'updated')
  assert.deepEqual(variantSelection(form), { variantId: 'g305', variantsVersion: 'updated' })
})
