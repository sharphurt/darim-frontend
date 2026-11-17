import { pathToFileURL } from 'node:url'

const application = 'dncy9cdvvoiwyi7islmaqoua'
const api = 'https://coolify.hype-ny.ru/api/v1'
const site = 'https://wishes.hype-ny.ru'

export async function deployProduction({ env = process.env, fetchImpl = fetch,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), now = Date.now,
  log = console.log, timeoutMs = 15 * 60 * 1000 } = {}) {
  if (env.CI_PIPELINE_EVENT !== 'push' || env.CI_COMMIT_BRANCH !== 'main') {
    log('Production deployment skipped: only a push to main may deploy.')
    return { skipped: true }
  }
  const commit = env.CI_COMMIT_SHA
  if (!/^[a-f0-9]{40}$/.test(commit ?? '')) throw Error('Invalid tested commit SHA')
  if (!env.COOLIFY_TOKEN) throw Error('Configure coolify_token for push pipelines in Woodpecker')

  async function request(url, { method = 'GET', body, admin = false } = {}) {
    const response = await fetchImpl(url, {
      method, signal: AbortSignal.timeout(20000),
      headers: { Accept: 'application/json', ...(admin ? { Authorization: `Bearer ${env.COOLIFY_TOKEN}` } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    if (!response.ok) throw Error(`${method} ${new URL(url).pathname} returned HTTP ${response.status}`)
    return response.json()
  }

  if ((await request(`${site}/health`)).status !== 'ok') throw Error('Backend is unhealthy; production deployment stopped')
  // Pin the tested SHA, even if main advances while this pipeline is running.
  await request(`${api}/applications/${application}`, { method: 'PATCH', admin: true, body: { git_commit_sha: commit } })
  // Do not retry this POST: a disconnected response may still have queued a deployment.
  const queued = await request(`${api}/deploy`, { method: 'POST', admin: true, body: { uuid: application, force: false } })
  const deployment = queued.deployments?.[0]?.deployment_uuid
  if (!/^[a-zA-Z0-9_-]+$/.test(deployment ?? '')) throw Error('Coolify did not return a deployment UUID')
  log(`Deploying tested commit ${commit}; Coolify deployment ${deployment}`)

  const deadline = now() + timeoutMs
  let lastStatus
  while (now() < deadline) {
    const result = await request(`${api}/deployments/${deployment}`, { admin: true })
    if (result.status !== lastStatus) { log(`Deployment status: ${result.status}`); lastStatus = result.status }
    if (result.status === 'failed' || result.status?.startsWith('cancelled')) throw Error(`Coolify deployment ${result.status}`)
    if (result.status === 'finished') {
      if (result.commit !== commit) throw Error('Coolify deployed a different commit than the tested commit')
      const release = await request(`${site}/frontend-release.json`)
      if (release.commit !== commit) throw Error('Public frontend commit does not match the tested commit')
      log(`Production verified: ${site}/ serves commit ${commit}`)
      return { deployment, commit }
    }
    await sleep(5000)
  }
  throw Error('Timed out waiting for the production frontend deployment')
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  deployProduction().catch(error => { console.error(error.message); process.exitCode = 1 })
}
