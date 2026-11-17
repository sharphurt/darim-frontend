import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHttpClient } from '../src/api/http.js'

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
