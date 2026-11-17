import { test } from 'node:test'
import assert from 'node:assert/strict'
import { giftBadge } from '../src/wishlist/giftPresentation.js'

test('open split invites participation even beyond old slot count', () => {
  assert.match(giftBadge({ participation: { mode: 'split', open: true, taken: 5, slots: 2 } }), /Присоединяйтесь/)
})

test('closed split does not invite participants', () => {
  assert.doesNotMatch(giftBadge({ participation: { mode: 'split', open: false, taken: 2, slots: 2 } }), /Присоединяйтесь/)
})
