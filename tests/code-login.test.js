import test from 'node:test'
import assert from 'node:assert/strict'
import { createDarimApi } from '../src/api/darim.js'

test('code login posts JSON to the same-origin auth endpoint without requesting CSRF', async t => {
 const calls = []
 t.mock.method(globalThis, 'fetch', async (path, options) => {
  calls.push({ path, options })
  return new Response(null, { status: 200 })
 })
 await createDarimApi().codeLogin('ABCDEF123456')
 assert.equal(calls.length, 1)
 assert.equal(calls[0].path, '/auth/code')
 assert.equal(calls[0].options.method, 'POST')
 assert.equal(calls[0].options.credentials, 'same-origin')
 assert.deepEqual(JSON.parse(calls[0].options.body), { code: 'ABCDEF123456' })
})

test('expired code preserves the server error and allows another attempt', async t => {
 let attempts = 0
 t.mock.method(globalThis, 'fetch', async () => {
  attempts++
  return attempts === 1
   ? Response.json({ title: 'Код неверный или истёк.' }, { status: 401 })
   : new Response(null, { status: 200 })
 })
 const api = createDarimApi()
 await assert.rejects(api.codeLogin('000000000000'), { status: 401, message: 'Код неверный или истёк.' })
 await api.codeLogin('ABCDEF123456')
 assert.equal(attempts, 2)
})
