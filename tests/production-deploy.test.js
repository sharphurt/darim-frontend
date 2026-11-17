import test from 'node:test'
import assert from 'node:assert/strict'
import { deployProduction } from '../ops/deploy-production.mjs'

const sha = 'a'.repeat(40)
const env = { CI_PIPELINE_EVENT: 'push', CI_COMMIT_BRANCH: 'main', CI_COMMIT_SHA: sha, COOLIFY_TOKEN: 'fixture-token' }

function harness(status = 'finished', commit = sha) {
  const calls = []
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, ...options })
    if (url.endsWith('/health')) return Response.json({ status: 'ok' })
    if (options.method === 'PATCH') return Response.json({ uuid: 'app' })
    if (url.endsWith('/deploy')) return Response.json({ deployments: [{ deployment_uuid: 'deployment-fixture' }] })
    if (url.includes('/deployments/')) return Response.json({ status, commit })
    if (url.endsWith('/frontend-release.json')) return Response.json({ commit })
    throw Error(`Unexpected URL: ${url}`)
  }
  return { calls, fetchImpl }
}

test('deploys the tested commit and confirms its version on the public domain', async () => {
  const h = harness()
  const result = await deployProduction({ env, fetchImpl: h.fetchImpl, sleep: async () => {}, log: () => {} })
  assert.equal(result.commit, sha)
  const pin = h.calls.find(call => call.method === 'PATCH')
  assert.deepEqual(JSON.parse(pin.body), { git_commit_sha: sha })
  const trigger = h.calls.find(call => call.url.endsWith('/deploy'))
  assert.equal(trigger.method, 'POST')
  assert.equal(JSON.parse(trigger.body).uuid, 'dncy9cdvvoiwyi7islmaqoua')
  assert.ok(h.calls.find(call => call.url.endsWith('/frontend-release.json')))
  assert.ok(h.calls.filter(call => call.url.startsWith('https://wishes.')).every(call => !call.headers?.Authorization))
})

test('manual and test-branch pipelines cannot trigger production', async () => {
  for (const overrides of [{ CI_PIPELINE_EVENT: 'manual' }, { CI_COMMIT_BRANCH: 'test' }]) {
    const h = harness()
    const result = await deployProduction({ env: { ...env, ...overrides }, fetchImpl: h.fetchImpl, log: () => {} })
    assert.equal(result.skipped, true)
    assert.equal(h.calls.length, 0)
  }
})

test('failed Coolify deployment fails CI instead of reporting success', async () => {
  const h = harness('failed')
  await assert.rejects(deployProduction({ env, fetchImpl: h.fetchImpl, log: () => {} }), /failed/)
})

test('a different deployed commit is rejected', async () => {
  const h = harness('finished', 'b'.repeat(40))
  await assert.rejects(deployProduction({ env, fetchImpl: h.fetchImpl, log: () => {} }), /commit/i)
})

test('a deployment trigger is never retried blindly after a network failure', async () => {
  const h = harness()
  let triggers = 0
  const fetchImpl = async (url, options) => {
    if (url.endsWith('/deploy')) { triggers++; throw Error('network failure') }
    return h.fetchImpl(url, options)
  }
  await assert.rejects(deployProduction({ env, fetchImpl, log: () => {} }), /network failure/)
  assert.equal(triggers, 1)
})

test('missing token and malformed commit stop before any remote operation', async () => {
  for (const overrides of [{ COOLIFY_TOKEN: '' }, { CI_COMMIT_SHA: 'main' }]) {
    const h = harness()
    await assert.rejects(deployProduction({ env: { ...env, ...overrides }, fetchImpl: h.fetchImpl, log: () => {} }))
    assert.equal(h.calls.length, 0)
  }
})

test('a stale public frontend is rejected even when Coolify reports the correct commit', async () => {
  const h = harness()
  const fetchImpl = (url, options) => url.endsWith('/frontend-release.json')
    ? Promise.resolve(Response.json({ commit: 'b'.repeat(40) })) : h.fetchImpl(url, options)
  await assert.rejects(deployProduction({ env, fetchImpl, log: () => {} }), /Public frontend commit/)
})

test('a deployment that never finishes is bounded by a deadline', async () => {
  const h = harness('in_progress')
  let clock = 0
  await assert.rejects(deployProduction({ env, fetchImpl: h.fetchImpl, log: () => {},
    now: () => clock, sleep: async ms => { clock += ms }, timeoutMs: 10000 }), /Timed out/)
})
