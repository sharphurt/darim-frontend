import { useEffect, useState } from 'react'
import { createDarimApi } from '../api/darim.js'
import { usePrivateImage } from '../api/usePrivateImage.js'
import { CodeLogin } from './CodeLogin.jsx'
import { formatPrice, safeLink } from './giftPresentation.js'
import './board.css'

function shareToken() {
  const fragment = location.hash.slice(1)
  try {
    if (fragment) sessionStorage.setItem('darim.share-token', fragment)
    return fragment || sessionStorage.getItem('darim.share-token') || ''
  } catch { return fragment }
}

function PublicGift({ gift, token, request, pending, signedIn, onRequest, onWithdraw }) {
  const photo = usePrivateImage(gift.photoVersion
    ? `/api/public/wishlist/gifts/${gift.id}/photo/${gift.photoVersion}` : safeLink(gift.photoUrl), token)
  const shop = safeLink(gift.details.url)
  return <li className="public-wishlist__gift">
    {photo && <img src={photo} alt="" loading="lazy" referrerPolicy="no-referrer" />}
    <h2>{gift.details.title}</h2>
    <p>{formatPrice(gift.details.price)}</p>
    {gift.details.comment && <p>{gift.details.comment}</p>}
    {shop && <a href={shop} target="_blank" rel="noopener noreferrer">Где купить</a>}
    {request ? <>
      <p>{request.confirmed ? 'Бронь подтверждена' : 'Заявка ожидает решения'}</p>
      {request.confirmed ? <a href="/?tab=giving">Открыть в «Я дарю»</a> :
        <button className="gift-action" disabled={pending} onClick={() => onWithdraw(request.id)}>Отменить заявку</button>}
    </> : gift.guestReservationEnabled !== false && signedIn && <form onSubmit={event => {
      event.preventDefault()
      onRequest(gift.id, new FormData(event.currentTarget).has('shareUsername'))
    }}>
      <p>Доступность подарка скрыта. Заявку можно отменить, пока она не подтверждена.</p>
      <label><input type="checkbox" name="shareUsername" /> Разрешаю показать мой Telegram-ник тому, кто уже дарит этот подарок, если он занят.</label>
      <button className="gift-action gift-action--primary" disabled={pending}>Хочу подарить</button>
    </form>}
  </li>
}

export function PublicWishlist() {
  const [api] = useState(createDarimApi)
  const [token] = useState(shareToken)
  const [state, setState] = useState(null)
  const [error, setError] = useState(() => /^[A-Za-z0-9_-]{1,128}$/.test(token) ? '' : 'Список недоступен. Попросите владельца прислать новую ссылку.')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(token)) {
      return
    }
    api.ready().then(async () => {
      const [wishlist, info, me] = await Promise.all([
        api.publicWishlist(token, signal), api.authInfo(signal),
        api.me(signal).catch(failure => { if (failure.status === 401) return null; throw failure }),
      ])
      const requests = me ? await api.guestRequests(signal) : []
      if (!signal.aborted) setState({ wishlist, info, me, requests })
    }).catch(failure => { if (!signal.aborted) setError(failure.status === 404 ? 'Список недоступен. Попросите владельца прислать новую ссылку.' : failure.message) })
    return () => controller.abort()
  }, [api, token, revision])

  async function run(action, success) {
    if (pending) return
    setPending(true); setError(''); setMessage('')
    try { await action(); setMessage(success); setRevision(value => value + 1) }
    catch (failure) { setError(failure.message) }
    finally { setPending(false) }
  }

  return <main className="public-wishlist page-inset">
    <a href="/">Дарим</a>
    {error && <p role="alert" className="board-error">{error}</p>}
    {!state && !error && <p role="status">Открываем список…</p>}
    {error && <button className="gift-action" onClick={() => { setError(''); setRevision(value => value + 1) }}>Повторить</button>}
    {message && <p role="status">{message}</p>}
    {state && <>
      <h1>Желания · {state.wishlist.ownerName}</h1>
      {!state.me && <section>
        <p>Войдите, чтобы отправить заявку на подарок.</p>
        {state.info.telegramConfigured && <a className="pill" href="/auth/login?returnTo=share">Войти через Telegram</a>}
        {state.info.codeLoginEnabled && <CodeLogin pending={pending} botUsername={state.info.botUsername}
          onLogin={code => run(() => api.codeLogin(code), 'Вы вошли. Теперь можно выбрать подарок.')} />}
      </section>}
      {!state.wishlist.gifts.length && <p>Здесь пока нет желаний.</p>}
      <ul className="public-wishlist__gifts">{state.wishlist.gifts.map(gift => <PublicGift key={gift.id} gift={gift} token={token}
        request={state.requests.find(request => request.giftId === gift.id)} pending={pending} signedIn={Boolean(state.me)}
        onRequest={(id, shareUsername) => run(() => api.requestGift(id, token, shareUsername), 'Запрос принят. Подарок мог быть уже занят.')}
        onWithdraw={id => run(() => api.withdrawRequest(id), 'Заявка отменена.')} />)}</ul>
    </>}
  </main>
}
