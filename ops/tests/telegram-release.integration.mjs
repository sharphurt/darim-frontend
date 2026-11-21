// Run separately from browser/app tests: this suite requires Git and a POSIX shell.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const shell = process.env.TEST_SH || (process.platform === 'win32'
  ? resolve(execFileSync('git', ['--exec-path'], { encoding: 'utf8' }).trim(), '../../../bin/bash.exe')
  : 'sh')
const script = resolve('ops/telegram-ci.sh').replaceAll('\\', '/')

function fixture() {
  const cwd = mkdtempSync(join(tmpdir(), 'frontend-notes-'))
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
  git('init', '-q')
  git('config', 'user.name', 'Fixture')
  git('config', 'user.email', 'fixture@example.invalid')
  const commit = title => { git('commit', '--allow-empty', '-qm', title); return git('rev-parse', 'HEAD') }
  const previous = commit('previous release')
  for (const title of ['first change', 'second change', 'third change', 'fourth change']) commit(title)
  const sha = git('rev-parse', 'HEAD')
  mkdirSync(join(cwd, 'bin'))
  // Replace only the delivery boundary: inspect the exact text/link passed to jq.
  writeFileSync(join(cwd, 'bin/jq'), '#!/bin/sh\nprintf "%s\\n" "$@"\n', { mode: 0o755 })
  writeFileSync(join(cwd, 'bin/curl'), '#!/bin/sh\ncat >/dev/null\nwhile [ "$#" -gt 0 ]; do\n if [ "$1" = --data-binary ]; then shift; printf "%s\\n" "$1" >> payload; fi\n shift\ndone\n', { mode: 0o755 })
  const run = value => {
    const sha = git('rev-parse', 'HEAD')
    if (value !== undefined) writeFileSync(join(cwd, '.previous-production'), value)
    execFileSync(shell, ['-c', 'export PATH="$PWD/bin:$PATH"; sh "$1" release', 'test', script], {
      cwd, env: { ...process.env, CI_PIPELINE_URL: 'https://ci.example/run', CI_COMMIT_SHA: sha,
        CI_REPO: 'example/frontend', TELEGRAM_BOT_TOKEN: 'fixture', TELEGRAM_LICKREAL_ID: '1', TELEGRAM_SHARPHURT_ID: '2' },
    })
    try { return readFileSync(join(cwd, 'payload'), 'utf8') } catch (error) { if (error.code === 'ENOENT') return ''; throw error }
  }
  return { run, previous, sha, git }
}

test('release includes only three new non-merge commits and a comparison link', () => {
  const f = fixture()
  f.git('checkout', '-qb', 'side', f.previous)
  f.git('commit', '--allow-empty', '-qm', 'side change')
  const side = f.git('rev-parse', 'HEAD')
  f.git('checkout', '--detach', f.sha)
  f.git('merge', '--no-ff', '-m', 'merge noise', side)
  const payload = f.run(f.previous)
  assert.ok(payload.includes(`compare/${f.previous}...${f.git('rev-parse', 'HEAD')}`))
  assert.ok(payload.includes('fourth change'))
  assert.ok(!payload.includes('merge noise'))
  assert.equal((payload.match(/• /g) || []).length, 6) // Three notes for each recipient.
  assert.ok(!payload.includes('first change'))
  assert.ok(!payload.includes('previous release'))
})

test('same deployed SHA sends nothing', () => {
  const f = fixture()
  assert.equal(f.run(f.sha), '')
})

for (const previous of [undefined, 'f'.repeat(40)]) {
  test(`unknown previous release (${previous ? 'missing object' : 'missing file'}) uses latest commit`, () => {
    const f = fixture()
    const payload = f.run(previous)
    assert.ok(payload.includes(`commit/${f.sha}`))
    assert.ok(payload.includes('fourth change'))
    assert.ok(!payload.includes('third change'))
  })
}
