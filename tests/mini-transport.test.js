import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHttpClient } from '../src/api/http.js'
import { createDarimApi } from '../src/api/darim.js'

test('Mini App uses bearer for reads and writes without cookie CSRF', async () => {
  const calls = []
  const original = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options })
    return new Response('{}', { headers: { 'content-type': 'application/json' } })
  }
  try {
    const client = createHttpClient({ token: () => 'mini-token' })
    await client.get('/api/me')
    await client.write('/api/profile', 'PUT', { name: 'Друг' })
    assert.deepEqual(calls.map(call => call.url), ['/api/me', '/api/profile'])
    assert.ok(calls.every(call => call.headers.Authorization === 'Bearer mini-token'))
    assert.ok(calls.every(call => call.credentials === 'omit'))
  } finally { globalThis.fetch = original }
})

test('browser writes still fetch and send CSRF', async () => {
  const calls = []
  const original = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options })
    return new Response(JSON.stringify({ token: 'csrf' }), { headers: { 'content-type': 'application/json' } })
  }
  try {
    await createHttpClient().write('/api/profile', 'PUT', {})
    assert.deepEqual(calls.map(call => call.url), ['/api/csrf', '/api/profile'])
    assert.equal(calls[1].headers['X-CSRF-TOKEN'], 'csrf')
  } finally { globalThis.fetch = original }
})

test('deleting a wish sends DELETE with CSRF and accepts an empty response', async () => {
  const calls = []
  const original = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options })
    return url === '/api/csrf'
      ? Response.json({ token: 'csrf' })
      : new Response(null, { status: 204 })
  }
  try {
    await createDarimApi().deleteGift('gift-id')
    assert.deepEqual(calls.map(call => [call.method, call.url]), [
      ['GET', '/api/csrf'],
      ['DELETE', '/api/gifts/gift-id'],
    ])
    assert.equal(calls[1].headers['X-CSRF-TOKEN'], 'csrf')
    assert.equal(calls[1].body, undefined)
  } finally { globalThis.fetch = original }
})
