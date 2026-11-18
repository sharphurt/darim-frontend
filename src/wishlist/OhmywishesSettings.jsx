import { useEffect, useState } from 'react'

const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' })

function syncMessage(status) {
  const enabled = status.webApiConnected ? status.webApiEnabled : status.enabled
  if (!enabled && (status.connected || status.reconnect)) return 'Синхронизация приостановлена.'
  if (status.reconnect) return 'Доступ к Ohmywishes потерян. Подключитесь снова.'
  if (status.stale) return 'Не удалось обновить список. Повторим попытку автоматически.'
  if (status.listId) return status.lastSuccess
    ? 'Новые желания появятся автоматически.'
    : 'Первое обновление скоро начнётся.'
}

export function OhmywishesSettings({ api, outcome, profilePending, onGiftsChanged }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState(outcome === 'failed'
    ? 'Не удалось подключить Ohmywishes. Попробуйте ещё раз.' : '')
  const [lists, setLists] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    api.ohmywishesStatus(controller.signal).then(result => {
      if (!controller.signal.aborted) setStatus(result)
    }).catch(() => {
      if (!controller.signal.aborted) setError('Не удалось проверить подключение к Ohmywishes.')
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [api, attempt])

  async function run(action) {
    setWorking(true)
    setError('')
    try {
      await action()
    } catch (failure) {
      setError(failure.message)
    } finally {
      setWorking(false)
    }
  }

  function reload() {
    setLoading(true)
    setAttempt(value => value + 1)
  }

  function changeConnection(action) {
    return run(async () => {
      await action()
      setLists(null)
      onGiftsChanged()
      reload()
    })
  }

  if (!loading && !error && !status?.enabled && !status?.connected && !status?.reconnect && !status?.webApiEnabled) return null

  const busy = working || profilePending || loading
  const sync = status && syncMessage(status)
  const showLink = status?.webApiEnabled && !status.connected && !status.reconnect
  const visibility = 'Новые желания будут видны всем вашим компаниям. Видимость можно изменить в карточке желания.'
  const telegram = window.Telegram?.WebApp

  return <section className="ohmywishes-settings" aria-labelledby="ohmywishes-heading" aria-busy={busy}>
    <h3 id="ohmywishes-heading">Ohmywishes</h3>
    {error && <p className="board-error" role="alert">{error}</p>}
    {loading ? <p role="status">Проверяем подключение…</p> : !status ?
      <button type="button" className="gift-action" disabled={busy} onClick={() => {
        setError('')
        reload()
      }}>Проверить снова</button> : <>
        {status.listTitle && <p>Список «{status.listTitle}»</p>}
        {status.lastSuccess && <p>Последнее обновление — {dateFormat.format(new Date(status.lastSuccess))}</p>}
        {sync && <p role="status">{sync}</p>}
        {status.enabled && !status.connected && <button type="button" className="gift-action" disabled={busy}
          onClick={() => {
            if (telegram?.initData) {
              const url = new URL('/', location.href)
              url.searchParams.set('ohmywishes', 'profile')
              telegram.openLink(url.href)
              return
            }
            run(async () => {
              const { url } = await api.connectOhmywishes()
              location.assign(url)
            })
          }}>{telegram?.initData ? 'Открыть «Дарим» в браузере'
            : status.reconnect ? 'Переподключить Ohmywishes' : 'Подключить Ohmywishes'}</button>}
        {showLink && <form onSubmit={event => {
          event.preventDefault()
          const url = new FormData(event.currentTarget).get('url').trim()
          changeConnection(() => api.connectOhmywishesByLink(url))
        }}>
          <p id="ohmywishes-link-help">Скопируйте ссылку через «Поделиться» в Ohmywishes.
            Список должен открываться без входа. {visibility}</p>
          <label>Ссылка на ваш список Ohmywishes
            <input name="url" type="url" maxLength={512} aria-describedby="ohmywishes-link-help" required disabled={busy} />
          </label>
          <button className="gift-action" disabled={busy}>Подключить по ссылке</button>
        </form>}
        {status.enabled && status.connected && !status.webApiConnected && (lists === null ?
          <button type="button" className="gift-action" disabled={busy}
            onClick={() => run(async () => setLists(await api.ohmywishesLists()))}>Выбрать список</button>
          : lists.length === 0 ? <p>В Ohmywishes пока нет доступных для импорта списков.</p>
          : <form onSubmit={event => {
            event.preventDefault()
            const listId = new FormData(event.currentTarget).get('listId')
            changeConnection(() => api.selectOhmywishesList(listId))
          }}>
            <p>{visibility}</p>
            <label>Список для импорта
              <select name="listId" defaultValue={status.listId ?? ''} required disabled={busy}>
                <option value="">Выберите список</option>
                {lists.map(list => <option key={list.id} value={list.id}>{list.title}</option>)}
              </select>
            </label>
            <button className="gift-action" disabled={busy}>Синхронизировать список</button>
          </form>)}
        {(status.connected || status.reconnect) && <button type="button" className="gift-action" disabled={busy}
          onClick={() => changeConnection(api.disconnectOhmywishes)}>Отключить Ohmywishes</button>}
      </>}
  </section>
}
