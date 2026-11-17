import test from 'node:test'
import assert from 'node:assert/strict'
globalThis.window = undefined

test('Mini session exchanges signed data once and logout clears only in-memory token', async t => {
  const { initializeMiniSession, miniToken, closeMiniSession } = await import('../src/api/miniSession.js?success')
  let exchanges = 0, closed = false
  t.mock.property(globalThis, 'window', { Telegram: { WebApp: {
    initData: 'signed-data', initDataUnsafe: { user: { id: 'untrusted' } }, close: () => { closed = true },
  } } })
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    exchanges++
    assert.equal(path, '/auth/mini')
    assert.equal(options.credentials, 'omit')
    assert.deepEqual(JSON.parse(options.body), { initData: 'signed-data' })
    return Response.json({ token: 'session-token' })
  })
  await Promise.all([initializeMiniSession(), initializeMiniSession()])
  assert.equal(exchanges, 1)
  assert.equal(miniToken(), 'session-token')
  closeMiniSession()
  assert.equal(miniToken(), null)
  assert.equal(closed, true)
  await assert.rejects(initializeMiniSession(), { status: 401 })
})

test('rejected Mini App launch never creates a bearer or falls back to cookies', async t => {
  const { initializeMiniSession, miniToken } = await import('../src/api/miniSession.js?failure')
  t.mock.property(globalThis, 'window', { Telegram: { WebApp: { initData: 'invalid' } } })
  t.mock.method(globalThis, 'fetch', async () => Response.json({}, { status: 401 }))
  await assert.rejects(initializeMiniSession(), { status: 401 })
  assert.equal(miniToken(), null)
})
