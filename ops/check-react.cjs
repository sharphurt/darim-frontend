// Optional browser checks: NODE_PATH points to an installed Playwright package.
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const base = process.env.DARIM_FRONTEND_URL || 'http://127.0.0.1:5178'
const me = { id: '11111111-1111-1111-1111-111111111111', name: 'Алиса', contact: '@alice' }
const bob = { id: '22222222-2222-2222-2222-222222222222', name: 'Боб', contact: '@bob' }
const owner = { id: '33333333-3333-3333-3333-333333333333', name: 'Юлия' }
const company = { id: '44444444-4444-4444-4444-444444444444', name: 'Друзья', isOrganizer: true, members: [me, bob, owner] }
const gift = { id: '55555555-5555-5555-5555-555555555555', owner, details: { title: 'Кофемолка', price: 12000 },
  participation: { mode: 'split', open: true, bought: false, slots: 2, taken: 2, isMine: true, isCoordinator: true,
    participants: [me, bob], coordinatorId: me.id } }

async function fixture(browser, mini = false) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  page.setDefaultTimeout(12000)
  const calls = [], errors = []
  const current = structuredClone(gift)
  if (mini) current.photoVersion = '66666666-6666-6666-6666-666666666666'
  page.on('pageerror', error => errors.push(error.message))
  await context.route('https://telegram.org/**', route => route.fulfill({ contentType: 'application/javascript', body: '' }))
  if (mini) await page.addInitScript(() => {
    window.Telegram = { WebApp: { initData: 'signed-launch-fixture', initDataUnsafe: { start_param: 'join_fixture' },
      ready() {}, expand() {}, onEvent() {}, offEvent() {}, safeAreaInset: { top: 20 }, contentSafeAreaInset: { top: 10 },
      BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} } } }
  })
  await context.route(url => /^\/(api|auth)\//.test(url.pathname), async route => {
    const request = route.request(), path = new URL(request.url()).pathname
    calls.push({ path, headers: request.headers(), method: request.method(), body: request.postDataJSON() })
    if (path.includes('/photo/')) return route.fulfill({ contentType: 'image/png',
      body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64') })
    let result
    if (path === '/auth/mini') result = { token: 'fixture-mini-token' }
    else if (path === '/api/auth-info') result = { telegramConfigured: false, demoEnabled: false, codeLoginEnabled: true }
    else if (path === '/api/me') result = { user: me, company, companies: [company] }
    else if (path === '/api/csrf') result = { token: 'csrf-fixture' }
    else if (path === '/api/card-artwork') result = { images: [], canManage: false }
    else if (path === '/api/gifts') result = [current]
    else if (path === '/api/gifts/mine' || path === '/api/gifts/giving') result = []
    else if (path.endsWith('/actions')) {
      const { action } = request.postDataJSON()
      if (action === 'close-split') current.participation.open = false
      if (action === 'buy') current.participation.bought = true
      if (action === 'leave') {
        current.participation.participants = [bob]
        current.participation.taken = 1
        current.participation.isMine = false
        current.participation.isCoordinator = false
        current.participation.coordinatorId = bob.id
      }
      result = current
    } else if (path === '/api/notices') result = Array.from({ length: 24 }, (_, index) => ({
      id: `notice-${index}`, text: index ? `Уведомление ${index}` : 'Координатор распила изменён',
      created: '2026-11-15T00:00:00Z', read: false,
    }))
    else if (path === '/api/wishlist-interest' || path === '/api/wishlist-requests') result = []
    else if (path === '/api/public/wishlist') result = { ownerName: owner.name, gifts: [{ ...current, guestReservationEnabled: true }] }
    else if (path.endsWith('/request') || path === '/api/notices/read') result = null
    else return route.fulfill({ status: 404, json: { title: `Unexpected fixture path: ${path}` } })
    await route.fulfill({ status: result === null ? 204 : 200, ...(result === null ? {} : { json: result }) })
  })
  return { context, page, calls, errors }
}

async function menu(page, label) {
  await page.getByRole('button', { name: 'Меню', exact: true }).click()
  await page.getByRole('button', { name: label, exact: true }).click()
}

