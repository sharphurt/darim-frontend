import { useEffect, useRef, useState } from 'react'
import { DialogClose } from './DialogClose.jsx'

const titles = { notices: 'Уведомления', shares: 'Ссылки на желания', requests: 'Мои гостевые заявки' }

export function AccountTools({ kind, api, companies, onClose }) {
  const ref = useRef(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const [issued, setIssued] = useState({})
  const notices = kind === 'notices'
  useEffect(() => {
    const element = ref.current
    element.showModal()
    return () => element.close()
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    const load = kind === 'notices'
      ? Promise.all([api.notices(controller.signal), api.interests(controller.signal)])
      : kind === 'shares' ? api.shareLinks(controller.signal) : api.guestRequests(controller.signal)
    load.then(async result => {
      if (controller.signal.aborted) return
      setData(result)
      if (kind === 'notices') await api.readNotices()
    }).catch(failure => { if (!controller.signal.aborted) setError(failure.message) })
    return () => controller.abort()
  }, [api, kind, revision])

  async function run(action) {
    if (busy) return
    setBusy(true); setError('')
    try { await action(); setRevision(value => value + 1) }
    catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }

  return <dialog ref={ref} className={`board-dialog${notices ? ' board-dialog--notices' : ''}`} aria-labelledby="account-tools-title"
    onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
    {notices && <header className="account-tools__header">
      <h2 id="account-tools-title">{titles[kind]}</h2>
      <DialogClose disabled={busy} onClose={onClose} />
    </header>}
    <div className="board-dialog__body account-tools">
      {!notices && <h2 id="account-tools-title">{titles[kind]}</h2>}
      {error && <p role="alert" className="board-error">{error}</p>}
      {!data && !error && <p role="status">Загружаем…</p>}
      {kind === 'shares' && <form onSubmit={event => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        run(async () => {
          const created = await api.createShare({ label: form.get('label') || null, companyId: form.get('companyId') || null })
          const url = new URL('/share', location.origin)
          url.hash = created.token
          setIssued(previous => ({ ...previous, [created.link.id]: url.href }))
        })
      }}>
        <label>Название ссылки<input name="label" maxLength="80" /></label>
        <label>Какие желания показать<select name="companyId"><option value="">Из всех компаний</option>
          {companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
        </select></label>
        <p>По ссылке видны желания, но не скрытые брони. Ссылку можно отозвать.</p>
        <button className="gift-action gift-action--primary" disabled={busy}>Создать ссылку</button>
      </form>}
      {data && kind === 'shares' && <ul className="account-tools__list">{data.map(link => <li key={link.id}>
        <strong>{link.label || 'Список желаний'}</strong>
        {link.revoked ? <p>Отозвана</p> : <>
          {issued[link.id] ? <label>Скопируйте ссылку<input readOnly value={issued[link.id]} onFocus={event => event.currentTarget.select()} /></label>
            : <p>Адрес показывается только при создании. Для нового адреса создайте ещё одну ссылку.</p>}
          <button type="button" className="gift-action" disabled={busy} onClick={() => run(() => api.revokeShare(link.id))}>Отозвать ссылку</button>
        </>}
      </li>)}</ul>}
      {data && kind === 'notices' && <>
        {!data[0].length && !data[1].length && <p>Уведомлений пока нет.</p>}
        <ul className="account-tools__list">{data[1].map(interest => <li key={interest.id}>
          <p>Гость хочет подарить «{interest.title}». {interest.telegramUsername || 'Контакт не указан.'}</p>
          <button className="gift-action" disabled={busy || interest.notified} onClick={() => run(() => api.notifyGuest(interest.id))}>
            {interest.notified ? 'Сообщение отправлено' : 'Сообщить, что подарок уже выбран'}
          </button>
        </li>)}{data[0].map(notice => <li key={notice.id}><p>{notice.text}</p>
          <time dateTime={notice.created}>{new Date(notice.created).toLocaleString('ru-RU')}</time>
        </li>)}</ul>
      </>}
      {data && kind === 'requests' && <>
        {!data.length && <p>Гостевых заявок пока нет.</p>}
        <ul className="account-tools__list">{data.map(request => <li key={request.id}>
          <p>{request.title} — {request.confirmed ? 'Бронь подтверждена' : 'Заявка ожидает решения'}</p>
          {request.confirmed ? <a href="/?tab=giving">Открыть в «Я дарю»</a> :
            <button className="gift-action" disabled={busy} onClick={() => run(() => api.withdrawRequest(request.id))}>Отменить заявку</button>}
        </li>)}</ul>
      </>}
      {error && <button className="gift-action" type="button" disabled={busy} onClick={() => { setError(''); setRevision(value => value + 1) }}>Повторить</button>}
      {!notices && <button className="gift-action" type="button" disabled={busy} onClick={onClose}>Закрыть</button>}
    </div>
  </dialog>
}