async function main() {
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : { channel: 'msedge' }) })
  try {
    const { page, context, calls, errors } = await fixture(browser)
    await page.goto(base)
    await page.getByRole('button', { name: 'Меню', exact: true }).waitFor()
    await menu(page, 'Уведомления')
    await page.getByText('Координатор распила изменён', { exact: true }).waitFor()
    const closeNotices = page.getByRole('dialog', { name: 'Уведомления' }).getByRole('button', { name: 'Закрыть', exact: true })
    const closeBeforeScroll = await closeNotices.boundingBox()
    await page.getByText('Уведомление 23', { exact: true }).scrollIntoViewIfNeeded()
    assert.deepEqual(await closeNotices.boundingBox(), closeBeforeScroll, 'Close must stay in place when notifications scroll')
    await closeNotices.click()
    await page.setViewportSize({ width: 1188, height: 900 })
    const menuToggle = page.getByRole('button', { name: 'Меню', exact: true })
    await menuToggle.click()
    const notices = page.getByRole('button', { name: 'Уведомления', exact: true })
    assert.equal(await notices.count(), 1)
    assert.equal(await notices.locator('svg').count(), 1)
    const noticesRect = await notices.boundingBox()
    const menuRect = await menuToggle.boundingBox()
    assert.ok(noticesRect.x + noticesRect.width <= menuRect.x, 'Notifications must be left of the desktop menu')
    await notices.click()
    await page.getByText('Координатор распила изменён', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Закрыть', exact: true }).click()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Меню', exact: true }).click()
    const menuPanel = page.locator('#board-menu-panel')
    await menuPanel.getByRole('button', { name: 'Мой профиль', exact: true }).waitFor()
    for (const name of ['Создать компанию', 'Вступить по приглашению', 'Ссылки на желания', 'Гостевые заявки']) {
      assert.equal(await menuPanel.getByRole('button', { name, exact: true }).count(), 0, `${name} must be hidden in the MVP`)
    }
    await menuPanel.getByRole('button', { name: 'Таблица', exact: true }).click()
    await page.getByRole('button', { name: /Кофемолка/ }).click()
    await page.getByRole('button', { name: 'Участники и детали', exact: true }).click()
    await page.getByRole('button', { name: 'Завершить сбор', exact: true }).click()
    assert.ok(!calls.some(call => call.body?.action === 'close-split'), 'Opening confirmation must not perform the action')
    await page.getByRole('button', { name: 'Подтвердить', exact: true }).click()
    await page.getByRole('button', { name: 'Меню', exact: true }).waitFor()
    assert.ok(calls.some(call => call.body?.action === 'close-split'))
    await page.goto(`${base}/share#public-fixture-token`)
    await page.getByRole('heading', { name: `Желания · ${owner.name}` }).waitFor()
    await page.getByRole('button', { name: 'Хочу подарить', exact: true }).click()
    await page.getByText('Запрос принят. Подарок мог быть уже занят.', { exact: true }).waitFor()
    const publicCall = calls.find(call => call.path === '/api/public/wishlist')
    assert.equal(publicCall.headers.authorization, 'Wishlist public-fixture-token')
    assert.ok(calls.some(call => call.path.endsWith('/request') && call.body.token === 'public-fixture-token'))
    assert.deepEqual(errors, [])
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: process.env.DARIM_SCREENSHOT || 'react-transition-mobile.png', fullPage: true })
    await context.close()
    const mini = await fixture(browser, true)
    await mini.page.goto(base)
    await mini.page.getByText('У вас есть приглашение в компанию.', { exact: true }).waitFor()
    await mini.page.getByRole('button', { name: 'Меню', exact: true }).waitFor()
    await mini.page.locator('img.gift-card__photo[src^="blob:"]').waitFor()
    assert.equal(mini.calls.filter(call => call.path === '/auth/mini').length, 1)
    assert.equal(mini.calls.find(call => call.path === '/api/me').headers.authorization, 'Bearer fixture-mini-token')
    assert.equal(mini.calls.find(call => call.path.includes('/photo/')).headers.authorization, 'Bearer fixture-mini-token')
    assert.equal(await mini.page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--darim-safe-top')), '30px')
    assert.ok(!(await mini.page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).includes('fixture-mini-token'))
    assert.deepEqual(mini.errors, [])
    await mini.context.close()
    console.log('PASS: mobile dialogs, notices, MVP menu, split closure, public requests, Mini App session and safe area')
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
